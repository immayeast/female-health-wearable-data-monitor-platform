"""
Perception–Physiology Gap Analysis
====================================
Two complementary analyses of how perceived stress diverges from
wearable-measured physiological stress:

Part A — Gap Distance:
    Models the scalar mismatch (within-person z-scored) as a
    context-sensitive quantity.  Three target variants:
        signed, absolute, categorical.

Part B — Perception Space:
    UMAP and t-SNE embeddings of the joint perception–physiology feature vector
    into a 2D latent space.  HDBSCAN discovers perception subtypes.

Usage:
    from perception_gap import run_gap_analysis
    results = run_gap_analysis(master, train_df, val_df, test_df, out_dir="./out")
"""

from __future__ import annotations

import os
import warnings
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

from scipy.stats import f_oneway
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.manifold import TSNE
from typing import Any

from cluster_validity import evaluate_cluster_validity

warnings.filterwarnings("ignore")

RANDOM_STATE = 42
PHASE_ORDER = ["menstrual", "follicular", "fertility", "luteal"]
PHASE_COLORS = {
    "menstrual": "#e07b7b", "follicular": "#7bafd4",
    "fertility": "#f5c06a", "luteal": "#a8c5da",
}
GAP_CAT_COLORS = {
    "aligned": "#66bb6a", "self_higher": "#ef5350", "wearable_higher": "#42a5f5",
}
GAP_THRESHOLD = 0.5  # z-score units for categorical binning


# ═══════════════════════════════════════════════════════════════════════════════
# DATA CLASSES
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class GapDistanceResults:
    """Results from Part A: gap distance modeling."""
    gap_df: pd.DataFrame                 # master with gap columns added
    phase_stats: pd.DataFrame            # per-phase mean, var, cohen_d, n
    anova_f: float                       # F-statistic from one-way ANOVA
    anova_p: float                       # p-value
    trait_state: Dict[str, float]        # ICC, trait_var, state_var
    model_results: Dict[str, Dict]       # model_name -> {R2, MAE, RMSE, importances}
    best_model_name: str


@dataclass
class PerceptionSpaceResults:
    """Results from Part B: UMAP + t-SNE perception space."""
    umap_embedding: np.ndarray           # (n, 2) UMAP coordinates
    tsne_embedding: np.ndarray           # (n, 2) t-SNE coordinates
    subtype_labels: np.ndarray           # HDBSCAN cluster labels
    n_subtypes: int
    subtype_profiles: pd.DataFrame       # per-subtype feature means
    features_used: List[str]
    cluster_metrics: Dict[str, Any]      # validation metrics (silhouette, ari, etc.)


@dataclass
class GapAnalysisResults:
    """Combined results from both parts."""
    distance: GapDistanceResults
    space: PerceptionSpaceResults
    gap_df: pd.DataFrame                 # final df with gap + UMAP + subtypes


# ═══════════════════════════════════════════════════════════════════════════════
# PART A: GAP DISTANCE MODELING
# ═══════════════════════════════════════════════════════════════════════════════

