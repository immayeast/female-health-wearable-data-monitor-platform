"""
mcPHASES — Script 3: Modeling Pipeline
========================================
Targets:
  - stress_score
  - rmssd (HRV proxy)
  - overall_score (sleep score)

Pipeline:
  0. Load & merge master DataFrame
  1. Participant-level 30/6/6 split
  2. Feature engineering (phase interactions, within-person centering)
  3. Feature reduction
       a. Correlation filtering
       b. Lasso/ElasticNet selection
       c. PCA (parallel, for comparison)
  4. Model training per target
       - Ridge (baseline)
       - Lasso
       - Random Forest
       - XGBoost
       - LightGBM
       - Linear Mixed Effects (statsmodels)
  5. Validation tuning & model selection
  6. Test set evaluation
  7. SHAP feature importance
  8. Phase-stratified performance breakdown
  9. Summary report
"""

# ─────────────────────────────────────────────
# 0. IMPORTS & CONFIG
# ─────────────────────────────────────────────
import os, warnings, math, json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import seaborn as sns
import shap

from sklearn.pipeline          import Pipeline
from sklearn.preprocessing     import StandardScaler, OneHotEncoder
from sklearn.compose           import ColumnTransformer
from sklearn.impute             import SimpleImputer
from sklearn.decomposition     import PCA
from sklearn.linear_model      import Ridge, Lasso, ElasticNet
from sklearn.ensemble          import RandomForestRegressor
from sklearn.metrics           import (mean_absolute_error,
                                        mean_squared_error, r2_score)
from sklearn.inspection        import permutation_importance
from xgboost                   import XGBRegressor
from lightgbm                  import LGBMRegressor
import statsmodels.formula.api as smf

warnings.filterwarnings("ignore")
sns.set_theme(style="whitegrid", palette="muted")
plt.rcParams["figure.dpi"] = 130

DATA_DIR = "./data"
OUT_DIR  = "./eda_outputs/script3_modeling"
os.makedirs(OUT_DIR, exist_ok=True)

RANDOM_STATE = 42
np.random.seed(RANDOM_STATE)

PHASE_ORDER  = ["menstrual", "follicular", "ovulation", "luteal"]
PHASE_COLORS = {"menstrual": "#e07b7b", "follicular": "#7bafd4",
                "ovulation": "#f5c06a", "luteal":     "#a8c5da"}

TARGETS = {
    "stress_score" : "Fitbit Stress Score",
    "rmssd"        : "HRV (RMSSD)",
    "overall_score": "Sleep Score",
}

def savefig(name):
    plt.tight_layout()
    plt.savefig(os.path.join(OUT_DIR, name), bbox_inches="tight")
    plt.show()

def load(fname):
    return pd.read_csv(os.path.join(DATA_DIR, fname))

def metrics(y_true, y_pred, label=""):
    mask = ~np.isnan(y_true) & ~np.isnan(y_pred)
    y_true, y_pred = np.array(y_true)[mask], np.array(y_pred)[mask]
    mae  = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    r2   = r2_score(y_true, y_pred)
    if label:
        print(f"  {label:<30}  MAE={mae:.3f}  RMSE={rmse:.3f}  R²={r2:.3f}")
    return {"MAE": mae, "RMSE": rmse, "R2": r2}


# ─────────────────────────────────────────────
# LOAD & BUILD MASTER DATAFRAME
# (same join logic as script 1, compacted)
# ─────────────────────────────────────────────
print("Loading & merging tables …")

JOIN_KEYS = ["id", "day_in_study", "study_interval"]

def daily_agg(df, agg_dict):
    cols = JOIN_KEYS + list(agg_dict.keys())
    df   = df[[c for c in cols if c in df.columns]].copy()
    out  = df.groupby(JOIN_KEYS).agg(agg_dict).reset_index()
    out.columns = ["_".join(c).strip("_") if isinstance(c, tuple) else c
                   for c in out.columns]
    return out

hormones    = load("hormones_and_selfreport.csv")
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

# Standardise phase
hormones["phase"] = (hormones["phase"].astype(str)
                                       .str.strip().str.lower())
hormones = hormones[hormones["phase"].isin(PHASE_ORDER)]

# Daily aggregations
daily_stress  = stress[JOIN_KEYS + ["stress_score",
                                     "sleep_points",
                                     "responsiveness_points",
                                     "exertion_points"]].copy()

