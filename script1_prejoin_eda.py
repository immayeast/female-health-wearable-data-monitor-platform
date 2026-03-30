"""
mcPHASES — Script 1: Pre-Join EDA
===================================
Run BEFORE merging any tables.
Covers:
  A. Per-table raw distributions
  B. Per-participant coverage (days per table)
  C. Interval 1 vs Interval 2 comparison per table
  D. Missingness map per table

Recommended: Run in Jupyter (convert with: jupytext --to notebook script1_prejoin_eda.py)
or open in VS Code and use # %% cells interactively.
"""

# ─────────────────────────────────────────────
# 0. IMPORTS & CONFIG
# ─────────────────────────────────────────────
import os
import warnings
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import seaborn as sns
from scipy import stats

warnings.filterwarnings("ignore")
sns.set_theme(style="whitegrid", palette="muted")
plt.rcParams["figure.dpi"] = 130

DATA_DIR = "/Users/kikkiliu/physionet.org/files/mcphases/data"       # <-- change to your path
OUT_DIR  = "/Users/kikkiliu/physionet.org/files/mcphases/eda_outputs/script1_prejoin"
os.makedirs(OUT_DIR, exist_ok=True)

def savefig(name):
    plt.tight_layout()
    plt.savefig(os.path.join(OUT_DIR, name), bbox_inches="tight")
    plt.show()

def load(fname, **kwargs):
    path = os.path.join(DATA_DIR, fname)
    df   = pd.read_csv(path, **kwargs)
    print(f"  ✓ [{fname}]  shape={df.shape}")
    return df

# ─────────────────────────────────────────────
# LOAD ALL TABLES (raw, no aggregation)
# ─────────────────────────────────────────────
print("Loading tables …")
tables = {
    "active_minutes"        : load("active_minutes.csv"),
    "calories"              : load("calories.csv"),
    "distance"              : load("distance.csv"),
    "steps"                 : load("steps.csv"),
    "heart_rate"            : load("heart_rate.csv"),
    "glucose"               : load("glucose.csv"),
    "sleep"                 : load("sleep.csv"),
    "sleep_score"           : load("sleep_score.csv"),
    "stress_score"          : load("stress_score.csv"),
    "resting_heart_rate"    : load("resting_heart_rate.csv"),
    "wrist_temperature"     : load("wrist_temperature.csv"),
    "computed_temperature"  : load("computed_temperature.csv"),
    "respiratory_rate"      : load("respiratory_rate_summary.csv"),
    "hrv"                   : load("heart_rate_variability_details.csv"),
    "exercise"              : load("exercise.csv"),
    "vo2"                   : load("demographic_vo2_max.csv"),
    "hormones_selfreport"   : load("hormones_and_selfreport.csv"),
    "subject_info"          : load("subject-info.csv"),
}

# Key columns we expect in most tables
ID_COL       = "id"
DAY_COL      = "day_in_study"
INTERVAL_COL = "study_interval"


# ═════════════════════════════════════════════
# A. PER-TABLE RAW DISTRIBUTIONS
# ═════════════════════════════════════════════
print("\n" + "="*60)
print("A. PER-TABLE RAW DISTRIBUTIONS")
print("="*60)

# Define which numeric column(s) to plot as representative signal per table
TABLE_SIGNALS = {
    "active_minutes"       : ["sedentary", "lightly", "moderately", "very"],
    "calories"             : ["calories"],
    "distance"             : ["distance"],
    "steps"                : ["steps"],
    "heart_rate"           : ["bpm"],
    "glucose"              : ["glucose_value"],
    "sleep"                : ["minutesasleep", "efficiency", "minutestofallasleep"],
    "sleep_score"          : ["overall_score", "deep_sleep_in_minutes", "restlessness"],
    "stress_score"         : ["stress_score"],
    "resting_heart_rate"   : ["value"],
    "wrist_temperature"    : ["temperature_diff_from_baseline"],
    "computed_temperature" : ["nightly_temperature",
                              "baseline_relative_nightly_standard_deviation"],
    "respiratory_rate"     : ["full_sleep_breathing_rate",
                              "deep_sleep_breathing_rate", "rem_sleep_breathing_rate"],
    "hrv"                  : ["rmssd", "low_frequency", "high_frequency"],
    "vo2"                  : ["demographic_vo2_max", "filtered_demographic_vo2_max"],
    "hormones_selfreport"  : ["lh", "estrogen", "pdg"],
}

