"""
mcPHASES — Script 4: Phase-Specific Models
============================================
Trains one model per phase × per target, with:
  - Data cleaning: status=READY, calculation_failed=False, daily averaging
  - Phase label fix: fertility is renamed to ovulation
  - Boundary day downweighting (0.5 weight for ±2 transition days)
  - SMOTE oversampling for minority phases
  - Hyperparameter search (RF, XGB, LGBM) per phase
  - Ridge/Lasso with default params (no tuning)
  - ±2 day tolerance evaluation metric
  - Comparison: phase-specific vs global model

Prerequisites:
  - All raw CSVs in DATA_DIR

Targets:
  - stress_score
  - rmssd_mean   (HRV)
  - overall_score (sleep score)
"""

# ─────────────────────────────────────────────
# 0. IMPORTS & CONFIG
# ─────────────────────────────────────────────
import os, warnings, math, json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import seaborn as sns

from sklearn.impute           import SimpleImputer
from sklearn.preprocessing   import StandardScaler

warnings.filterwarnings("ignore")
sns.set_theme(style="whitegrid", palette="muted")
plt.rcParams["figure.dpi"] = 130

DATA_DIR     = "./data"
OUT_DIR      = "./eda_outputs/script4_phase_models"
os.makedirs(OUT_DIR, exist_ok=True)

RANDOM_STATE = 42
np.random.seed(RANDOM_STATE)

PHASE_ORDER  = ["menstrual", "follicular", "ovulation", "luteal"]
PHASE_COLORS = {"menstrual": "#e07b7b", "follicular": "#7bafd4",
                "ovulation": "#f5c06a", "luteal":     "#a8c5da",
                "unlabeled": "#d0d0d0"}

# Targets are now handled by recalibration_scores.py and alignment_bin_models.py

def savefig(name):
    plt.tight_layout()
    plt.savefig(os.path.join(OUT_DIR, name), bbox_inches="tight")
    plt.show()

def load(fname, base=None):
    base = base or DATA_DIR
    return pd.read_csv(os.path.join(base, fname))

def metrics_dict(y_true, y_pred):
    mask = ~(np.isnan(y_true) | np.isnan(y_pred))
    if mask.sum() < 3:
        return {"MAE": np.nan, "RMSE": np.nan, "R2": np.nan}
    yt, yp = y_true[mask], y_pred[mask]
    return {
        "MAE" : mean_absolute_error(yt, yp),
        "RMSE": np.sqrt(mean_squared_error(yt, yp)),
        "R2"  : r2_score(yt, yp),
        "n"   : int(mask.sum()),
    }

JOIN_KEYS = ["id", "day_in_study", "study_interval"]

def daily_agg(df, agg_dict):
    cols = JOIN_KEYS + list(agg_dict.keys())
    df   = df[[c for c in cols if c in df.columns]].copy()
    out  = df.groupby(JOIN_KEYS).agg(agg_dict).reset_index()
    out.columns = ["_".join(c).strip("_") if isinstance(c, tuple) else c
                   for c in out.columns]
    return out


# ─────────────────────────────────────────────
# 1. LOAD & BUILD MASTER
# ─────────────────────────────────────────────
print("Building master DataFrame …")

# ── Deduplicate hormones table (collapse repeated rows per day) ───────────────
hormones = load("hormones_and_selfreport.csv")
# The self-report file has multiple rows per (id, day_in_study, study_interval).
# For numeric columns: take the mean. For non-numeric: take the first value.
LIKERT_MAP = {
    "Not at all": 0, "Very Low/Little": 1, "Low": 2,
    "Moderate": 3, "High": 4, "Very High": 5,
}
# Convert all Likert symptom columns to numeric before aggregating
SYMPTOM_COLS = ["headaches", "cramps", "sorebreasts", "fatigue", "bloating",
                "moodswing", "stress", "sleepissue",
                "foodcravings", "appetite", "indigestion"]