daily_sleep   = sleep_sc[JOIN_KEYS + ["overall_score",
                                       "deep_sleep_in_minutes",
                                       "restlessness",
                                       "composition_score",
                                       "revitalization_score",
                                       "duration_score"]].copy()

daily_rhr     = (resting_hr[JOIN_KEYS + ["value"]]
                 .rename(columns={"value": "resting_hr"}))

daily_active  = daily_agg(active_min,
                           {"sedentary": "mean", "lightly":   "mean",
                            "moderately":"mean", "very":      "mean"})

daily_cal     = daily_agg(calories,  {"calories": "sum"})
daily_dist    = daily_agg(distance,  {"distance": "sum"})
daily_steps   = daily_agg(steps_df,  {"steps":    "sum"})

daily_glucose = daily_agg(glucose_df,
                           {"glucose_value": ["mean", "std",
                                              "min",  "max"]})

# HRV — aggregate to daily (recorded during sleep)
daily_hrv = daily_agg(hrv_df,
                       {"rmssd":          "mean",
                        "coverage":       "mean",
                        "low_frequency":  "mean",
                        "high_frequency": "mean"})

daily_wtemp = daily_agg(wrist_temp,
                         {"temperature_diff_from_baseline": "mean"})

ct_cols = ["id", "study_interval", "sleep_start_day_in_study",
           "nightly_temperature",
           "baseline_relative_nightly_standard_deviation"]
comp_temp_d = (comp_temp[[c for c in ct_cols if c in comp_temp.columns]]
               .rename(columns={"sleep_start_day_in_study": "day_in_study"}))

resp_cols = JOIN_KEYS + ["full_sleep_breathing_rate",
                          "deep_sleep_breathing_rate",
                          "rem_sleep_breathing_rate",
                          "full_sleep_standard_deviation"]
resp_d = resp_rate[[c for c in resp_cols if c in resp_rate.columns]]

vo2_cols = JOIN_KEYS + ["demographic_vo2_max", "filtered_demographic_vo2_max"]
vo2_d    = vo2_df[[c for c in vo2_cols if c in vo2_df.columns]]

# Static participant info
hw_slim = hw[["id", "height_2022", "weight_2022"]].copy()
hw_slim["bmi"] = hw_slim["weight_2022"] / (hw_slim["height_2022"] / 100) ** 2

subj_slim = subjects[["id", "birth_year", "age_of_first_menarche"]].copy()
subj_slim["age"] = 2022 - subj_slim["birth_year"]

# Master join — left-join everything onto the hormone/phase table
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


# ═════════════════════════════════════════════
# 1. PARTICIPANT-LEVEL 30 / 6 / 6 SPLIT
# ═════════════════════════════════════════════
print("\n" + "="*60)
print("1. PARTICIPANT SPLIT  (30 train / 6 val / 6 test)")
print("="*60)

# Use ONLY Interval 1 for the split to avoid data leakage.
# Interval 2 (same participants, 2 yr later) can be used for
# out-of-distribution / longitudinal robustness checks later.
all_ids = master[master["study_interval"] == 1]["id"].unique()
all_ids = np.random.permutation(all_ids)

assert len(all_ids) >= 42, (
    f"Need ≥42 participants, found {len(all_ids)}. "
    "Adjust split sizes if your sample is smaller.")

train_ids = all_ids[:30]
val_ids   = all_ids[30:36]
test_ids  = all_ids[36:42]

print(f"  Train: {len(train_ids)} participants")
print(f"  Val  : {len(val_ids)}   participants")
print(f"  Test : {len(test_ids)}  participants")

def split_df(df, ids):
    return df[df["id"].isin(ids) &
              (df["study_interval"] == 1)].copy()

train_df = split_df(master, train_ids)
val_df   = split_df(master, val_ids)
test_df  = split_df(master, test_ids)

print(f"\n  Train rows: {len(train_df)} | "
      f"Val: {len(val_df)} | Test: {len(test_df)}")


# ═════════════════════════════════════════════
# 2. FEATURE ENGINEERING
# ═════════════════════════════════════════════
print("\n" + "="*60)
print("2. FEATURE ENGINEERING")
print("="*60)

# ── 2a. Within-person centering ───────────────────────────────────────────────
# For repeated-measures data, raw values confound between-person and
# within-person effects. We compute:
#   signal_centered = signal − participant's TRAINING mean
# This is fitted on train only, then applied to val/test (no leakage).

