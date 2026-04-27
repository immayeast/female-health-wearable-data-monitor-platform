"""
test_synthetic.py — Test the recalibration + gap pipeline on synthetic data.
=============================================================================
Loads synthetic_mcphases_fullschema.csv, renames columns to match the pipeline's
expected schema, and runs:
    1. Recalibration (GB gap model)
    2. Perception–physiology gap analysis (distance + UMAP/t-SNE)
    3. Alignment-bin experiment

Produces diagnostics to stdout and saves plots to eda_outputs/test_synthetic/.
"""

import os, warnings
import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")
np.random.seed(42)

# ─────────────────────────────────────────────
# 1. LOAD & RENAME
# ─────────────────────────────────────────────
print("=" * 65)
print("SYNTHETIC DATA TEST")
print("=" * 65)

df = pd.read_csv("data/synthetic_mcphases_fullschema.csv")
print(f"\nRaw shape: {df.shape}")
print(f"Participants: {df['id'].nunique()}")

# Column mapping: synthetic → pipeline
RENAME_MAP = {
    "daily_stress_score":          "stress_score",
    "sleep_overall_score":         "overall_score",
    "sleep_composition_score":     "composition_score",
    "sleep_duration_score":        "duration_score",
    "sleep_deep_sleep_in_minutes": "deep_sleep_in_minutes",
    "sleep_resting_heart_rate":    "sleep_resting_hr",
    "sleep_restlessness":          "restlessness",
    "sleep_revitalization_score":  "revitalization_score",
    "hrv_rmssd":                   "rmssd_mean",
    "hrv_lf":                      "low_frequency_mean",
    "hrv_hf":                      "high_frequency_mean",
    "resp_full_sleep":             "full_sleep_breathing_rate",
    "temp_mean":                   "temperature_diff_from_baseline",
    "temp_min":                    "nightly_temperature",
}

df = df.rename(columns=RENAME_MAP)

# Phase: lowercase + fertility → ovulation
df["phase"] = df["phase"].str.strip().str.lower().replace("fertility", "ovulation")
PHASE_ORDER = ["menstrual", "follicular", "ovulation", "luteal"]
df = df[df["phase"].isin(PHASE_ORDER)]

# Stress self-report is already numeric (0–5 int) — no Likert conversion needed
# pdg is missing — fill with NaN
if "pdg" not in df.columns:
    df["pdg"] = np.nan

print(f"After rename/clean: {df.shape}")
print(f"Phases: {df['phase'].value_counts().to_dict()}")
print(f"stress (self-report) non-null: {df['stress'].notna().sum()}")
print(f"stress_score (wearable) non-null: {df['stress_score'].notna().sum()}")
print(f"Both present: {(df['stress'].notna() & df['stress_score'].notna()).sum()}")

# Quick sanity
from scipy.stats import pearsonr
both = df.dropna(subset=["stress", "stress_score"])
r_raw, p_raw = pearsonr(both["stress"], both["stress_score"])
print(f"\nBaseline r(self-report, wearable): {r_raw:.4f} (p={p_raw:.4f})")


# ─────────────────────────────────────────────
# 2. TRAIN/VAL/TEST SPLIT (by participant)
# ─────────────────────────────────────────────
print("\n" + "=" * 65)
print("2. PARTICIPANT SPLIT")
print("=" * 65)

pids = df["id"].unique()
np.random.shuffle(pids)
n = len(pids)
tr_ids = pids[:int(n * 0.7)]
vl_ids = pids[int(n * 0.7):int(n * 0.85)]
te_ids = pids[int(n * 0.85):]

train_df = df[df["id"].isin(tr_ids)].copy()
val_df = df[df["id"].isin(vl_ids)].copy()
test_df = df[df["id"].isin(te_ids)].copy()

print(f"Train: {len(tr_ids)} participants, {len(train_df)} rows")
print(f"Val:   {len(vl_ids)} participants, {len(val_df)} rows")
print(f"Test:  {len(te_ids)} participants, {len(test_df)} rows")


# ─────────────────────────────────────────────
# 3. RECALIBRATION (GB gap model)
# ─────────────────────────────────────────────
print("\n" + "=" * 65)
print("3. GB-BASED RECALIBRATION")
print("=" * 65)