for col in SYMPTOM_COLS:
    if col in hormones.columns:
        hormones[col] = hormones[col].replace(LIKERT_MAP)
        hormones[col] = pd.to_numeric(hormones[col], errors="coerce")

# Now deduplicate: group by day and average the numeric columns
_num_cols = hormones.select_dtypes(include="number").columns.tolist()
_num_cols = [c for c in _num_cols if c not in JOIN_KEYS]
_cat_cols = [c for c in hormones.columns if c not in _num_cols and c not in JOIN_KEYS]

_num_agg = hormones.groupby(JOIN_KEYS)[_num_cols].mean()
_cat_agg = hormones.groupby(JOIN_KEYS)[_cat_cols].first()
hormones = _num_agg.join(_cat_agg).reset_index()
print(f"  ✓ Hormones deduplicated: {len(hormones)} unique day-rows")

# ── Phase labels: rename fertility → ovulation ────────────────────────────────
hormones["phase_raw"] = hormones["phase"].copy() if "phase" in hormones.columns else np.nan
if "phase" in hormones.columns:
    hormones["phase"] = (hormones["phase"].astype(str)
                                           .str.strip().str.lower()
                                           .replace("fertility", "ovulation")
                                           .replace("nan", np.nan))
hormones["is_labeled"] = hormones["phase"].isin(PHASE_ORDER)
hormones = hormones[hormones["phase"].isin(PHASE_ORDER)]
print(f"  ✓ Phase labels: fertility renamed to ovulation")
print(f"  Phase counts:\n{hormones['phase'].value_counts().to_string()}")

# ── Load raw wearable tables ─────────────────────────────────────────────────
stress      = load("stress_score.csv")
sleep_sc    = load("sleep_score.csv")
resting_hr  = load("resting_heart_rate.csv")
active_min  = load("active_minutes.csv")
calories    = load("calories.csv")
distance    = load("distance.csv")
steps_df    = load("steps.csv")
glucose_df  = load("glucose.csv")
hrv_df      = load("heart_rate_variability_details.csv")
wrist_temp  = load("wrist_temperature.csv")
comp_temp   = load("computed_temperature.csv")
resp_rate   = load("respiratory_rate_summary.csv")
vo2_df      = load("demographic_vo2_max.csv")
subjects    = load("subject-info.csv")
hw          = load("height_and_weight.csv")

# ── Clean stress: filter READY + not failed ──────────────────────────────────
stress = stress[
    (stress["status"] == "READY") &
    (stress["calculation_failed"].astype(str).str.upper() != "TRUE")
]
print(f"  ✓ Stress cleaned: {len(stress)} READY rows")

# ── Daily aggregate all wearable tables (collapse duplicate timestamps) ──────
daily_stress = daily_agg(stress, {
    "stress_score": "mean", "sleep_points": "mean",
    "responsiveness_points": "mean", "exertion_points": "mean"
})
daily_sleep = daily_agg(sleep_sc, {
    "overall_score": "mean", "deep_sleep_in_minutes": "mean",
    "restlessness": "mean", "composition_score": "mean",
    "revitalization_score": "mean", "duration_score": "mean"
})
resting_hr = resting_hr.rename(columns={"value": "resting_hr"})
daily_rhr = daily_agg(resting_hr, {"resting_hr": "mean"})

daily_active  = daily_agg(active_min,
                           {"sedentary":"mean","lightly":"mean",
                            "moderately":"mean","very":"mean"})
daily_cal     = daily_agg(calories,  {"calories":"sum"})
daily_dist    = daily_agg(distance,  {"distance":"sum"})
daily_steps   = daily_agg(steps_df,  {"steps":"sum"})
daily_glucose = daily_agg(glucose_df, {"glucose_value":["mean","std","min","max"]})
daily_hrv     = daily_agg(hrv_df,    {"rmssd":["mean","std"],
                                       "low_frequency":"mean",
                                       "high_frequency":"mean"})
daily_wtemp   = daily_agg(wrist_temp, {"temperature_diff_from_baseline":"mean"})