CENTER_COLS = [
    "resting_hr", "calories", "steps", "distance",
    "sedentary", "lightly", "moderately", "very",
    "glucose_value_mean", "glucose_value_std",
    "temperature_diff_from_baseline", "nightly_temperature",
    "full_sleep_breathing_rate", "demographic_vo2_max",
    "lh", "estrogen", "pdg",
]

person_means = (train_df.groupby("id")[CENTER_COLS]
                         .mean()
                         .add_suffix("_pmean"))

def center_by_person(df, person_means):
    df = df.merge(person_means.reset_index(), on="id", how="left")
    for col in CENTER_COLS:
        if col in df.columns:
            df[f"{col}_c"] = df[col] - df[f"{col}_pmean"]
    df = df.drop(columns=[c for c in df.columns if c.endswith("_pmean")])
    return df

train_df = center_by_person(train_df, person_means)
val_df   = center_by_person(val_df,   person_means)
test_df  = center_by_person(test_df,  person_means)

# ── 2b. Phase one-hot encoding ────────────────────────────────────────────────
for phase in PHASE_ORDER:
    for df in [train_df, val_df, test_df]:
        df[f"phase_{phase}"] = (df["phase"] == phase).astype(int)

# ── 2c. Phase × key signal INTERACTION TERMS ─────────────────────────────────
# These capture "how much does stress/activity/etc. deviate from norm
# specifically when in phase X" — the core of your hypothesis.
INTERACTION_SIGNALS = [
    "resting_hr_c", "calories_c", "moderately_c", "very_c",
    "glucose_value_mean_c", "temperature_diff_from_baseline_c",
]
INTERACTION_SIGNALS = [s for s in INTERACTION_SIGNALS
                        if s in train_df.columns]

for phase in PHASE_ORDER:
    for sig in INTERACTION_SIGNALS:
        col_name = f"ix_{phase}_{sig}"
        for df in [train_df, val_df, test_df]:
            df[col_name] = df[f"phase_{phase}"] * df[sig]

print(f"  Interaction terms added: "
      f"{len(PHASE_ORDER) * len(INTERACTION_SIGNALS)}")

# ── 2d. Symptom composite scores (reduce Likert items) ────────────────────────
SOMATIC_COLS = ["headaches", "cramps", "sorebreasts", "fatigue", "bloating"]
MOOD_COLS    = ["moodswing", "stress", "sleepissue"]
CRAVING_COLS = ["foodcravings", "appetite", "indigestion"]

for df in [train_df, val_df, test_df]:
    avail = lambda cols: [c for c in cols if c in df.columns]
    df["somatic_score"]  = df[avail(SOMATIC_COLS)].mean(axis=1)
    df["mood_score"]     = df[avail(MOOD_COLS)].mean(axis=1)
    df["craving_score"]  = df[avail(CRAVING_COLS)].mean(axis=1)

print("  Symptom composites created: somatic_score, mood_score, craving_score")


# ═════════════════════════════════════════════
# 3. FEATURE REDUCTION
# ═════════════════════════════════════════════
print("\n" + "="*60)
print("3. FEATURE REDUCTION")
print("="*60)

# Candidate feature pool
PHASE_FEATURES    = [f"phase_{p}" for p in PHASE_ORDER]
INTERACTION_FEATS = [c for c in train_df.columns if c.startswith("ix_")]
CENTERED_FEATS    = [c for c in train_df.columns if c.endswith("_c")]
STATIC_FEATS      = ["age", "bmi", "age_of_first_menarche"]
HORMONE_FEATS     = ["lh", "estrogen", "pdg"]
COMPOSITE_FEATS   = ["somatic_score", "mood_score", "craving_score"]
HRV_RAW_FEATS     = ["rmssd_mean", "low_frequency_mean", "high_frequency_mean",
                      "coverage_mean"]

# NOTE: We deliberately exclude raw (un-centered) wearable cols to avoid
# double-counting with their centered versions. Raw hormones are kept because
# they don't have a clean centered counterpart in the phase context.

ALL_CANDIDATE_FEATURES = list(set(
    PHASE_FEATURES + INTERACTION_FEATS + CENTERED_FEATS +
    STATIC_FEATS   + HORMONE_FEATS     + COMPOSITE_FEATS
))
ALL_CANDIDATE_FEATURES = [f for f in ALL_CANDIDATE_FEATURES
                           if f in train_df.columns]