from recalibration_scores import run_recalibration_pipeline

adjusted_df, artifacts = run_recalibration_pipeline(
    df, score_col="stress_score",
    train_df=train_df, val_df=val_df, self_report_col="stress"
)

print(f"\nGB gap model val R²: {artifacts.gb_val_r2:.3f}")

# Correlation diagnostic
sub = adjusted_df[["stress", "stress_score", "adjusted_score"]].dropna()
if len(sub) > 10:
    r_raw2, _ = pearsonr(sub["stress"], sub["stress_score"])
    r_adj, _ = pearsonr(sub["stress"], sub["adjusted_score"])
    mae_raw = (sub["stress"] - (sub["stress_score"] - sub["stress_score"].mean()) / sub["stress_score"].std() * sub["stress"].std() + sub["stress"].mean()).abs().mean()

    # z-score comparison for fair MAE
    z_self = (sub["stress"] - sub["stress"].mean()) / sub["stress"].std()
    z_raw = (sub["stress_score"] - sub["stress_score"].mean()) / sub["stress_score"].std()
    z_adj = (sub["adjusted_score"] - sub["adjusted_score"].mean()) / sub["adjusted_score"].std()
    mae_z_raw = (z_self - z_raw).abs().mean()
    mae_z_adj = (z_self - z_adj).abs().mean()

    print(f"\n── Recalibration Results ──")
    print(f"  r(self-report, raw wearable):    {r_raw2:.4f}")
    print(f"  r(self-report, GB-adjusted):     {r_adj:.4f}")
    print(f"  Δr:                              {r_adj - r_raw2:+.4f}")
    print(f"  MAE(z_self, z_raw):              {mae_z_raw:.4f}")
    print(f"  MAE(z_self, z_adjusted):         {mae_z_adj:.4f}")
    print(f"  ΔMAE:                            {mae_z_raw - mae_z_adj:+.4f}")

# Distribution comparison
print(f"\n── Score Distributions ──")
print(f"  Raw stress_score:  mean={sub['stress_score'].mean():.2f}, std={sub['stress_score'].std():.2f}")
print(f"  GB-adjusted:       mean={sub['adjusted_score'].mean():.2f}, std={sub['adjusted_score'].std():.2f}")
print(f"  Self-report:       mean={sub['stress'].mean():.2f}, std={sub['stress'].std():.2f}")


# ─────────────────────────────────────────────
# 4. PERCEPTION–PHYSIOLOGY GAP ANALYSIS
# ─────────────────────────────────────────────
print("\n" + "=" * 65)
print("4. PERCEPTION–PHYSIOLOGY GAP ANALYSIS")
print("=" * 65)

OUT_DIR = "./eda_outputs/test_synthetic"
os.makedirs(OUT_DIR, exist_ok=True)

from perception_gap import run_gap_analysis

gap_results = run_gap_analysis(
    df, train_df, val_df, test_df,
    out_dir=OUT_DIR,
    self_report_col="stress",
    wearable_col="stress_score",
)

dr = gap_results.distance
print(f"\n── Gap Analysis Summary ──")
print(f"  Best gap model: {dr.best_model_name} "
      f"(R²={dr.model_results[dr.best_model_name]['R2']:.3f})"
      if dr.model_results else "  No models fitted")
print(f"  Phase ANOVA: F={dr.anova_f:.3f}, p={dr.anova_p:.4f}")
print(f"  ICC (trait proportion): {dr.trait_state['icc']:.3f}")
print(f"  Perception subtypes: {gap_results.space.n_subtypes}")

# Per-phase gap
print(f"\n── Gap by Phase ──")
print(dr.phase_stats.to_string(index=False))

# Subtype profiles
print(f"\n── Perception Subtypes ──")
print(gap_results.space.subtype_profiles.to_string())


# ─────────────────────────────────────────────
# 5. ALIGNMENT-BIN EXPERIMENT
# ─────────────────────────────────────────────
print("\n" + "=" * 65)
print("5. ALIGNMENT-BIN EXPERIMENT")
print("=" * 65)