def compute_perception_gap(
    df: pd.DataFrame,
    self_report_col: str = "stress",
    wearable_col: str = "stress_score",
    id_col: str = "id",
    min_obs: int = 5,
    threshold: float = GAP_THRESHOLD,
) -> pd.DataFrame:
    """Compute within-person z-scored perception–physiology gap.

    For person i at time t:
        d_it = z_person(self_report_it) − z_person(wearable_it)

    Persons with fewer than `min_obs` paired observations are excluded.
    """
    out = df.copy()

    # Ensure numeric
    out[self_report_col] = pd.to_numeric(out[self_report_col], errors="coerce")
    out[wearable_col] = pd.to_numeric(out[wearable_col], errors="coerce")

    # Only rows with both present
    paired_mask = out[self_report_col].notna() & out[wearable_col].notna()

    # Initialize gap columns
    out["gap_signed"] = np.nan
    out["gap_abs"] = np.nan
    out["gap_cat"] = np.nan
    out["z_self_report"] = np.nan
    out["z_wearable"] = np.nan

    for pid, grp in out[paired_mask].groupby(id_col):
        if len(grp) < min_obs:
            continue

        idx = grp.index

        # Within-person z-score for self-report
        sr = grp[self_report_col]
        sr_std = sr.std(ddof=1)
        if sr_std == 0 or np.isnan(sr_std):
            sr_std = 1.0  # avoid div by zero for constant reporters
        z_sr = (sr - sr.mean()) / sr_std

        # Within-person z-score for wearable
        ws = grp[wearable_col]
        ws_std = ws.std(ddof=1)
        if ws_std == 0 or np.isnan(ws_std):
            ws_std = 1.0
        z_ws = (ws - ws.mean()) / ws_std

        gap = z_sr - z_ws

        out.loc[idx, "z_self_report"] = z_sr
        out.loc[idx, "z_wearable"] = z_ws
        out.loc[idx, "gap_signed"] = gap
        out.loc[idx, "gap_abs"] = gap.abs()

        # Categorical binning
        out.loc[idx[gap.abs() <= threshold], "gap_cat"] = "aligned"
        out.loc[idx[gap > threshold], "gap_cat"] = "self_higher"
        out.loc[idx[gap < -threshold], "gap_cat"] = "wearable_higher"

    n_valid = out["gap_signed"].notna().sum()
    n_persons = out[out["gap_signed"].notna()][id_col].nunique()
    print(f"  Gap computed: {n_valid} observations from {n_persons} participants")
    print(f"  Gap distribution: mean={out['gap_signed'].mean():.4f}, "
          f"std={out['gap_signed'].std():.4f}")
    print(f"  Categories: {out['gap_cat'].value_counts().to_dict()}")

    return out


def build_gap_features(
    df: pd.DataFrame,
    id_col: str = "id",
    day_col: str = "day_in_study",
) -> pd.DataFrame:
    """Add temporal and phase features for gap modeling."""
    out = df.copy().sort_values([id_col, day_col])

    # Lag features (within person)
    for lag in [1, 2]:
        out[f"gap_lag{lag}"] = (
            out.groupby(id_col)["gap_signed"].shift(lag)
        )

    # Rolling 3-day mean (within person)
    out["gap_rolling3"] = (
        out.groupby(id_col)["gap_signed"]
        .transform(lambda x: x.rolling(3, min_periods=2).mean())
    )

    # Day-over-day deltas
    out["stress_score_delta"] = out.groupby(id_col)["stress_score"].diff()
    out["self_report_delta"] = out.groupby(id_col)["stress"].diff()

    # Phase dummies
    if "phase" in out.columns:
        for phase in PHASE_ORDER:
            out[f"phase_{phase}"] = (out["phase"] == phase).astype(int)

    return out


def _default_gap_features(df: pd.DataFrame) -> List[str]:
    """Select features for gap prediction (excludes wearable score by default)."""
    candidates = [
        # Physiology
        "resting_hr", "rmssd_mean", "low_frequency_mean", "high_frequency_mean",
        # Sleep
        "overall_score", "deep_sleep_in_minutes", "restlessness",
        "composition_score", "duration_score",
        # Hormones
        "lh", "estrogen", "pdg",
        # Temperature
        "temperature_diff_from_baseline", "nightly_temperature",
        # Self-report context
        "somatic_score", "mood_score", "craving_score",
        # Activity
        "calories", "steps", "sedentary", "lightly", "moderately", "very",
        # Static
        "age", "bmi", "age_of_first_menarche",
        # Gap-specific temporal
        "gap_lag1", "gap_lag2", "gap_rolling3",
        "stress_score_delta", "self_report_delta",
        # Phase dummies
        "phase_menstrual", "phase_follicular", "phase_fertility", "phase_luteal",
    ]
    # Centered variants
    centered = [c for c in df.columns if c.endswith("_c")]
    return [c for c in (candidates + centered) if c in df.columns]