print(f"\n  Candidate feature pool size: {len(ALL_CANDIDATE_FEATURES)}")


# ── 3a. Correlation filter ────────────────────────────────────────────────────
# Drop one of any pair with |r| > 0.85 (keeps the one with higher
# mean absolute correlation to all other features — i.e., more "connected").

CORR_THRESHOLD = 0.85

corr_matrix = train_df[ALL_CANDIDATE_FEATURES].corr().abs()
upper       = corr_matrix.where(
    np.triu(np.ones(corr_matrix.shape), k=1).astype(bool))

to_drop_corr = set()
for col in upper.columns:
    if any(upper[col] > CORR_THRESHOLD):
        partners = upper.index[upper[col] > CORR_THRESHOLD].tolist()
        # Keep whichever has higher mean correlation (more central)
        col_mean = corr_matrix[col].mean()
        for p in partners:
            p_mean = corr_matrix[p].mean()
            drop   = col if col_mean > p_mean else p
            to_drop_corr.add(drop)

features_after_corr = [f for f in ALL_CANDIDATE_FEATURES
                        if f not in to_drop_corr]
print(f"\n  [Correlation filter] dropped {len(to_drop_corr)} features "
      f"(|r| > {CORR_THRESHOLD})")
print(f"  Remaining: {len(features_after_corr)}")

# Plot top remaining correlations
fig, ax = plt.subplots(figsize=(14, 11))
corr_sub = train_df[features_after_corr[:40]].corr()  # cap at 40 for readability
sns.heatmap(corr_sub, ax=ax, cmap="coolwarm", center=0,
            linewidths=0.2, annot=False)
ax.set_title("Correlation matrix after filtering (train set)", fontsize=11)
plt.xticks(rotation=45, ha="right", fontsize=6)
plt.yticks(fontsize=6)
savefig("3a_corr_filtered_heatmap.png")


# ── 3b. Lasso / ElasticNet selection ─────────────────────────────────────────
# Fit a Lasso on each target using the correlation-filtered features.
# Features with non-zero coefficients are selected for the main models.

from sklearn.linear_model import LassoCV, ElasticNetCV

lasso_selected = {}   # target → list of selected features

for target, label in TARGETS.items():
    if target not in train_df.columns:
        print(f"  [{target}] not found — skipping Lasso selection")
        continue

    # Build clean train arrays
    feat_cols = [f for f in features_after_corr if f != target]
    Xtr = train_df[feat_cols].copy()
    ytr = train_df[target].copy()

    # Drop rows where target is NaN
    mask = ytr.notna()
    Xtr, ytr = Xtr[mask], ytr[mask]

    # Impute missing features with column median (train only)
    imp = SimpleImputer(strategy="median")
    Xtr_imp = imp.fit_transform(Xtr)

    scaler   = StandardScaler()
    Xtr_scaled = scaler.fit_transform(Xtr_imp)

    # LassoCV (cross-validated alpha)
    lasso_cv = LassoCV(cv=5, max_iter=5000, random_state=RANDOM_STATE)
    lasso_cv.fit(Xtr_scaled, ytr)

    selected = [feat_cols[i] for i, coef in enumerate(lasso_cv.coef_)
                if coef != 0]
    lasso_selected[target] = selected
    print(f"\n  [{label}] Lasso selected {len(selected)}/{len(feat_cols)} features "
          f"(alpha={lasso_cv.alpha_:.4f})")

    # Coefficient plot
    coef_df = pd.DataFrame({
        "feature": feat_cols,
        "coef"   : lasso_cv.coef_
    }).query("coef != 0").sort_values("coef")

    fig, ax = plt.subplots(figsize=(8, max(4, len(coef_df) * 0.3)))
    colors  = ["#e07b7b" if c > 0 else "#7bafd4" for c in coef_df["coef"]]
    ax.barh(coef_df["feature"], coef_df["coef"], color=colors)
    ax.axvline(0, color="black", linewidth=0.8)
    ax.set_title(f"Lasso coefficients — {label}", fontsize=10)
    ax.set_xlabel("Coefficient (standardised)")
    savefig(f"3b_lasso_coefs_{target}.png")


# ── 3c. PCA (parallel, for comparison / exploratory) ─────────────────────────
# PCA is run separately — we use it to visualise structure by phase,
# NOT as input to the main models (interpretability would be lost).

