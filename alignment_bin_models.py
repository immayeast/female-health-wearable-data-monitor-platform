#!/usr/bin/env python
# coding: utf-8



"""Alignment-bin modeling with and without wearable stress score.

This script expects preprocessed train/val/test dataframes similar to the existing
mcPHASES pipeline. It builds supervised classifiers for alignment bins, compares
score-aware vs blind-context variants, and reports Pearson correlations before
modeling.

Usage:
    from alignment_bin_models import run_alignment_bin_experiment
    results = run_alignment_bin_experiment(train_df, val_df, test_df)
"""




from __future__ import annotations




from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple




import numpy as np
import pandas as pd
from scipy.stats import pearsonr
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier




RANDOM_STATE = 42




DEFAULT_SELF_REPORT_COLS = ["stress", "fatigue", "mood_score", "somatic_score"]
DEFAULT_WEARABLE_SCORE_COL = "stress_score"
DEFAULT_PHASE_COL = "phase"
DEFAULT_ID_COL = "id"




@dataclass
class AlignmentModelResult:
    name: str
    include_wearable_score: bool
    accuracy: float
    macro_f1: float
    report: str
    confusion: np.ndarray




def _first_existing(df: pd.DataFrame, cols: List[str]) -> Optional[str]:
    for c in cols:
        if c in df.columns:
            return c
    return None




def infer_alignment_reference(df: pd.DataFrame) -> str:
    col = _first_existing(df, DEFAULT_SELF_REPORT_COLS)
    if col is None:
        raise ValueError(
            "No self-report alignment column found. Expected one of: "
            + ", ".join(DEFAULT_SELF_REPORT_COLS)
        )
    return col




def build_alignment_label(
    df: pd.DataFrame,
    self_report_col: str,
    wearable_score_col: str = DEFAULT_WEARABLE_SCORE_COL,
    mode: str = "three_bin",
) -> pd.DataFrame:
    """Create alignment target from self-report vs wearable stress score.

    Both variables are z-scored within the provided dataframe. This keeps the
    label definition scale-agnostic and suitable for exploratory modeling.

    mode:
        - "binary": aligned (0) vs misaligned (1)
        - "three_bin": underestimation / aligned / overestimation
    """
    out = df.copy()
    if self_report_col not in out.columns or wearable_score_col not in out.columns:
        raise ValueError("Missing self-report or wearable score column for alignment label construction.")

    likert_map = {
        "Not at all": 0,
        "Very Low/Little": 1,
        "Low": 2,
        "Moderate": 3,
        "High": 4,
        "Very High": 5
    }

    # clean inputs
    out[self_report_col] = out[self_report_col].replace(likert_map)
    out[self_report_col] = pd.to_numeric(out[self_report_col], errors="coerce")
    out[wearable_score_col] = pd.to_numeric(out[wearable_score_col], errors="coerce")

    # if failed calculations exist, invalidate stress score
    if "calculation_failed" in out.columns:
        failed = out["calculation_failed"].fillna(False).astype(bool)
        out.loc[failed, wearable_score_col] = np.nan

    usable = out[[self_report_col, wearable_score_col]].dropna().index
    out["alignment_bin"] = np.nan
    out["alignment_diff"] = np.nan

    if len(usable) == 0:
        return out

    sr = out.loc[usable, self_report_col]
    ws = out.loc[usable, wearable_score_col]

    # z-score each side
    sr_z = (sr - sr.mean()) / (sr.std(ddof=0) + 1e-8)
    ws_z = (ws - ws.mean()) / (ws.std(ddof=0) + 1e-8)

    diff = sr_z - ws_z
    out.loc[usable, "alignment_diff"] = diff

    if mode == "binary":
        out.loc[usable, "alignment_bin"] = (diff.abs() > 0.5).astype(int)
    elif mode == "three_bin":
        out.loc[usable[diff.abs() <= 0.5], "alignment_bin"] = "aligned"
        out.loc[usable[diff > 0.5], "alignment_bin"] = "self_higher"
        out.loc[usable[diff < -0.5], "alignment_bin"] = "wearable_higher"
    else:
        raise ValueError("mode must be 'binary' or 'three_bin'")

    return out