for tname, signals in TABLE_SIGNALS.items():
    df      = tables[tname]
    signals = [s for s in signals if s in df.columns]
    if not signals:
        continue

    ncols = min(len(signals), 4)
    fig, axes = plt.subplots(1, ncols, figsize=(4.5 * ncols, 4))
    if ncols == 1:
        axes = [axes]

    for ax, col in zip(axes, signals):
        data = df[col].dropna()

        # Histogram + KDE
        ax.hist(data, bins=40, density=True,
                color="#7bafd4", alpha=0.6, edgecolor="white", label="hist")
        try:
            kde = stats.gaussian_kde(data)
            xs  = np.linspace(data.min(), data.max(), 300)
            ax.plot(xs, kde(xs), color="#1a5276", linewidth=1.8, label="KDE")
        except Exception:
            pass

        # Annotate basic stats
        ax.axvline(data.mean(),   color="red",    linestyle="--",
                   linewidth=1.2, label=f"mean={data.mean():.1f}")
        ax.axvline(data.median(), color="orange", linestyle=":",
                   linewidth=1.2, label=f"median={data.median():.1f}")
        ax.set_title(f"{col}\n(n={len(data):,})", fontsize=9)
        ax.set_xlabel(col, fontsize=8)
        ax.set_ylabel("Density", fontsize=8)
        ax.legend(fontsize=6)

    plt.suptitle(f"[{tname}] Raw distributions", fontsize=11, y=1.02)
    savefig(f"A_{tname}_dist.png")


# ═════════════════════════════════════════════
# B. PER-PARTICIPANT COVERAGE
# ═════════════════════════════════════════════
print("\n" + "="*60)
print("B. PER-PARTICIPANT COVERAGE")
print("="*60)

# For each table that has id + day_in_study, count unique days per participant
coverage_summary = {}

for tname, df in tables.items():
    if ID_COL not in df.columns:
        continue
    day_col = DAY_COL
    # Some sleep tables use sleep_start_day_in_study
    if day_col not in df.columns:
        alt = [c for c in df.columns if "day_in_study" in c]
        if alt:
            day_col = alt[0]
        else:
            continue

    days_per_person = df.groupby(ID_COL)[day_col].nunique()
    coverage_summary[tname] = days_per_person

# ── B1. Heatmap: participants × tables (days of coverage) ───────────────────
cov_df = pd.DataFrame(coverage_summary).fillna(0).astype(int)
cov_df = cov_df.sort_index()   # sort by participant id

fig, ax = plt.subplots(figsize=(max(14, len(cov_df.columns) * 1.2),
                                max(6,  len(cov_df.index)   * 0.4)))
sns.heatmap(cov_df, ax=ax, cmap="YlGnBu", linewidths=0.3,
            cbar_kws={"label": "Days with data"})
ax.set_title("Per-participant data coverage (days) across all tables", fontsize=12)
ax.set_xlabel("Table")
ax.set_ylabel("Participant ID")
plt.xticks(rotation=45, ha="right", fontsize=8)
savefig("B1_coverage_heatmap.png")

# ── B2. Box plots: spread of coverage per table ───────────────────────────────
fig, ax = plt.subplots(figsize=(14, 5))
cov_df.plot.box(ax=ax, vert=True, showfliers=True)
ax.set_title("Distribution of per-participant day coverage across tables")
ax.set_ylabel("Days with data")
plt.xticks(rotation=45, ha="right", fontsize=8)
savefig("B2_coverage_boxplot.png")

# ── B3. Flag sparse participants (< 14 days in any key table) ────────────────
KEY_TABLES = ["stress_score", "sleep_score", "hormones_selfreport", "glucose"]
for kt in KEY_TABLES:
    if kt in coverage_summary:
        sparse = coverage_summary[kt][coverage_summary[kt] < 14]
        print(f"\n[{kt}] participants with < 14 days ({len(sparse)} total):")
        print(sparse.sort_values().to_string())


# ═════════════════════════════════════════════
# C. INTERVAL 1 vs INTERVAL 2 COMPARISON
# ═════════════════════════════════════════════
print("\n" + "="*60)
print("C. INTERVAL 1 vs INTERVAL 2 COMPARISON")
print("="*60)

# NOTE: Interval 2 participants are a SUBSET of Interval 1 (by design).
# So differences here reflect:
#   (a) longitudinal change in the same people over ~2 years
#   (b) seasonal effects (Jan-Apr vs Jul-Oct)
# Both are scientifically interesting and should NOT be collapsed.