pca_feats = [f for f in features_after_corr
             if f in train_df.columns and f not in TARGETS]

Xtr_pca   = train_df[pca_feats].copy()
imp_pca   = SimpleImputer(strategy="median")
scaler_pca = StandardScaler()
Xtr_pca_s  = scaler_pca.fit_transform(imp_pca.fit_transform(Xtr_pca))

pca       = PCA(n_components=0.90, random_state=RANDOM_STATE)
Xtr_pc    = pca.fit_transform(Xtr_pca_s)

print(f"\n  [PCA] {pca.n_components_} components explain 90% variance")

# Scree plot
fig, axes = plt.subplots(1, 2, figsize=(12, 4))
axes[0].bar(range(1, len(pca.explained_variance_ratio_) + 1),
            pca.explained_variance_ratio_, color="#7bafd4")
axes[0].set_xlabel("PC")
axes[0].set_ylabel("Explained variance ratio")
axes[0].set_title("PCA scree plot")

axes[1].plot(np.cumsum(pca.explained_variance_ratio_), marker="o",
             color="#e07b7b")
axes[1].axhline(0.90, linestyle="--", color="grey")
axes[1].set_xlabel("Number of components")
axes[1].set_ylabel("Cumulative variance explained")
axes[1].set_title("Cumulative variance (90% threshold)")
savefig("3c_pca_scree.png")

# PC1 vs PC2 coloured by phase
phase_labels = train_df["phase"].values
fig, ax = plt.subplots(figsize=(8, 6))
for phase in PHASE_ORDER:
    mask = phase_labels == phase
    ax.scatter(Xtr_pc[mask, 0], Xtr_pc[mask, 1],
               color=PHASE_COLORS[phase], alpha=0.4, s=15, label=phase)
ax.set_xlabel("PC1")
ax.set_ylabel("PC2")
ax.set_title("PCA — PC1 vs PC2 coloured by menstrual phase\n"
             "(separation → phase captures variance in features)")
ax.legend()
savefig("3c_pca_phase_scatter.png")


# ═════════════════════════════════════════════
# 4. MODEL TRAINING
# ═════════════════════════════════════════════
print("\n" + "="*60)
print("4. MODEL TRAINING")
print("="*60)

# ── Helpers ───────────────────────────────────────────────────────────────────

def prepare_Xy(df, features, target):
    """Return clean X, y arrays; impute X with median, leave y as-is."""
    sub  = df[features + [target]].copy()
    mask = sub[target].notna()
    sub  = sub[mask]
    y    = sub[target].values
    X    = sub[features].values
    return X, y, sub.index

def build_preprocessor(X_train):
    """Fit imputer + scaler on train, return fitted objects."""
    imp = SimpleImputer(strategy="median").fit(X_train)
    sc  = StandardScaler().fit(imp.transform(X_train))
    return imp, sc

def apply_prep(X, imp, sc):
    return sc.transform(imp.transform(X))


MODELS = {
    "Ridge"   : Ridge(alpha=1.0),
    "Lasso"   : Lasso(alpha=0.01, max_iter=5000),
    "RF"      : RandomForestRegressor(n_estimators=300, max_features="sqrt",
                                       min_samples_leaf=5,
                                       random_state=RANDOM_STATE, n_jobs=-1),
    "XGB"     : XGBRegressor(n_estimators=300, learning_rate=0.05,
                              max_depth=4, subsample=0.8,
                              colsample_bytree=0.8, random_state=RANDOM_STATE,
                              verbosity=0),
    "LGBM"    : LGBMRegressor(n_estimators=300, learning_rate=0.05,
                               max_depth=4, subsample=0.8,
                               colsample_bytree=0.8, random_state=RANDOM_STATE,
                               verbose=-1),
}

# Store results
val_results  = {}   # target → model_name → metrics dict
test_results = {}
fitted_models = {}  # target → model_name → (model, imp, sc, features)