def fit_gap_models(
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
    feature_cols: List[str],
    target: str = "gap_signed",
) -> Dict[str, Dict]:
    """Train Ridge, RF, and GB on the gap target.  Return results dict."""
    results = {}

    # Prepare data
    feats = [c for c in feature_cols if c in train_df.columns and c in val_df.columns]
    tr = train_df[feats + [target]].dropna(subset=[target])
    vl = val_df[feats + [target]].dropna(subset=[target])

    if len(tr) < 20 or len(vl) < 5:
        print(f"  ⚠️  Insufficient data: train={len(tr)}, val={len(vl)}")
        return results

    Xtr = tr[feats].values
    ytr = tr[target].values
    Xvl = vl[feats].values
    yvl = vl[target].values

    # Impute + scale
    imp = SimpleImputer(strategy="median").fit(Xtr)
    scaler = StandardScaler().fit(imp.transform(Xtr))
    Xtr_s = scaler.transform(imp.transform(Xtr))
    Xvl_s = scaler.transform(imp.transform(Xvl))

    models = {
        "Ridge": Ridge(alpha=1.0),
        "RF": RandomForestRegressor(
            n_estimators=300, max_depth=8, min_samples_leaf=5,
            random_state=RANDOM_STATE, n_jobs=-1
        ),
        "GB": GradientBoostingRegressor(
            n_estimators=200, max_depth=4, learning_rate=0.05,
            random_state=RANDOM_STATE
        ),
    }

    for name, model in models.items():
        model.fit(Xtr_s, ytr)
        ypred = model.predict(Xvl_s)

        mask = ~np.isnan(yvl)
        r2 = r2_score(yvl[mask], ypred[mask])
        mae = mean_absolute_error(yvl[mask], ypred[mask])
        rmse = np.sqrt(mean_squared_error(yvl[mask], ypred[mask]))

        # Feature importance
        if hasattr(model, "feature_importances_"):
            importances = dict(zip(feats, model.feature_importances_))
        elif hasattr(model, "coef_"):
            importances = dict(zip(feats, np.abs(model.coef_)))
        else:
            importances = {}

        results[name] = {
            "R2": r2, "MAE": mae, "RMSE": rmse,
            "importances": importances,
            "model": model,
            "n_train": len(tr), "n_val": len(vl),
        }
        print(f"    {name:6s} → R²={r2:.3f}  MAE={mae:.3f}  RMSE={rmse:.3f}")

    return results


def analyze_gap_by_phase(
    df: pd.DataFrame,
    gap_col: str = "gap_signed",
    phase_col: str = "phase",
) -> Tuple[pd.DataFrame, float, float]:
    """Per-phase gap statistics + ANOVA."""
    valid = df.dropna(subset=[gap_col, phase_col])
    global_mean = valid[gap_col].mean()
    global_std = valid[gap_col].std()

    rows = []
    groups = []
    for phase in PHASE_ORDER:
        grp = valid[valid[phase_col] == phase][gap_col]
        if len(grp) == 0:
            continue
        groups.append(grp.values)
        cohen_d = (grp.mean() - global_mean) / global_std if global_std > 0 else 0
        rows.append({
            "phase": phase,
            "n": len(grp),
            "mean_gap": grp.mean(),
            "std_gap": grp.std(),
            "median_gap": grp.median(),
            "cohen_d": cohen_d,
        })

    stats_df = pd.DataFrame(rows)

    # One-way ANOVA
    if len(groups) >= 2:
        f_stat, p_val = f_oneway(*groups)
    else:
        f_stat, p_val = np.nan, np.nan

    print(f"\n  Phase-level gap statistics:")
    print(f"  {stats_df.to_string(index=False)}")
    print(f"\n  ANOVA: F={f_stat:.3f}, p={p_val:.4f}")

    return stats_df, f_stat, p_val