def compute_pearson_diagnostics(
    df: pd.DataFrame,
    self_report_col: str,
    wearable_score_col: str = DEFAULT_WEARABLE_SCORE_COL,
    id_col: str = DEFAULT_ID_COL,
) -> Dict[str, float]:
    tmp = df[[self_report_col, wearable_score_col]].apply(pd.to_numeric, errors="coerce").dropna()
    if len(tmp) < 3:
        global_r = np.nan
    else:
        global_r = pearsonr(tmp[self_report_col], tmp[wearable_score_col]).statistic

    by_person = []
    if id_col in df.columns:
        for _, grp in df.groupby(id_col):
            g = grp[[self_report_col, wearable_score_col]].apply(pd.to_numeric, errors="coerce").dropna()
            if len(g) >= 3 and g[self_report_col].std(ddof=0) > 0 and g[wearable_score_col].std(ddof=0) > 0:
                by_person.append(pearsonr(g[self_report_col], g[wearable_score_col]).statistic)

    return {
        "global_pearson_r": float(global_r) if pd.notna(global_r) else np.nan,
        "mean_person_pearson_r": float(np.mean(by_person)) if by_person else np.nan,
        "median_person_pearson_r": float(np.median(by_person)) if by_person else np.nan,
        "n_person_correlations": int(len(by_person)),
    }




def default_feature_pool(df: pd.DataFrame, include_wearable_score: bool) -> List[str]:
    candidate_cols = [
        c for c in [
            "resting_hr", "calories", "steps", "distance", "sedentary", "lightly", "moderately", "very",
            "glucose_value_mean", "glucose_value_std", "temperature_diff_from_baseline", "nightly_temperature",
            "full_sleep_breathing_rate", "demographic_vo2_max", "lh", "estrogen", "pdg",
            "rmssd", "rmssd_mean", "low_frequency_mean", "high_frequency_mean", "coverage_mean",
            "overall_score", "deep_sleep_in_minutes", "restlessness", "composition_score",
            "revitalization_score", "duration_score", "age", "bmi", "age_of_first_menarche",
            "somatic_score", "mood_score", "craving_score", "phase"
        ] if c in df.columns
    ]

    centered = [
        c for c in df.columns
        if c.endswith("_c") and pd.api.types.is_numeric_dtype(df[c])
    ]

    phase_dummies = [
        c for c in df.columns
        if c.startswith("phase_") and pd.api.types.is_numeric_dtype(df[c])
    ]

    blacklist = {
        "phase_raw", "phase_inferred",
        "id", "day_in_study", "study_interval"
    }

    features = list(dict.fromkeys(candidate_cols + centered + phase_dummies))

    if include_wearable_score and DEFAULT_WEARABLE_SCORE_COL in df.columns:
        features.append(DEFAULT_WEARABLE_SCORE_COL)

    features = [c for c in features if c in df.columns and c not in blacklist]

    return features




def make_classifier(model_name: str):
    if model_name == "logreg":
        return LogisticRegression(max_iter=3000, class_weight="balanced", random_state=RANDOM_STATE)
    if model_name == "rf":
        return RandomForestClassifier(
            n_estimators=400,
            max_depth=None,
            min_samples_leaf=3,
            class_weight="balanced_subsample",
            random_state=RANDOM_STATE,
            n_jobs=-1,
        )
    if model_name == "gb":
        return GradientBoostingClassifier(random_state=RANDOM_STATE)
    raise ValueError("Unknown model name")