for target, label in TARGETS.items():
    print(f"\n{'─'*55}")
    print(f"TARGET: {label}  [{target}]")
    print(f"{'─'*55}")

    if target not in train_df.columns:
        print("  ⚠️  Target not in data — skipping")
        continue

    # Use Lasso-selected features for this target (fall back to corr-filtered)
    features = lasso_selected.get(target, features_after_corr)
    features = [f for f in features if f != target and f in train_df.columns]

    Xtr, ytr, _  = prepare_Xy(train_df, features, target)
    Xvl, yvl, _  = prepare_Xy(val_df,   features, target)

    imp, sc      = build_preprocessor(Xtr)
    Xtr_s        = apply_prep(Xtr, imp, sc)
    Xvl_s        = apply_prep(Xvl, imp, sc)

    val_results[target]   = {}
    fitted_models[target] = {}

    for mname, model in MODELS.items():
        try:
            model.fit(Xtr_s, ytr)
            ypred_vl = model.predict(Xvl_s)
            m = metrics(yvl, ypred_vl, label=f"{mname:<10}")
            val_results[target][mname] = m
            fitted_models[target][mname] = (model, imp, sc, features)
        except Exception as e:
            print(f"  [{mname}] FAILED: {e}")

    # ── Mixed-effects model (via statsmodels formula) ─────────────────────────
    # Uses top-5 Lasso features + phase as fixed effects,
    # random intercept per participant.
    top5_feats = features[:5]   # already ordered by |coef| from Lasso
    safe_feats = [f.replace("-", "_").replace(".", "_") for f in top5_feats]
    me_train   = train_df[["id", target, "phase"] + top5_feats].dropna().copy()
    me_val     = val_df[  ["id", target, "phase"] + top5_feats].dropna().copy()

    # Rename for formula safety
    rename_map = dict(zip(top5_feats, safe_feats))
    me_train   = me_train.rename(columns=rename_map)
    me_val     = me_val.rename(columns=rename_map)

    formula    = (f"{target} ~ phase + " +
                  " + ".join(safe_feats))
    try:
        me_model = smf.mixedlm(formula, me_train,
                                groups=me_train["id"]).fit(reml=False,
                                                            disp=False)
        ypred_me = me_model.predict(me_val)
        m_me     = metrics(me_val[target].values,
                           ypred_me.values, label="MixedLM   ")
        val_results[target]["MixedLM"] = m_me
        fitted_models[target]["MixedLM"] = (me_model, None, None, top5_feats)
    except Exception as e:
        print(f"  [MixedLM] FAILED: {e}")


# ═════════════════════════════════════════════
# 5. VALIDATION MODEL COMPARISON
# ═════════════════════════════════════════════
print("\n" + "="*60)
print("5. VALIDATION — MODEL COMPARISON")
print("="*60)

best_models = {}   # target → best model name

for target, label in TARGETS.items():
    if target not in val_results:
        continue

    results_df = (pd.DataFrame(val_results[target]).T
                    .sort_values("R2", ascending=False))
    print(f"\n[{label}]")
    print(results_df.to_string())

    best_name = results_df["R2"].idxmax()
    best_models[target] = best_name
    print(f"  → Best model: {best_name}")

    # Bar chart: R² per model on validation set
    fig, axes = plt.subplots(1, 3, figsize=(14, 4))
    for ax, metric in zip(axes, ["MAE", "RMSE", "R2"]):
        vals   = results_df[metric]
        colors = ["#5b8db8" if m != best_name else "#e07b7b"
                  for m in vals.index]
        ax.bar(vals.index, vals.values, color=colors)
        ax.set_title(metric)
        ax.set_xlabel("Model")
        plt.xticks(rotation=30, ha="right")
    plt.suptitle(f"Validation metrics — {label}", fontsize=11)
    savefig(f"5_val_comparison_{target}.png")


# ═════════════════════════════════════════════
# 6. TEST SET EVALUATION (best model per target)
# ═════════════════════════════════════════════
print("\n" + "="*60)
print("6. TEST SET EVALUATION")
print("="*60)

test_results = {}