def decompose_trait_state(
    df: pd.DataFrame,
    gap_col: str = "gap_signed",
    id_col: str = "id",
) -> Dict[str, float]:
    """Decompose gap variance into trait (between-person) and state (within-person).

    Returns ICC and variance components.
    """
    valid = df.dropna(subset=[gap_col])
    person_means = valid.groupby(id_col)[gap_col].mean()
    valid = valid.merge(
        person_means.rename("person_gap_mean").reset_index(),
        on=id_col, how="left"
    )
    valid["gap_state"] = valid[gap_col] - valid["person_gap_mean"]

    # Variance components
    total_var = valid[gap_col].var()
    trait_var = person_means.var()                # between-person
    state_var = valid["gap_state"].var()           # within-person

    # ICC = between / (between + within)
    icc = trait_var / (trait_var + state_var) if (trait_var + state_var) > 0 else np.nan

    result = {
        "total_var": float(total_var),
        "trait_var": float(trait_var),
        "state_var": float(state_var),
        "icc": float(icc),
        "trait_pct": float(trait_var / total_var * 100) if total_var > 0 else np.nan,
        "state_pct": float(state_var / total_var * 100) if total_var > 0 else np.nan,
        "n_persons": int(person_means.shape[0]),
    }

    print(f"\n  Trait vs. State Decomposition:")
    print(f"    ICC = {icc:.3f}")
    print(f"    Trait (between-person): {result['trait_pct']:.1f}% of variance")
    print(f"    State (within-person):  {result['state_pct']:.1f}% of variance")
    print(f"    → {'Mostly trait-like' if icc > 0.5 else 'Mostly state-dependent'}")

    return result


# ═══════════════════════════════════════════════════════════════════════════════
# PART B: PERCEPTION SPACE (UMAP + t-SNE + HDBSCAN)
# ═══════════════════════════════════════════════════════════════════════════════

def _perception_space_features(df: pd.DataFrame) -> List[str]:
    """Features for the UMAP perception space embedding."""
    candidates = [
        # Gap itself — central to the space
        "gap_signed",
        # Physiology
        "resting_hr", "rmssd_mean", "low_frequency_mean", "high_frequency_mean",
        # Sleep
        "overall_score", "deep_sleep_in_minutes", "restlessness",
        # Hormones
        "lh", "estrogen", "pdg",
        # Temperature
        "temperature_diff_from_baseline", "nightly_temperature",
        # Self-report context
        "somatic_score", "mood_score", "craving_score",
        # Activity
        "calories", "steps",
        # Temporal
        "gap_lag1", "stress_score_delta",
    ]
    return [c for c in candidates if c in df.columns]


def build_perception_space(
    df: pd.DataFrame,
    features: Optional[List[str]] = None,
    n_neighbors: int = 15,
    min_dist: float = 0.1,
    n_components: int = 2,
) -> Tuple[np.ndarray, List[str]]:
    """UMAP embedding of perception–physiology feature vector.

    Returns (embedding array, features used).
    """
    import umap  # lazy import — not everyone has umap-learn

    if features is None:
        features = _perception_space_features(df)

    valid = df.dropna(subset=["gap_signed"])
    X = valid[features].copy()

    # Impute + scale
    imp = SimpleImputer(strategy="median")
    scaler = StandardScaler()
    X_clean = scaler.fit_transform(imp.fit_transform(X))

    reducer = umap.UMAP(
        n_neighbors=n_neighbors,
        min_dist=min_dist,
        n_components=n_components,
        random_state=RANDOM_STATE,
        metric="euclidean",
    )
    embedding = reducer.fit_transform(X_clean)

    print(f"  UMAP: {X_clean.shape[0]} points × {X_clean.shape[1]} features → "
          f"{n_components}D embedding")

    return embedding, features, X_clean


def build_tsne_space(
    X_scaled: np.ndarray,
    n_components: int = 2,
    perplexity: float = 30.0,
    learning_rate: float = 200.0,
) -> np.ndarray:
    """t-SNE embedding on the same scaled feature matrix used by UMAP.

    Expects the already-imputed-and-scaled matrix from build_perception_space.
    Returns (n, 2) embedding array.
    """
    tsne = TSNE(
        n_components=n_components,
        perplexity=min(perplexity, max(5.0, X_scaled.shape[0] / 4)),
        learning_rate=learning_rate,
        random_state=RANDOM_STATE,
        init="pca",
        max_iter=1000,
    )
    embedding = tsne.fit_transform(X_scaled)

    print(f"  t-SNE: {X_scaled.shape[0]} points → {n_components}D embedding "
          f"(perplexity={tsne.perplexity:.0f})")

    return embedding