from alignment_bin_models import run_alignment_bin_experiment

try:
    results = run_alignment_bin_experiment(
        train_df, val_df, test_df,
        self_report_col="stress",
        wearable_score_col="stress_score",
    )
    print(results["results_table"].to_string(index=False))
except Exception as e:
    print(f"  ⚠️  Alignment experiment failed: {e}")


# ─────────────────────────────────────────────
# 6. TEST SET EVALUATION (held-out participants)
# ─────────────────────────────────────────────
print("\n" + "=" * 65)
print("6. TEST SET EVALUATION (held-out participants)")
print("=" * 65)

# Apply the trained GB model to test set
from recalibration_scores import (
    _compute_within_person_z, _add_phase_dummies, _add_temporal_features
)

test_z = _compute_within_person_z(test_df, "stress_score", "stress")
test_z = _add_phase_dummies(test_z)
test_z = _add_temporal_features(test_z, "stress_score", "stress")

feats_available = [f for f in artifacts.gb_features if f in test_z.columns]
X_test = test_z[feats_available].copy()
for f in artifacts.gb_features:
    if f not in X_test.columns:
        X_test[f] = np.nan
X_test = X_test[artifacts.gb_features]

X_imp = artifacts.gb_imputer.transform(X_test)
X_sc = artifacts.gb_scaler.transform(X_imp)
test_z["predicted_gap"] = artifacts.gb_model.predict(X_sc)

# Evaluate on test set
test_paired = test_z.dropna(subset=["gap_signed", "predicted_gap"])
if len(test_paired) > 10:
    from sklearn.metrics import r2_score, mean_absolute_error
    r2_test = r2_score(test_paired["gap_signed"], test_paired["predicted_gap"])
    mae_test = mean_absolute_error(test_paired["gap_signed"], test_paired["predicted_gap"])

    # Adjusted vs raw correlation with self-report
    test_paired["z_adjusted"] = test_paired["z_wearable"] + test_paired["predicted_gap"]
    r_raw_test, _ = pearsonr(test_paired["z_self_report"], test_paired["z_wearable"])
    r_adj_test, _ = pearsonr(test_paired["z_self_report"], test_paired["z_adjusted"])

    # MSE gap closed
    mse_before = ((test_paired["z_self_report"] - test_paired["z_wearable"]) ** 2).mean()
    mse_after = ((test_paired["z_self_report"] - test_paired["z_adjusted"]) ** 2).mean()
    gap_closed = (1 - mse_after / mse_before) * 100 if mse_before > 0 else 0

    print(f"  Test participants: {test_paired['id'].nunique()}")
    print(f"  Test observations: {len(test_paired)}")
    print(f"  Gap model R² (test): {r2_test:.3f}")
    print(f"  Gap model MAE (test): {mae_test:.3f}")
    print(f"  r(z_self, z_wearable) test:  {r_raw_test:.4f}")
    print(f"  r(z_self, z_adjusted) test:  {r_adj_test:.4f}")
    print(f"  Δr (test):                   {r_adj_test - r_raw_test:+.4f}")
    print(f"  MSE gap closed (test):       {gap_closed:.1f}%")
else:
    print(f"  ⚠️  Only {len(test_paired)} paired test observations")


# ─────────────────────────────────────────────
# FINAL SUMMARY
# ─────────────────────────────────────────────
print("\n" + "=" * 65)
print("FINAL SUMMARY — SYNTHETIC DATA TEST")
print("=" * 65)
print(f"  Dataset: synthetic_mcphases_fullschema.csv")
print(f"  Rows: {len(df)} | Participants: {df['id'].nunique()}")
print(f"  GB val R²: {artifacts.gb_val_r2:.3f}")
if len(test_paired) > 10:
    print(f"  GB test R²: {r2_test:.3f}")
    print(f"  Recalibration Δr (test): {r_adj_test - r_raw_test:+.4f}")
    print(f"  MSE gap closed (test): {gap_closed:.1f}%")
print(f"  Perception subtypes: {gap_results.space.n_subtypes}")
print(f"  Plots saved to: {os.path.abspath(OUT_DIR)}")
print(f"\n✓ Synthetic test complete.")