for target, label in TARGETS.items():
    if target not in best_models:
        continue

    best_name           = best_models[target]
    model, imp, sc, features = fitted_models[target][best_name]

    if best_name == "MixedLM":
        # Mixed effects: use formula prediction
        top5_feats = features[:5]
        safe_feats = [f.replace("-", "_").replace(".", "_") for f in top5_feats]
        me_test    = test_df[["id", target, "phase"] + top5_feats].dropna().copy()
        rename_map = dict(zip(top5_feats, safe_feats))
        me_test    = me_test.rename(columns=rename_map)
        ypred      = model.predict(me_test)
        ytrue      = me_test[target].values
    else:
        Xte, yte, idx = prepare_Xy(test_df, features, target)
        Xte_s         = apply_prep(Xte, imp, sc)
        ypred         = model.predict(Xte_s)
        ytrue         = yte

    m = metrics(ytrue, ypred, label=f"{best_name} → {label}")
    test_results[target] = {"model": best_name, **m}

    # Actual vs predicted scatter
    fig, ax = plt.subplots(figsize=(6, 5))
    ax.scatter(ytrue, ypred, alpha=0.4, s=15, color="#7bafd4")
    mn = min(ytrue.min(), ypred.min())
    mx = max(ytrue.max(), ypred.max())
    ax.plot([mn, mx], [mn, mx], "r--", linewidth=1.2, label="Perfect")
    ax.set_xlabel("Actual")
    ax.set_ylabel("Predicted")
    ax.set_title(f"{label} — {best_name}\nTest: "
                 f"MAE={m['MAE']:.2f}  R²={m['R2']:.3f}")
    ax.legend()
    savefig(f"6_test_actual_vs_pred_{target}.png")


# ═════════════════════════════════════════════
# 7. SHAP FEATURE IMPORTANCE
# ═════════════════════════════════════════════
print("\n" + "="*60)
print("7. SHAP FEATURE IMPORTANCE")
print("="*60)

for target, label in TARGETS.items():
    best_name = best_models.get(target)
    if best_name not in ("RF", "XGB", "LGBM"):
        # SHAP TreeExplainer only works for tree models
        # Fall back to permutation importance for Ridge/Lasso/MixedLM
        print(f"  [{label}] best={best_name} → using permutation importance")
        if best_name in ("Ridge", "Lasso") and target in fitted_models:
            model, imp, sc, features = fitted_models[target][best_name]
            Xte, yte, _ = prepare_Xy(test_df, features, target)
            Xte_s = apply_prep(Xte, imp, sc)
            pi = permutation_importance(model, Xte_s, yte,
                                         n_repeats=20,
                                         random_state=RANDOM_STATE)
            imp_df = (pd.DataFrame({"feature": features,
                                    "importance": pi.importances_mean})
                        .sort_values("importance", ascending=False)
                        .head(20))
            fig, ax = plt.subplots(figsize=(8, 5))
            ax.barh(imp_df["feature"][::-1],
                    imp_df["importance"][::-1], color="#a8c5da")
            ax.set_title(f"Permutation importance — {label} ({best_name})")
            ax.set_xlabel("Mean importance")
            savefig(f"7_permutation_imp_{target}.png")
        continue

    model, imp, sc, features = fitted_models[target][best_name]
    Xte, yte, _ = prepare_Xy(test_df, features, target)
    Xte_s = apply_prep(Xte, imp, sc)

    explainer   = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(Xte_s)

    # Summary beeswarm
    fig, ax = plt.subplots(figsize=(10, 6))
    shap.summary_plot(shap_values, Xte_s,
                      feature_names=features,
                      plot_type="dot",
                      show=False, max_display=20)
    plt.title(f"SHAP beeswarm — {label} ({best_name})")
    savefig(f"7_shap_beeswarm_{target}.png")

    # Bar summary
    fig, ax = plt.subplots(figsize=(9, 5))
    shap.summary_plot(shap_values, Xte_s,
                      feature_names=features,
                      plot_type="bar",
                      show=False, max_display=20)
    plt.title(f"SHAP mean |value| — {label} ({best_name})")
    savefig(f"7_shap_bar_{target}.png")


# ═════════════════════════════════════════════
# 8. PHASE-STRATIFIED PERFORMANCE
# ═════════════════════════════════════════════
print("\n" + "="*60)
print("8. PHASE-STRATIFIED PERFORMANCE")
print("="*60)
# This directly tests the hypothesis:
# does model performance differ by phase?
# Poor performance in a specific phase → model doesn't capture
# that phase's baseline shift well → indicates need for phase-specific tuning.

phase_perf_all = {}