def discover_perception_subtypes(
    embedding: np.ndarray,
    min_cluster_size: int = 30,
) -> np.ndarray:
    """HDBSCAN clustering on the UMAP embedding.

    Returns cluster labels (-1 = noise).
    """
    import hdbscan  # lazy import

    clusterer = hdbscan.HDBSCAN(
        min_cluster_size=min_cluster_size,
        min_samples=5,
        metric="euclidean",
    )
    labels = clusterer.fit_predict(embedding)

    n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
    n_noise = (labels == -1).sum()
    print(f"  HDBSCAN: {n_clusters} subtypes discovered, {n_noise} noise points")

    return labels


def profile_subtypes(
    df: pd.DataFrame,
    labels: np.ndarray,
    features: List[str],
) -> pd.DataFrame:
    """Profile each perception subtype by feature means."""
    valid = df.dropna(subset=["gap_signed"]).copy()
    valid["subtype"] = labels

    # Exclude noise
    valid_clustered = valid[valid["subtype"] >= 0]

    profile_cols = ["gap_signed", "gap_abs"] + [
        c for c in ["phase", "resting_hr", "rmssd_mean", "overall_score",
                     "lh", "estrogen", "pdg", "somatic_score", "mood_score",
                     "stress_score", "calories", "steps"]
        if c in valid.columns
    ]

    numeric_cols = [c for c in profile_cols
                    if c in valid.columns and pd.api.types.is_numeric_dtype(valid[c])]

    profiles = valid_clustered.groupby("subtype")[numeric_cols].mean()

    # Add phase composition
    if "phase" in valid.columns:
        phase_comp = (
            valid_clustered.groupby(["subtype", "phase"])
            .size()
            .unstack(fill_value=0)
        )
        phase_pct = phase_comp.div(phase_comp.sum(axis=1), axis=0) * 100
        for phase in PHASE_ORDER:
            if phase in phase_pct.columns:
                profiles[f"pct_{phase}"] = phase_pct[phase]

    # Add count
    profiles["n"] = valid_clustered.groupby("subtype").size()

    return profiles


# ═══════════════════════════════════════════════════════════════════════════════
# VISUALIZATIONS
# ═══════════════════════════════════════════════════════════════════════════════

def _savefig(fig, name, out_dir):
    fig.tight_layout()
    fig.savefig(os.path.join(out_dir, name), bbox_inches="tight", dpi=150)
    plt.close(fig)


def plot_gap_by_phase(df, out_dir):
    """Violin + strip plot of gap_signed by phase."""
    valid = df.dropna(subset=["gap_signed", "phase"])
    valid = valid[valid["phase"].isin(PHASE_ORDER)]

    fig, ax = plt.subplots(figsize=(10, 5))
    sns.violinplot(data=valid, x="phase", y="gap_signed",
                   order=PHASE_ORDER, inner=None, alpha=0.3,
                   palette=PHASE_COLORS, ax=ax)
    sns.stripplot(data=valid, x="phase", y="gap_signed",
                  order=PHASE_ORDER, alpha=0.25, size=3,
                  palette=PHASE_COLORS, jitter=True, ax=ax)
    ax.axhline(0, color="gray", linestyle="--", linewidth=1)
    ax.axhline(GAP_THRESHOLD, color="red", linestyle=":", linewidth=0.8, alpha=0.5)
    ax.axhline(-GAP_THRESHOLD, color="blue", linestyle=":", linewidth=0.8, alpha=0.5)
    ax.set_title("Perception–Physiology Gap by Menstrual Phase", fontsize=12)
    ax.set_ylabel("Gap (z-scored)\n← wearable higher | self-report higher →")
    ax.set_xlabel("Phase")

    _savefig(fig, "6a_gap_by_phase_violin.png", out_dir)