ct_cols = ["id","study_interval","sleep_start_day_in_study",
           "nightly_temperature",
           "baseline_relative_nightly_standard_deviation"]
comp_temp_d = (comp_temp[[c for c in ct_cols if c in comp_temp.columns]]
               .rename(columns={"sleep_start_day_in_study":"day_in_study"}))

resp_cols = JOIN_KEYS + ["full_sleep_breathing_rate",
                          "deep_sleep_breathing_rate",
                          "rem_sleep_breathing_rate"]
resp_d = resp_rate[[c for c in resp_cols if c in resp_rate.columns]]

vo2_cols = JOIN_KEYS + ["demographic_vo2_max","filtered_demographic_vo2_max"]
vo2_d    = vo2_df[[c for c in vo2_cols if c in vo2_df.columns]]

hw_slim  = hw[["id","height_2022","weight_2022"]].copy()
hw_slim["bmi"] = hw_slim["weight_2022"] / (hw_slim["height_2022"]/100)**2
subj_slim = subjects[["id","birth_year","age_of_first_menarche"]].copy()
subj_slim["age"] = 2022 - subj_slim["birth_year"]

master = (
    hormones
    .merge(daily_stress,  on=JOIN_KEYS, how="left")
    .merge(daily_sleep,   on=JOIN_KEYS, how="left")
    .merge(daily_rhr,     on=JOIN_KEYS, how="left")
    .merge(daily_active,  on=JOIN_KEYS, how="left")
    .merge(daily_cal,     on=JOIN_KEYS, how="left")
    .merge(daily_dist,    on=JOIN_KEYS, how="left")
    .merge(daily_steps,   on=JOIN_KEYS, how="left")
    .merge(daily_glucose, on=JOIN_KEYS, how="left")
    .merge(daily_hrv,     on=JOIN_KEYS, how="left")
    .merge(daily_wtemp,   on=JOIN_KEYS, how="left")
    .merge(comp_temp_d,   on=JOIN_KEYS, how="left")
    .merge(resp_d,        on=JOIN_KEYS, how="left")
    .merge(vo2_d,         on=JOIN_KEYS, how="left")
    .merge(hw_slim,       on="id",      how="left")
    .merge(subj_slim,     on="id",      how="left")
)
print(f"Master shape: {master.shape}")


# ─────────────────────────────────────────────
# 1b. PHASE DIAGNOSTICS (from script 4a)
# ─────────────────────────────────────────────
print("\n" + "="*60)
print("1b. PHASE DIAGNOSTICS")
print("="*60)

# Count labeled days per phase per participant
phase_counts = (
    master.groupby(["id", "phase"])
    .size()
    .unstack(fill_value=0)
    .reindex(columns=PHASE_ORDER, fill_value=0)
)
print("\nDays per phase per participant:")
print(phase_counts.to_string())
print(f"\nPhase totals across all participants:")
print(phase_counts.sum())

# Heatmap
fig, ax = plt.subplots(figsize=(8, max(6, len(phase_counts) * 0.35)))
sns.heatmap(phase_counts, ax=ax, cmap="YlGnBu",
            annot=True, fmt="d", linewidths=0.4,
            cbar_kws={"label": "Days labeled"})
ax.set_title("Labeled days per phase per participant", fontsize=11)
ax.set_xlabel("Phase")
ax.set_ylabel("Participant ID")
savefig("1b_phase_days_heatmap.png")

# Flag participants with < 5 days in any phase
MIN_DAYS = 5
for phase in PHASE_ORDER:
    sparse = phase_counts[phase_counts[phase] < MIN_DAYS]
    if not sparse.empty:
        print(f"\n⚠️  [{phase}] participants with < {MIN_DAYS} days: "
              f"{list(sparse.index)}")


# ─────────────────────────────────────────────
# 2. PARTICIPANT SPLIT
# ─────────────────────────────────────────────
all_ids = master[master["study_interval"] == 2022]["id"].unique()
all_ids = np.random.RandomState(RANDOM_STATE).permutation(all_ids)