for target, label in TARGETS.items():
    best_name = best_models.get(target)
    if best_name is None or best_name == "MixedLM":
        continue

    model, imp, sc, features = fitted_models[target][best_name]

    phase_perf = {}
    for phase in PHASE_ORDER:
        phase_test = test_df[test_df["phase"] == phase].copy()
        if len(phase_test) < 5:
            continue
        Xph, yph, _ = prepare_Xy(phase_test, features, target)
        if len(Xph) == 0:
            continue
        Xph_s = apply_prep(Xph, imp, sc)
        yph_pred = model.predict(Xph_s)
        m = metrics(yph, yph_pred)
        phase_perf[phase] = m
        print(f"  [{label}] phase={phase:<12} "
              f"MAE={m['MAE']:.3f}  R²={m['R2']:.3f}  n={len(yph)}")

    phase_perf_all[target] = phase_perf

    # Plot R² and MAE by phase
    fig, axes = plt.subplots(1, 2, figsize=(12, 4))
    phases_found = list(phase_perf.keys())
    r2s  = [phase_perf[p]["R2"]  for p in phases_found]
    maes = [phase_perf[p]["MAE"] for p in phases_found]

    axes[0].bar(phases_found, r2s,
                color=[PHASE_COLORS.get(p, "#aaa") for p in phases_found])
    axes[0].set_title(f"R² by phase — {label}")
    axes[0].set_ylabel("R²")
    axes[0].axhline(test_results.get(target, {}).get("R2", 0),
                    linestyle="--", color="black", linewidth=0.8,
                    label="Overall R²")
    axes[0].legend(fontsize=8)

    axes[1].bar(phases_found, maes,
                color=[PHASE_COLORS.get(p, "#aaa") for p in phases_found])
    axes[1].set_title(f"MAE by phase — {label}")
    axes[1].set_ylabel("MAE")
    axes[1].axhline(test_results.get(target, {}).get("MAE", 0),
                    linestyle="--", color="black", linewidth=0.8,
                    label="Overall MAE")
    axes[1].legend(fontsize=8)

    plt.suptitle(
        f"Phase-stratified test performance — {label}\n"
        "Gap from dashed line = phase where model struggles most",
        fontsize=10)
    savefig(f"8_phase_perf_{target}.png")


# ═════════════════════════════════════════════
# 9. SUMMARY REPORT
# ═════════════════════════════════════════════
print("\n" + "="*60)
print("9. SUMMARY REPORT")
print("="*60)

report_lines = [
    "mcPHASES MODELING SUMMARY",
    "=" * 50,
    f"Train participants : {len(train_ids)}",
    f"Val   participants : {len(val_ids)}",
    f"Test  participants : {len(test_ids)}",
    f"Feature pool (post corr-filter): {len(features_after_corr)}",
    "",
    "BEST MODELS (by validation R²):",
]
for target, label in TARGETS.items():
    if target not in test_results:
        continue
    tr = test_results[target]
    report_lines.append(
        f"  {label:<25} | best={tr['model']:<10} | "
        f"test MAE={tr['MAE']:.3f}  RMSE={tr['RMSE']:.3f}  R²={tr['R2']:.3f}"
    )

report_lines += [
    "",
    "PHASE-STRATIFIED R² (test set):",
]
for target, label in TARGETS.items():
    if target not in phase_perf_all:
        continue
    report_lines.append(f"  {label}:")
    for phase, m in phase_perf_all[target].items():
        report_lines.append(f"    {phase:<14} R²={m['R2']:.3f}  MAE={m['MAE']:.3f}")

report_lines += [
    "",
    "INTERPRETATION NOTES:",
    "  - Phases where R² drops sharply suggest the model fails to capture",
    "    that phase's unique physiological baseline — prime candidates for",
    "    phase-specific sub-models or additional phase interaction terms.",
    "  - SHAP plots reveal which features drive predictions; if interaction",
    "    terms (ix_*) rank highly, the phase-shift hypothesis is supported.",
    "  - MixedLM random intercepts absorb between-person variance; compare",
    "    its performance to RF/XGB to quantify how much variance is person-",
    "    level vs feature-driven.",
    "",
    "NEXT STEPS:",
    "  1. Retrain best model per target on train+val combined.",
    "  2. Evaluate on Interval 2 data (out-of-distribution / longitudinal).",
    "  3. For phases with poor R²: train phase-specific sub-models.",
    "  4. Translate phase-relative feature weights into exercise advisories.",
]

report_text = "\n".join(report_lines)
print(report_text)

report_path = os.path.join(OUT_DIR, "summary_report.txt")
with open(report_path, "w") as f:
    f.write(report_text)

# Also save test results as JSON for downstream use
json_path = os.path.join(OUT_DIR, "test_results.json")
with open(json_path, "w") as f:
    json.dump(test_results, f, indent=2)

print(f"\n✓ Script 3 complete.")
print(f"  Report : {os.path.abspath(report_path)}")
print(f"  Figures: {os.path.abspath(OUT_DIR)}")