def plot_trait_scatter(df, out_dir):
    """Scatter: each person's trait (mean gap) vs. gap variability."""
    valid = df.dropna(subset=["gap_signed"])
    person_stats = valid.groupby("id")["gap_signed"].agg(["mean", "std", "count"])
    person_stats = person_stats[person_stats["count"] >= 5]

    fig, ax = plt.subplots(figsize=(8, 6))
    sc = ax.scatter(person_stats["mean"], person_stats["std"],
                    s=person_stats["count"] * 3, alpha=0.6,
                    c=person_stats["mean"], cmap="RdBu_r",
                    edgecolors="gray", linewidth=0.5)
    ax.axvline(0, color="gray", linestyle="--", linewidth=1)
    ax.set_xlabel("Trait: Mean Gap (person-level)\n← under-perceiver | over-perceiver →")
    ax.set_ylabel("Variability: Std of Gap (person-level)")
    ax.set_title("Trait vs. Variability of Perception Gap", fontsize=12)
    plt.colorbar(sc, ax=ax, label="Mean Gap")

    # Label extreme persons
    for pid, row in person_stats.iterrows():
        if abs(row["mean"]) > 0.5 or row["std"] > 1.5:
            ax.annotate(str(pid), (row["mean"], row["std"]),
                        fontsize=7, alpha=0.7)

    _savefig(fig, "6a_trait_scatter.png", out_dir)


def plot_feature_importance(model_results, out_dir):
    """Bar chart of top-15 feature importances from best model."""
    if not model_results:
        return
    best_name = max(model_results, key=lambda k: model_results[k]["R2"])
    importances = model_results[best_name].get("importances", {})
    if not importances:
        return

    top15 = sorted(importances.items(), key=lambda x: x[1], reverse=True)[:15]
    names, vals = zip(*top15)

    fig, ax = plt.subplots(figsize=(10, 6))
    ax.barh(range(len(names)), vals, color="#5e97c9", edgecolor="white")
    ax.set_yticks(range(len(names)))
    ax.set_yticklabels(names)
    ax.invert_yaxis()
    ax.set_xlabel("Feature Importance")
    ax.set_title(f"Top-15 Predictors of Gap (signed) — {best_name}", fontsize=12)
    _savefig(fig, "6a_feature_importance.png", out_dir)


def plot_embedding(embedding, color_values, color_label, title, filename,
                   out_dir, cmap=None, palette=None, categorical=False,
                   axis_prefix="Dim"):
    """Generic 2D embedding scatter plot (works for UMAP, t-SNE, etc.)."""
    fig, ax = plt.subplots(figsize=(9, 7))

    if categorical:
        unique_cats = sorted([v for v in pd.Series(color_values).dropna().unique()
                              if v != -1 and not (isinstance(v, float) and np.isnan(v))])
        if palette is None:
            palette = dict(zip(unique_cats,
                               sns.color_palette("husl", len(unique_cats))))
        for cat in unique_cats:
            mask = np.array(color_values) == cat
            ax.scatter(embedding[mask, 0], embedding[mask, 1],
                       s=8, alpha=0.5, label=str(cat),
                       color=palette.get(cat, "#999999"))
        # Noise / NaN
        mask_other = ~np.isin(color_values, unique_cats)
        if mask_other.any():
            ax.scatter(embedding[mask_other, 0], embedding[mask_other, 1],
                       s=4, alpha=0.15, color="#cccccc", label="other")
        ax.legend(bbox_to_anchor=(1.02, 1), loc="upper left",
                  fontsize=8, markerscale=2, title=color_label)
    else:
        sc = ax.scatter(embedding[:, 0], embedding[:, 1],
                        c=color_values, cmap=cmap or "RdBu_r",
                        s=8, alpha=0.5, edgecolors="none")
        plt.colorbar(sc, ax=ax, label=color_label, shrink=0.8)

    ax.set_xlabel(f"{axis_prefix}-1")
    ax.set_ylabel(f"{axis_prefix}-2")
    ax.set_title(title, fontsize=12)

    _savefig(fig, filename, out_dir)