def build_pipeline(df: pd.DataFrame, feature_cols: List[str], model_name: str) -> Pipeline:
    usable = [c for c in feature_cols if c in df.columns]

    numeric_features = []
    categorical_features = []

    for c in usable:
        if pd.api.types.is_numeric_dtype(df[c]):
            numeric_features.append(c)
        else:
            categorical_features.append(c)

    print("\n[PIPELINE DEBUG]")
    print("Numeric features:", numeric_features[:20], "..." if len(numeric_features) > 20 else "")
    print("Categorical features:", categorical_features)

    transformers = []

    if numeric_features:
        transformers.append(
            (
                "num",
                Pipeline([
                    ("imputer", SimpleImputer(strategy="median")),
                    ("scaler", StandardScaler()),
                ]),
                numeric_features,
            )
        )

    if categorical_features:
        transformers.append(
            (
                "cat",
                Pipeline([
                    ("imputer", SimpleImputer(strategy="most_frequent")),
                    ("onehot", OneHotEncoder(handle_unknown="ignore")),
                ]),
                categorical_features,
            )
        )

    pre = ColumnTransformer(
        transformers=transformers,
        remainder="drop",
    )

    return Pipeline([
        ("pre", pre),
        ("clf", make_classifier(model_name)),
    ])




def prepare_split(
    df: pd.DataFrame,
    feature_cols: List[str],
    target_col: str = "alignment_bin",
) -> Tuple[pd.DataFrame, pd.Series]:
    cols = [c for c in feature_cols if c in df.columns] + [target_col]
    sub = df[cols].copy()
    sub = sub.dropna(subset=[target_col])
    X = sub[[c for c in feature_cols if c in sub.columns]].copy()
    y = sub[target_col].copy()
    return X, y




def fit_and_eval_single(
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
    test_df: pd.DataFrame,
    include_wearable_score: bool,
    model_name: str,
) -> AlignmentModelResult:
    features = default_feature_pool(train_df, include_wearable_score)
    pipe = build_pipeline(train_df, features, model_name=model_name)

    X_train, y_train = prepare_split(train_df, features)
    X_val, y_val = prepare_split(val_df, features)
    X_test, y_test = prepare_split(test_df, features)

    # fit once on train; user can later refit on train+val if desired
    pipe.fit(X_train, y_train)

    # pick report metric on test for clean held-out comparison
    y_pred = pipe.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    macro = f1_score(y_test, y_pred, average="macro")
    rep = classification_report(y_test, y_pred, digits=3)
    cm = confusion_matrix(y_test, y_pred)

    return AlignmentModelResult(
        name=model_name,
        include_wearable_score=include_wearable_score,
        accuracy=float(acc),
        macro_f1=float(macro),
        report=rep,
        confusion=cm,
    )




def run_alignment_bin_experiment(
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
    test_df: pd.DataFrame,
    self_report_col: Optional[str] = None,
    wearable_score_col: str = DEFAULT_WEARABLE_SCORE_COL,
    label_mode: str = "three_bin",
) -> Dict[str, object]:
    self_report_col = self_report_col or infer_alignment_reference(train_df)

    train_l = build_alignment_label(train_df, self_report_col, wearable_score_col, mode=label_mode)
    val_l = build_alignment_label(val_df, self_report_col, wearable_score_col, mode=label_mode)
    test_l = build_alignment_label(test_df, self_report_col, wearable_score_col, mode=label_mode)

    pearson = {
        "train": compute_pearson_diagnostics(train_l, self_report_col, wearable_score_col),
        "val": compute_pearson_diagnostics(val_l, self_report_col, wearable_score_col),
        "test": compute_pearson_diagnostics(test_l, self_report_col, wearable_score_col),
    }

    results: List[AlignmentModelResult] = []
    for include_score in [False, True]:
        for model_name in ["logreg", "rf", "gb"]:
            results.append(
                fit_and_eval_single(train_l, val_l, test_l, include_score, model_name)
            )

    result_rows = pd.DataFrame([
        {
            "model": r.name,
            "include_wearable_score": r.include_wearable_score,
            "accuracy": r.accuracy,
            "macro_f1": r.macro_f1,
        }
        for r in results
    ]).sort_values(["macro_f1", "accuracy"], ascending=False)

    return {
        "self_report_col": self_report_col,
        "pearson": pearson,
        "results_table": result_rows,
        "detailed_results": results,
        "train_labeled": train_l,
        "val_labeled": val_l,
        "test_labeled": test_l,
    }