INTERVAL_SIGNALS = {
    "stress_score"       : "stress_score",
    "sleep_score"        : "overall_score",
    "resting_heart_rate" : "value",
    "glucose"            : "glucose_value",
    "steps"              : "steps",
    "hormones_selfreport": "lh",
}

fig, axes = plt.subplots(2, 3, figsize=(16, 9))

for ax, (tname, col) in zip(axes.flat, INTERVAL_SIGNALS.items()):
    df = tables[tname]
    if INTERVAL_COL not in df.columns or col not in df.columns:
        ax.set_visible(False)
        continue

    for iv, grp in df.groupby(INTERVAL_COL):
        data = grp[col].dropna()
        try:
            kde = stats.gaussian_kde(data)
            xs  = np.linspace(data.min(), data.max(), 300)
            ax.plot(xs, kde(xs), label=f"Interval {iv}",
                    linewidth=2)
        except Exception:
            ax.hist(data, bins=30, density=True, alpha=0.5,
                    label=f"Interval {iv}")

    # Mann-Whitney U test for distributional difference
    g1 = df[df[INTERVAL_COL] == 1][col].dropna()
    g2 = df[df[INTERVAL_COL] == 2][col].dropna()
    if len(g1) > 5 and len(g2) > 5:
        u, p = stats.mannwhitneyu(g1, g2, alternative="two-sided")
        ax.set_title(f"{tname}\n{col}  (p={p:.3f})", fontsize=8)
    else:
        ax.set_title(f"{tname} — {col}", fontsize=8)

    ax.legend(fontsize=7)
    ax.set_xlabel(col, fontsize=8)
    ax.set_ylabel("Density", fontsize=8)

plt.suptitle("Interval 1 vs Interval 2 — key signal distributions\n"
             "(same participants, ~2 yr apart, different seasons)",
             fontsize=11, y=1.02)
savefig("C_interval_comparison.png")

# ── C2. Participant-level: did individuals shift between intervals? ────────────
# For each participant present in both intervals, compute mean signal difference.
print("\nPer-participant shift between intervals (stress score):")
ss = tables["stress_score"]
if INTERVAL_COL in ss.columns and "stress_score" in ss.columns:
    pivot = (
        ss.groupby([ID_COL, INTERVAL_COL])["stress_score"]
          .mean()
          .unstack(INTERVAL_COL)
    )
    pivot.columns = ["I1_mean", "I2_mean"]
    pivot["delta"] = pivot["I2_mean"] - pivot["I1_mean"]
    print(pivot.sort_values("delta").to_string())

    fig, ax = plt.subplots(figsize=(8, 4))
    ax.bar(pivot.index.astype(str), pivot["delta"],
           color=["#e07b7b" if d > 0 else "#7bafd4"
                  for d in pivot["delta"]])
    ax.axhline(0, color="black", linewidth=0.8)
    ax.set_title("Per-participant stress score change: Interval 2 − Interval 1")
    ax.set_xlabel("Participant ID")
    ax.set_ylabel("Δ Mean stress score")
    plt.xticks(rotation=45, ha="right", fontsize=7)
    savefig("C2_stress_participant_shift.png")


# ═════════════════════════════════════════════
# D. MISSINGNESS MAP PER TABLE
# ═════════════════════════════════════════════
print("\n" + "="*60)
print("D. MISSINGNESS MAP PER TABLE")
print("="*60)

for tname, df in tables.items():
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    if not numeric_cols:
        continue

    miss_rate = df[numeric_cols].isnull().mean().sort_values(ascending=False)

    fig, ax = plt.subplots(figsize=(max(8, len(numeric_cols) * 0.6), 4))
    bars = ax.bar(miss_rate.index, miss_rate.values,
                  color=["#e07b7b" if v > 0.3 else "#7bafd4"
                         for v in miss_rate.values])
    ax.axhline(0.3, color="red", linestyle="--",
               linewidth=0.9, label="30% threshold")
    ax.set_title(f"[{tname}] Missing value rate per column")
    ax.set_ylabel("Fraction missing")
    ax.set_ylim(0, 1)
    ax.legend(fontsize=8)
    plt.xticks(rotation=45, ha="right", fontsize=8)
    savefig(f"D_{tname}_missing.png")

    # Print any columns > 30% missing
    bad = miss_rate[miss_rate > 0.3]
    if not bad.empty:
        print(f"\n  [{tname}] columns >30% missing: {bad.to_dict()}")

print(f"\n✓ Script 1 complete. Figures saved to: {os.path.abspath(OUT_DIR)}")