def _plot_embedding_suite(df, embedding, subtype_labels, out_dir,
                          method="umap", axis_prefix="UMAP"):
    """Generate all 6 visualization variants for a given embedding method."""
    valid = df.dropna(subset=["gap_signed"])
    tag = f"6b_{method}"

    # 1. By phase
    phases = valid["phase"].values if "phase" in valid.columns else np.full(len(valid), "unknown")
    plot_embedding(embedding, phases, "Phase",
                   f"Perception Space ({method.upper()}) — by Phase",
                   f"{tag}_by_phase.png", out_dir,
                   palette=PHASE_COLORS, categorical=True, axis_prefix=axis_prefix)

    # 2. By gap (signed, continuous)
    plot_embedding(embedding, valid["gap_signed"].values, "Gap (signed)",
                   f"Perception Space ({method.upper()}) — by Gap Magnitude",
                   f"{tag}_by_gap_signed.png", out_dir,
                   cmap="RdBu_r", axis_prefix=axis_prefix)

    # 3. By gap category
    plot_embedding(embedding, valid["gap_cat"].values, "Gap Category",
                   f"Perception Space ({method.upper()}) — by Gap Category",
                   f"{tag}_by_gap_cat.png", out_dir,
                   palette=GAP_CAT_COLORS, categorical=True, axis_prefix=axis_prefix)

    # 4. By person
    plot_embedding(embedding, valid["id"].values.astype(str), "Participant",
                   f"Perception Space ({method.upper()}) — by Participant",
                   f"{tag}_by_person.png", out_dir,
                   categorical=True, axis_prefix=axis_prefix)

    # 5. By HDBSCAN subtype
    plot_embedding(embedding, subtype_labels, "Subtype",
                   f"Perception Space ({method.upper()}) — HDBSCAN Subtypes",
                   f"{tag}_by_subtype.png", out_dir,
                   categorical=True, axis_prefix=axis_prefix)

    # 6. By physiological state cluster (if available)
    if "state_cluster" in valid.columns:
        plot_embedding(embedding, valid["state_cluster"].values.astype(str),
                       "Physiology Cluster",
                       f"Perception Space ({method.upper()}) — by Physiology Cluster",
                       f"{tag}_by_cluster.png", out_dir,
                       categorical=True, axis_prefix=axis_prefix)


# ═══════════════════════════════════════════════════════════════════════════════
# ORCHESTRATOR
# ═══════════════════════════════════════════════════════════════════════════════

