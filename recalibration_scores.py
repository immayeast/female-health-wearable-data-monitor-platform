"""Phase-aware and model-based recalibration for wearable stress/sleep scores.

This module recalibrates raw wearable scores using a Gradient Boosting model
that predicts the perception–physiology gap (within-person z-scored).

The key insight (from gap analysis): the perception gap is 100% state-dependent
(ICC=0) and not phase-driven (ANOVA p=0.61). Therefore, static phase offsets
are ineffective. Instead, we use a GB model trained on daily physiological
features to predict the gap and shift the wearable score accordingly.

Recalibration formula:
    z_adjusted = z_wearable + predicted_gap
    adjusted_score = person_mean + z_adjusted × person_std

Usage:
    from recalibration_scores import run_recalibration_pipeline
    adjusted_df, artifacts = run_recalibration_pipeline(
        master_df, train_df, val_df,
        score_col="stress_score", self_report_col="stress"
    )
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler

RANDOM_STATE = 42
PHASE_ORDER = ["menstrual", "follicular", "fertility", "luteal"]


@dataclass
class RecalibrationArtifacts:
    # Clustering (retained for profiling / visualisation)
    cluster_features: List[str]
    imputer: SimpleImputer
    scaler: StandardScaler
    pca: PCA
    kmeans: KMeans
    # Person baselines
    person_baseline: pd.Series      # person-mean of wearable score
    person_std: pd.Series           # person-std of wearable score
    # GB gap model
    gb_model: GradientBoostingRegressor
    gb_imputer: SimpleImputer
    gb_scaler: StandardScaler
    gb_features: List[str]
    gb_val_r2: float
    # Legacy offsets (kept for comparison / diagnostics)
    phase_offset: pd.Series
    cluster_offset: pd.Series


# ═══════════════════════════════════════════════════════════════════════════════
# CLUSTERING (unchanged — used for profiling, not recalibration)
# ═══════════════════════════════════════════════════════════════════════════════

def default_cluster_features(df: pd.DataFrame) -> List[str]:
    candidates = [
        "lh", "estrogen", "pdg",
        "rmssd", "rmssd_mean", "low_frequency_mean", "high_frequency_mean", "coverage_mean",
        "resting_hr",
        "temperature_diff_from_baseline", "nightly_temperature",
        "full_sleep_breathing_rate",
        "calories", "steps", "moderately", "very",
        "somatic_score", "mood_score", "craving_score",
        "overall_score", "stress_score",
    ]
    centered = [c for c in df.columns if c.endswith("_c")]
    feats = [c for c in candidates if c in df.columns]
    return list(dict.fromkeys(feats + centered))


def build_state_clusters(df: pd.DataFrame, n_clusters: int = 6) -> Tuple[pd.DataFrame, Dict[str, object]]:
    cluster_features = default_cluster_features(df)
    work = df.copy()

    X = work[cluster_features]
    imp = SimpleImputer(strategy="median")
    sc = StandardScaler()

    X_imp = imp.fit_transform(X)
    X_sc = sc.fit_transform(X_imp)

    n_components = min(8, X_sc.shape[1]) if X_sc.shape[1] > 1 else 1
    pca = PCA(n_components=n_components, random_state=RANDOM_STATE)
    X_latent = pca.fit_transform(X_sc)

    km = KMeans(n_clusters=n_clusters, random_state=RANDOM_STATE, n_init=20)
    work["state_cluster"] = km.fit_predict(X_latent)

    return work, {
        "cluster_features": cluster_features,
        "imputer": imp,
        "scaler": sc,
        "pca": pca,
        "kmeans": km,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# LEGACY ADDITIVE OFFSETS (retained for diagnostics / comparison)
# ═══════════════════════════════════════════════════════════════════════════════

def shrink_mean(group: pd.Series, global_mean: float, k: float = 50.0, min_n: int = 20) -> float:
    n = len(group)
    if n < min_n:
        return float(global_mean)
    group_mean = group.mean()
    return float((n * group_mean + k * global_mean) / (n + k))


def estimate_legacy_offsets(
    df: pd.DataFrame,
    score_col: str,
    id_col: str = "id",
    phase_col: str = "phase",
    shrink_k: float = 50.0,
) -> Dict[str, pd.Series]:
    """Compute legacy additive offsets (person + phase + cluster).
    Retained for comparison — NOT used in primary recalibration."""
    work = df.copy().dropna(subset=[score_col, id_col, phase_col, "state_cluster"])

    person_baseline = work.groupby(id_col)[score_col].mean().rename("person_baseline")
    work = work.merge(person_baseline.reset_index(), on=id_col, how="left")

    work["resid_after_person"] = work[score_col] - work["person_baseline"]
    global_phase_mean = work["resid_after_person"].mean()
    phase_offset = work.groupby(phase_col)["resid_after_person"].apply(
        lambda g: shrink_mean(g, global_phase_mean, k=shrink_k)
    ).rename("phase_offset")

    work = work.merge(phase_offset.reset_index(), on=phase_col, how="left")
    work["resid_after_phase"] = work[score_col] - work["person_baseline"] - work["phase_offset"]

    global_cluster_mean = work["resid_after_phase"].mean()
    cluster_offset = work.groupby("state_cluster")["resid_after_phase"].apply(
        lambda g: shrink_mean(g, global_cluster_mean, k=shrink_k)
    ).rename("cluster_offset")

    return {
        "person_baseline": person_baseline,
        "phase_offset": phase_offset,
        "cluster_offset": cluster_offset,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# GB GAP MODEL — PRIMARY RECALIBRATION
# ═══════════════════════════════════════════════════════════════════════════════

def _gap_model_features(df: pd.DataFrame) -> List[str]:
    """Feature pool for the GB gap model (excludes wearable score to avoid leakage)."""
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
        # Phase dummies
        "phase_menstrual", "phase_follicular", "phase_fertility", "phase_luteal",
    ]
    centered = [c for c in df.columns if c.endswith("_c")]
    return [c for c in (candidates + centered) if c in df.columns]


def _compute_within_person_z(
    df: pd.DataFrame,
    score_col: str,
    self_report_col: str,
    id_col: str = "id",
    min_obs: int = 5,
) -> pd.DataFrame:
    """Compute within-person z-scores for both wearable and self-report."""
    out = df.copy()
    out[self_report_col] = pd.to_numeric(out[self_report_col], errors="coerce")
    out[score_col] = pd.to_numeric(out[score_col], errors="coerce")

    out["z_self_report"] = np.nan
    out["z_wearable"] = np.nan
    out["gap_signed"] = np.nan

    paired_mask = out[self_report_col].notna() & out[score_col].notna()

    for pid, grp in out[paired_mask].groupby(id_col):
        if len(grp) < min_obs:
            continue
        idx = grp.index

        sr = grp[self_report_col]
        sr_std = sr.std(ddof=1)
        z_sr = (sr - sr.mean()) / (sr_std if sr_std > 0 else 1.0)

        ws = grp[score_col]
        ws_std = ws.std(ddof=1)
        z_ws = (ws - ws.mean()) / (ws_std if ws_std > 0 else 1.0)

        out.loc[idx, "z_self_report"] = z_sr
        out.loc[idx, "z_wearable"] = z_ws
        out.loc[idx, "gap_signed"] = z_sr - z_ws

    return out


def _add_phase_dummies(df: pd.DataFrame) -> pd.DataFrame:
    """Add phase dummy columns if not already present."""
    out = df.copy()
    if "phase" in out.columns:
        for phase in PHASE_ORDER:
            col = f"phase_{phase}"
            if col not in out.columns:
                out[col] = (out["phase"] == phase).astype(int)
    return out


def _add_temporal_features(
    df: pd.DataFrame,
    score_col: str,
    self_report_col: str,
    id_col: str = "id",
    day_col: str = "day_in_study",
) -> pd.DataFrame:
    """Add lag and delta features for the gap model."""
    out = df.copy().sort_values([id_col, day_col])

    # Gap lags (within person)
    if "gap_signed" in out.columns:
        for lag in [1, 2]:
            col = f"gap_lag{lag}"
            if col not in out.columns:
                out[col] = out.groupby(id_col)["gap_signed"].shift(lag)

        if "gap_rolling3" not in out.columns:
            out["gap_rolling3"] = (
                out.groupby(id_col)["gap_signed"]
                .transform(lambda x: x.rolling(3, min_periods=2).mean())
            )

    # Score deltas
    if "stress_score_delta" not in out.columns and score_col in out.columns:
        out["stress_score_delta"] = out.groupby(id_col)[score_col].diff()
    if "self_report_delta" not in out.columns and self_report_col in out.columns:
        out["self_report_delta"] = out.groupby(id_col)[self_report_col].diff()

    return out


def train_gap_model(
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
    score_col: str,
    self_report_col: str,
) -> Tuple[GradientBoostingRegressor, SimpleImputer, StandardScaler, List[str], float]:
    """Train a GB model to predict the perception–physiology gap.

    Returns: (model, imputer, scaler, feature_names, val_r2)
    """
    from sklearn.metrics import r2_score

    # Prepare both splits
    dfs = {}
    for name, df in [("train", train_df), ("val", val_df)]:
        d = _compute_within_person_z(df, score_col, self_report_col)
        d = _add_phase_dummies(d)
        d = _add_temporal_features(d, score_col, self_report_col)
        dfs[name] = d

    features = _gap_model_features(dfs["train"])
    # Also include temporal features if present
    for extra in ["gap_lag1", "gap_lag2", "gap_rolling3",
                   "stress_score_delta", "self_report_delta"]:
        if extra in dfs["train"].columns and extra not in features:
            features.append(extra)

    features = [f for f in features
                if f in dfs["train"].columns and f in dfs["val"].columns]

    # Extract X, y
    tr = dfs["train"][features + ["gap_signed"]].dropna(subset=["gap_signed"])
    vl = dfs["val"][features + ["gap_signed"]].dropna(subset=["gap_signed"])

    if len(tr) < 20:
        print(f"  ⚠️  Only {len(tr)} training rows with paired gap data")

    Xtr = tr[features].values
    ytr = tr["gap_signed"].values
    Xvl = vl[features].values
    yvl = vl["gap_signed"].values

    # Impute + scale
    imp = SimpleImputer(strategy="median").fit(Xtr)
    sc = StandardScaler().fit(imp.transform(Xtr))
    Xtr_s = sc.transform(imp.transform(Xtr))
    Xvl_s = sc.transform(imp.transform(Xvl))

    # Train
    gb = GradientBoostingRegressor(
        n_estimators=200, max_depth=4, learning_rate=0.05,
        random_state=RANDOM_STATE,
    )
    gb.fit(Xtr_s, ytr)

    # Evaluate
    ypred = gb.predict(Xvl_s)
    val_r2 = float(r2_score(yvl, ypred))
    
    print(f"  GB gap model: train={len(tr)}, val={len(vl)}, "
          f"val R²={val_r2:.3f}, features={len(features)}")

    return gb, imp, sc, features, val_r2


def apply_gb_recalibration(
    df: pd.DataFrame,
    score_col: str,
    self_report_col: str,
    gb_model: GradientBoostingRegressor,
    gb_imputer: SimpleImputer,
    gb_scaler: StandardScaler,
    gb_features: List[str],
    id_col: str = "id",
) -> pd.DataFrame:
    """Apply the GB gap model to recalibrate wearable scores.

    For each observation:
        1. Predict the gap: predicted_gap = GB(features)
        2. Shift z-scored wearable: z_adjusted = z_wearable + predicted_gap
        3. Convert back to natural scale: adjusted = person_mean + z_adjusted × person_std
    """
    work = df.copy()
    work = _add_phase_dummies(work)
    work = _compute_within_person_z(work, score_col, self_report_col)
    work = _add_temporal_features(work, score_col, self_report_col)

    # Person statistics for back-conversion
    person_stats = (
        work.dropna(subset=[score_col])
        .groupby(id_col)[score_col]
        .agg(["mean", "std"])
        .rename(columns={"mean": "person_mean_score", "std": "person_std_score"})
    )
    work = work.merge(person_stats, on=id_col, how="left")
    overall_mean = work[score_col].mean()
    overall_std = work[score_col].std()
    work["person_mean_score"] = work["person_mean_score"].fillna(overall_mean)
    work["person_std_score"] = work["person_std_score"].fillna(overall_std)
    # Prevent div-by-zero
    work.loc[work["person_std_score"] == 0, "person_std_score"] = overall_std

    # Predict gap
    feats_available = [f for f in gb_features if f in work.columns]
    X = work[feats_available].copy()

    # Handle missing features (fill with 0 — will be imputed by the pipeline's imputer)
    for f in gb_features:
        if f not in X.columns:
            X[f] = np.nan
    X = X[gb_features]  # reorder

    X_imp = gb_imputer.transform(X)
    X_sc = gb_scaler.transform(X_imp)
    work["predicted_gap"] = gb_model.predict(X_sc)

    # Recalibrate
    # z_adjusted = z_wearable + predicted_gap
    # adjusted_score = person_mean + z_adjusted × person_std
    has_z = work["z_wearable"].notna()
    work["z_adjusted"] = np.nan
    work.loc[has_z, "z_adjusted"] = (
        work.loc[has_z, "z_wearable"] + work.loc[has_z, "predicted_gap"]
    )
    work["adjusted_score"] = (
        work["person_mean_score"]
        + work["z_adjusted"] * work["person_std_score"]
    )

    # For rows without paired data (no z_wearable), fall back to raw score
    no_z = work["z_adjusted"].isna() & work[score_col].notna()
    work.loc[no_z, "adjusted_score"] = work.loc[no_z, score_col]

    # Context deviation (how far the raw score was from the model-expected value)
    work["context_deviation"] = work[score_col] - work["adjusted_score"]

    return work


# ═══════════════════════════════════════════════════════════════════════════════
# ORCHESTRATOR
# ═══════════════════════════════════════════════════════════════════════════════

def run_recalibration_pipeline(
    df: pd.DataFrame,
    score_col: str,
    train_df: Optional[pd.DataFrame] = None,
    val_df: Optional[pd.DataFrame] = None,
    self_report_col: str = "stress",
    n_clusters: int = 6,
    shrink_k: float = 50.0,
) -> Tuple[pd.DataFrame, RecalibrationArtifacts]:
    """Run the full recalibration pipeline.

    If train_df/val_df are provided, the GB gap model is trained on the split.
    If not, the model is trained on an 80/20 random split of df (for backward compat).
    """
    # ── Clustering (for profiling) ────────────────────────────────────────────
    clustered_df, cluster_artifacts = build_state_clusters(df, n_clusters=n_clusters)

    # ── Legacy offsets (for diagnostics) ──────────────────────────────────────
    legacy = estimate_legacy_offsets(clustered_df, score_col=score_col, shrink_k=shrink_k)

    # ── GB gap model ──────────────────────────────────────────────────────────
    if train_df is None or val_df is None:
        # Backward compatibility: split df randomly by person
        pids = df["id"].unique()
        np.random.seed(RANDOM_STATE)
        np.random.shuffle(pids)
        split = int(len(pids) * 0.8)
        train_df = df[df["id"].isin(pids[:split])].copy()
        val_df = df[df["id"].isin(pids[split:])].copy()
        print(f"  Auto-split: {len(pids[:split])} train / {len(pids[split:])} val participants")

    gb_model, gb_imp, gb_sc, gb_features, gb_val_r2 = train_gap_model(
        train_df, val_df, score_col, self_report_col
    )

    # ── Apply recalibration ───────────────────────────────────────────────────
    adjusted_df = apply_gb_recalibration(
        clustered_df, score_col, self_report_col,
        gb_model, gb_imp, gb_sc, gb_features
    )

    # ── Build artifacts ───────────────────────────────────────────────────────
    person_baseline = legacy["person_baseline"]
    person_std = (
        adjusted_df.dropna(subset=[score_col])
        .groupby("id")[score_col]
        .std()
        .rename("person_std")
    )

    artifacts = RecalibrationArtifacts(
        cluster_features=cluster_artifacts["cluster_features"],
        imputer=cluster_artifacts["imputer"],
        scaler=cluster_artifacts["scaler"],
        pca=cluster_artifacts["pca"],
        kmeans=cluster_artifacts["kmeans"],
        person_baseline=person_baseline,
        person_std=person_std,
        gb_model=gb_model,
        gb_imputer=gb_imp,
        gb_scaler=gb_sc,
        gb_features=gb_features,
        gb_val_r2=gb_val_r2,
        phase_offset=legacy["phase_offset"],
        cluster_offset=legacy["cluster_offset"],
    )

    return adjusted_df, artifacts