n = len(all_ids)
assert n >= 42, f"Need ≥42 participants, found {n}"

train_ids = all_ids[:30]
val_ids   = all_ids[30:36]
test_ids  = all_ids[36:42]

def split_df(df, ids):
    return df[df["id"].isin(ids) & (df["study_interval"] == 2022)].copy()

train_df = split_df(master, train_ids)
val_df   = split_df(master, val_ids)
test_df  = split_df(master, test_ids)

print(f"\nSplit: train={len(train_df)}, val={len(val_df)}, test={len(test_df)}")


# ─────────────────────────────────────────────
# 3. FEATURE ENGINEERING
# ─────────────────────────────────────────────

# Within-person centering (fit on train only)
CENTER_COLS = [c for c in [
    "resting_hr","calories","steps","distance",
    "sedentary","lightly","moderately","very",
    "glucose_value_mean","glucose_value_std",
    "temperature_diff_from_baseline","nightly_temperature",
    "full_sleep_breathing_rate","demographic_vo2_max",
    "lh","estrogen","pdg",
] if c in master.columns]

person_means = (train_df.groupby("id")[CENTER_COLS]
                         .mean().add_suffix("_pmean"))

def center_by_person(df, pm):
    df = df.merge(pm.reset_index(), on="id", how="left")
    for col in CENTER_COLS:
        if col in df.columns:
            df[f"{col}_c"] = df[col] - df.get(f"{col}_pmean", 0)
    df = df.drop(columns=[c for c in df.columns if c.endswith("_pmean")],
                 errors="ignore")
    return df

train_df = center_by_person(train_df, person_means)
val_df   = center_by_person(val_df,   person_means)
test_df  = center_by_person(test_df,  person_means)

# Symptom composites
SOMATIC_COLS = [c for c in ["headaches","cramps","sorebreasts","fatigue","bloating"]
                if c in master.columns]
MOOD_COLS    = [c for c in ["moodswing","stress","sleepissue"] if c in master.columns]
CRAVING_COLS = [c for c in ["foodcravings","appetite","indigestion"] if c in master.columns]
for df in [train_df, val_df, test_df]:
    df["somatic_score"] = df[SOMATIC_COLS].mean(axis=1) if SOMATIC_COLS else np.nan
    df["mood_score"]    = df[MOOD_COLS].mean(axis=1)    if MOOD_COLS    else np.nan
    df["craving_score"] = df[CRAVING_COLS].mean(axis=1) if CRAVING_COLS else np.nan

# Feature pool (centered + static + hormones + composites)
CENTERED_FEATS   = [c for c in train_df.columns if c.endswith("_c")]
STATIC_FEATS     = [c for c in ["age","bmi","age_of_first_menarche"]
                    if c in train_df.columns]
HORMONE_FEATS    = [c for c in ["lh","estrogen","pdg"] if c in train_df.columns]
COMPOSITE_FEATS  = ["somatic_score","mood_score","craving_score"]
HRV_FEATS        = [c for c in ["rmssd_mean","rmssd_std","low_frequency_mean",
                                  "high_frequency_mean"] if c in train_df.columns]

ALL_FEATURES = list(set(
    CENTERED_FEATS + STATIC_FEATS + HORMONE_FEATS +
    COMPOSITE_FEATS + HRV_FEATS
))
ALL_FEATURES = [f for f in ALL_FEATURES if f in train_df.columns]
print(f"\nFeature pool: {len(ALL_FEATURES)} features")


# ─────────────────────────────────────────────
# 4. RECALIBRATION PIPELINE
# ─────────────────────────────────────────────
print("\n" + "="*60)
print("4. RECALIBRATION PIPELINE")
print("="*60)

from recalibration_scores import run_recalibration_pipeline

adjusted_df, stress_artifacts = run_recalibration_pipeline(
    master, score_col="stress_score",
    train_df=train_df, val_df=val_df, self_report_col="stress"
)