def run_gap_analysis(
    master: pd.DataFrame,
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
    test_df: pd.DataFrame,
    out_dir: str = "./eda_outputs/script4_phase_models",
    self_report_col: str = "stress",
    wearable_col: str = "stress_score",
) -> GapAnalysisResults:
    """Run the full perception–physiology gap analysis.

    Part A: Gap distance modeling (on train/val split)
    Part B: Perception space (on full master)
    """
    os.makedirs(out_dir, exist_ok=True)

    # ── Part A: Gap Distance ──────────────────────────────────────────────────
    print("\n── Part A: Gap Distance Modeling ──")

    # Compute gap on all splits
    print("\nA1. Computing within-person gap...")
    master_gap = compute_perception_gap(master, self_report_col, wearable_col)
    train_gap = compute_perception_gap(train_df, self_report_col, wearable_col)
    val_gap = compute_perception_gap(val_df, self_report_col, wearable_col)

    # Add temporal features
    print("\nA2. Building temporal features...")
    master_gap = build_gap_features(master_gap)
    train_gap = build_gap_features(train_gap)
    val_gap = build_gap_features(val_gap)

    # Fit models
    print("\nA3. Fitting gap prediction models...")
    feature_cols = _default_gap_features(train_gap)
    print(f"  Feature pool: {len(feature_cols)} features")
    model_results = fit_gap_models(train_gap, val_gap, feature_cols, target="gap_signed")

    # Phase analysis
    print("\nA4. Phase-level gap analysis...")
    phase_stats, anova_f, anova_p = analyze_gap_by_phase(master_gap)

    # Trait vs. state
    print("\nA5. Trait vs. state decomposition...")
    trait_state = decompose_trait_state(master_gap)

    # Best model
    best_model_name = (max(model_results, key=lambda k: model_results[k]["R2"])
                       if model_results else "none")

    distance_results = GapDistanceResults(
        gap_df=master_gap,
        phase_stats=phase_stats,
        anova_f=anova_f,
        anova_p=anova_p,
        trait_state=trait_state,
        model_results=model_results,
        best_model_name=best_model_name,
    )

    # Part A visualizations
    print("\nA6. Generating distance visualizations...")
    plot_gap_by_phase(master_gap, out_dir)
    plot_trait_scatter(master_gap, out_dir)
    plot_feature_importance(model_results, out_dir)

    # ── Part B: Perception Space ──────────────────────────────────────────────
    print("\n── Part B: Perception Space (UMAP + t-SNE) ──")

    print("\nB1–B2. Building UMAP embedding...")
    umap_embedding, space_features, X_scaled = build_perception_space(master_gap)

    print("\nB2b. Building t-SNE embedding...")
    tsne_embedding = build_tsne_space(X_scaled)

    print("\nB3. Discovering perception subtypes (HDBSCAN on UMAP)...")
    subtype_labels = discover_perception_subtypes(umap_embedding)

    print("\nB3b. Validating cluster robustness...")
    cluster_metrics = evaluate_cluster_validity(
        X_scaled, umap_embedding, subtype_labels, master_gap, space_features
    )
    print(f"  Validation Status: {cluster_metrics['status']}")
    if cluster_metrics["status"] == "REJECTED":
        print("  [!] Clusters failed validation (weak separation, unstable, or artifact-driven).")
        print("      Consider relying strictly on the continuous GB model logic structure.")

    print("\nB4. Profiling subtypes...")
    subtype_profiles = profile_subtypes(master_gap, subtype_labels, space_features)
    print(f"\n{subtype_profiles.to_string()}")

    space_results = PerceptionSpaceResults(
        umap_embedding=umap_embedding,
        tsne_embedding=tsne_embedding,
        subtype_labels=subtype_labels,
        n_subtypes=len(set(subtype_labels)) - (1 if -1 in subtype_labels else 0),
        subtype_profiles=subtype_profiles,
        features_used=space_features,
        cluster_metrics=cluster_metrics,
    )

    # Part B visualizations — both UMAP and t-SNE
    print("\nB5. Generating UMAP visualizations...")
    _plot_embedding_suite(master_gap, umap_embedding, subtype_labels, out_dir,
                          method="umap", axis_prefix="UMAP")

    print("B5b. Generating t-SNE visualizations...")
    _plot_embedding_suite(master_gap, tsne_embedding, subtype_labels, out_dir,
                          method="tsne", axis_prefix="t-SNE")

    # ── Combine ───────────────────────────────────────────────────────────────
    # Add both embedding coordinates and subtypes to the gap df
    valid_idx = master_gap.dropna(subset=["gap_signed"]).index
    master_gap["umap_1"] = np.nan
    master_gap["umap_2"] = np.nan
    master_gap["tsne_1"] = np.nan
    master_gap["tsne_2"] = np.nan
    master_gap["perception_subtype"] = np.nan
    master_gap.loc[valid_idx, "umap_1"] = umap_embedding[:, 0]
    master_gap.loc[valid_idx, "umap_2"] = umap_embedding[:, 1]
    master_gap.loc[valid_idx, "tsne_1"] = tsne_embedding[:, 0]
    master_gap.loc[valid_idx, "tsne_2"] = tsne_embedding[:, 1]
    master_gap.loc[valid_idx, "perception_subtype"] = subtype_labels

    print(f"\n✓ Gap analysis complete. {len(os.listdir(out_dir))} files in {out_dir}")

    return GapAnalysisResults(
        distance=distance_results,
        space=space_results,
        gap_df=master_gap,
    )