print(f"\nTotal instances: {len(adjusted_df)}")
print(f"Instances with stress_score: {adjusted_df['stress_score'].notna().sum()}")
print(f"GB gap model val R²: {stress_artifacts.gb_val_r2:.3f}")

print("\n── Stress: Raw vs Adjusted Score Distributions ──")
print("Raw stress_score:")
print(adjusted_df["stress_score"].describe().to_string())
print("\nAdjusted score (GB-recalibrated):")
print(adjusted_df["adjusted_score"].describe().to_string())

print("\n── Legacy Phase Offsets (diagnostic only) ──")
print(stress_artifacts.phase_offset.to_string())

print("\n── Cluster Profiles ──")
avail_cols = [c for c in ["stress_score", "overall_score", "resting_hr"] if c in adjusted_df.columns]
print(adjusted_df.groupby("state_cluster")[avail_cols].mean().to_string())

# Cluster centroid feature interpretation
raw_centroids_scaled = stress_artifacts.pca.inverse_transform(stress_artifacts.kmeans.cluster_centers_)
features = stress_artifacts.cluster_features
print("\n── Dominant Features per Cluster ──")
for i, centroid in enumerate(raw_centroids_scaled):
    feat_importances = sorted(zip(features, centroid), key=lambda x: abs(x[1]), reverse=True)
    top = feat_importances[:3]
    desc = ", ".join(f"{f}: {abs(v):.2f} {'HIGH' if v > 0 else 'LOW'}" for f, v in top)
    print(f"  Cluster {i}: {desc}")

# Correlation diagnostic: does the adjusted score track self-report better?
from scipy.stats import pearsonr
sub = adjusted_df[["stress", "stress_score", "adjusted_score"]].dropna()
if len(sub) > 10:
    r_raw, _ = pearsonr(sub["stress"], sub["stress_score"])
    r_adj, _ = pearsonr(sub["stress"], sub["adjusted_score"])
    print(f"\n── Pearson r (self-report vs score) ──")
    print(f"  Raw wearable:  r = {r_raw:.4f}")
    print(f"  GB-adjusted:   r = {r_adj:.4f}")
    print(f"  Δr:            {r_adj - r_raw:+.4f}")


# ── 4b. Sleep score recalibration ────────────────────────────────────────────
print("\n" + "-"*60)
print("4b. SLEEP SCORE RECALIBRATION")
print("-"*60)

sleep_adjusted_df, sleep_artifacts = run_recalibration_pipeline(
    master, score_col="overall_score",
    train_df=train_df, val_df=val_df, self_report_col="stress"
)

print(f"\nGB gap model val R²: {sleep_artifacts.gb_val_r2:.3f}")
print("\n── Sleep: Raw vs Adjusted Score Distributions ──")
print("Raw overall_score:")
print(sleep_adjusted_df["overall_score"].describe().to_string())
print("\nAdjusted score (GB-recalibrated):")
print(sleep_adjusted_df["adjusted_score"].describe().to_string())

print("\n── Legacy Sleep Phase Offsets (diagnostic only) ──")
print(sleep_artifacts.phase_offset.to_string())


# ─────────────────────────────────────────────
# 5. ALIGNMENT-BIN EXPERIMENT
# ─────────────────────────────────────────────
print("\n" + "="*60)
print("5. ALIGNMENT-BIN EXPERIMENT")
print("="*60)

# The self-report "stress" column may still be Likert text in the split DataFrames.
# alignment_bin_models.build_alignment_label handles this internally, but we
# also want to make sure the feature pool sees numeric values.
for df in [train_df, val_df, test_df]:
    if "stress" in df.columns:
        df["stress"] = df["stress"].replace(LIKERT_MAP)
        df["stress"] = pd.to_numeric(df["stress"], errors="coerce")

from alignment_bin_models import run_alignment_bin_experiment

results = run_alignment_bin_experiment(train_df, val_df, test_df)

print(f"\nSelf-report column used: {results['self_report_col']}")
print("\n── Pearson Diagnostics ──")
for split_name, diag in results["pearson"].items():
    r = diag.get("global_pearson_r", float("nan"))
    print(f"  {split_name}: global r = {r:.4f}")

print("\n── Model Comparison ──")
print(results["results_table"].to_string(index=False))

print("\n── Best Model Details ──")
best = results["results_table"].iloc[0]
print(f"  Best: {best['model']} (wearable_score={'included' if best['include_wearable_score'] else 'excluded'})")
print(f"  Accuracy: {best['accuracy']:.3f}  |  Macro F1: {best['macro_f1']:.3f}")

# Detailed report for best
for r in results["detailed_results"]:
    if r.name == best["model"] and r.include_wearable_score == best["include_wearable_score"]:
        print(f"\n{r.report}")
        break


# ─────────────────────────────────────────────
# 6. PERCEPTION–PHYSIOLOGY GAP ANALYSIS
# ─────────────────────────────────────────────
print("\n" + "="*60)
print("6. PERCEPTION–PHYSIOLOGY GAP ANALYSIS")
print("="*60)

from perception_gap import run_gap_analysis

gap_results = run_gap_analysis(
    master, train_df, val_df, test_df,
    out_dir=OUT_DIR,
    self_report_col="stress",
    wearable_col="stress_score",
)

# Summary
print("\n── Gap Analysis Summary ──")
dr = gap_results.distance
print(f"  Best gap model: {dr.best_model_name} "
      f"(R²={dr.model_results[dr.best_model_name]['R2']:.3f})"
      if dr.model_results else "  No models fitted")
print(f"  Phase ANOVA: F={dr.anova_f:.3f}, p={dr.anova_p:.4f}")
print(f"  ICC (trait proportion): {dr.trait_state['icc']:.3f}")
print(f"  Perception subtypes discovered: {gap_results.space.n_subtypes}")

# ─────────────────────────────────────────────
# 7. GB MODEL INTERPRETABILITY & SURROGATE RULES
# ─────────────────────────────────────────────
print("\n" + "="*60)
print("7. GB MODEL INTERPRETABILITY (SHAP & Surrogate Rules)")
print("="*60)

from interpret_gb import execute_gb_interpretability

print("Running GB structural interpretability on the stress recalibration model...")
interp_results = execute_gb_interpretability(
    gb_model=stress_artifacts.gb_model,
    gb_imputer=stress_artifacts.gb_imputer,
    gb_scaler=stress_artifacts.gb_scaler,
    train_df=train_df,
    val_df=val_df,
    feature_names=stress_artifacts.gb_features,
    out_dir=OUT_DIR
)
print("\n✓ GB Interpretability complete. Output saved to:", os.path.abspath(OUT_DIR))
print("\n── Top 5 Features (Permutation Importance) ──")
print(interp_results["permutation_importance"].head(5).to_string(index=False))

print(f"\n✓ Script 4 complete. Results in: {os.path.abspath(OUT_DIR)}")


# ═══════════════════════════════════════════════════════════════════════════════
# COMMENTED OUT: Phase-specific regression models (no longer needed)
# The code below trained Ridge/Lasso/RF/XGB/LGBM per phase for stress_score,
# rmssd_mean, and overall_score. Replaced by recalibration + alignment-bin.
# ═══════════════════════════════════════════════════════════════════════════════
#
# # 4. BOUNDARY DAY WEIGHTING
# # 5. PHASE-SPECIFIC SMOTE CHECK
# # 6. ±2 DAY TOLERANCE METRIC
# # 7. HYPERPARAMETER SEARCH GRIDS
# # 8. PHASE-SPECIFIC TRAINING (Ridge, Lasso, RF, XGB, LGBM per phase × target)
# # 9. TEST SET EVALUATION WITH ±2 DAY TOLERANCE
# # 10. VISUALISATIONS (heatmaps, bar charts, scatter plots)
#
# See git history or previous script4b_phase_models.py for full code.
