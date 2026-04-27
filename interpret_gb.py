import os
import numpy as np
import pandas as pd
from typing import List, Tuple, Dict, Any
from sklearn.inspection import permutation_importance
from sklearn.tree import DecisionTreeRegressor, export_text
import shap
import matplotlib.pyplot as plt

def run_permutation_importance(
    model: Any, X_val: np.ndarray, y_val: np.ndarray, feature_names: List[str]
) -> pd.DataFrame:
    """Computes global feature importance using random permutations."""
    result = permutation_importance(
        model, X_val, y_val, n_repeats=10, random_state=42, n_jobs=-1
    )
    print(f"      [DEBUG] len(feature_names) = {len(feature_names)}")
    print(f"      [DEBUG] len(result.importances_mean) = {len(result.importances_mean)}")
    try:
        importances = pd.DataFrame({
            "feature": list(feature_names),
            "importance_mean": result.importances_mean,
            "importance_std": result.importances_std
        }).sort_values("importance_mean", ascending=False)
    except Exception as e:
        print(f"      [DEBUG ERROR] {e}")
        raise
    
    return importances

def generate_shap_explanations(
    model: Any, X_val: np.ndarray, feature_names: List[str], out_dir: str
) -> None:
    """Generates and saves SHAP summary plots."""
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X_val)
    
    # 1. Standard summary plot (beeswarm)
    fig = plt.figure(figsize=(10, 8))
    shap.summary_plot(shap_values, X_val, feature_names=feature_names, show=False)
    plt.tight_layout()
    plt.savefig(os.path.join(out_dir, "gb_shap_summary.png"), dpi=200, bbox_inches="tight")
    plt.close(fig)
    
    # 2. Bar plot (global mean absolute SHAP)
    fig = plt.figure(figsize=(10, 8))
    shap.summary_plot(shap_values, X_val, feature_names=feature_names, plot_type="bar", show=False)
    plt.tight_layout()
    plt.savefig(os.path.join(out_dir, "gb_shap_bar.png"), dpi=200, bbox_inches="tight")
    plt.close(fig)

def extract_surrogate_rules(
    X_train: np.ndarray, 
    y_pred_train: np.ndarray, 
    feature_names: List[str],
    max_depth: int = 3
) -> str:
    """
    Fits a shallow Decision Tree to the GB model's predictions to extract human-readable 
    pseudo-regimes (interpretable rules).
    """
    surrogate = DecisionTreeRegressor(max_depth=max_depth, random_state=42)
    surrogate.fit(X_train, y_pred_train)
    
    rules_text = export_text(surrogate, feature_names=feature_names)
    return rules_text

from recalibration_scores import _compute_within_person_z, _add_phase_dummies, _add_temporal_features

def execute_gb_interpretability(
    gb_model: Any, 
    gb_imputer: Any, 
    gb_scaler: Any,
    train_df: pd.DataFrame, 
    val_df: pd.DataFrame, 
    feature_names: List[str],
    out_dir: str
) -> Dict[str, Any]:
    """
    Main orchestration function to run SHAP, Permutation Importance, and Surrogate tree extraction.
    NOTE: Dataframes must be pre-processed (z-scored, deltas, phase dummies) before extraction.
    """
    os.makedirs(out_dir, exist_ok=True)
    
    # Process train/val correctly to get the temporal and gap features
    dfs = {}
    for name, df in [("train", train_df), ("val", val_df)]:
        d = _compute_within_person_z(df, score_col="stress_score", self_report_col="stress")
        d = _add_phase_dummies(d)
        d = _add_temporal_features(d, score_col="stress_score", self_report_col="stress")
        # Ensure we drop NaNs in gap_signed to match model training rows
        dfs[name] = d.dropna(subset=["gap_signed"])
    
    tr_d = dfs["train"]
    vl_d = dfs["val"]
    
    # Ensure all features exist (e.g. missing columns)
    for f in feature_names:
        if f not in tr_d.columns:
            tr_d[f] = np.nan
        if f not in vl_d.columns:
            vl_d[f] = np.nan
            
    # Prepare datasets
    X_tr_raw = tr_d[feature_names].copy() # Let gb_imputer handle missing
    X_vl_raw = vl_d[feature_names].copy()
    
    y_vl = vl_d["gap_signed"].values
    
    X_tr = gb_scaler.transform(gb_imputer.transform(X_tr_raw))
    X_vl = gb_scaler.transform(gb_imputer.transform(X_vl_raw))
    
    # Only keep feature names that survived the imputer
    valid_features = [f for i, f in enumerate(feature_names) if not np.isnan(gb_imputer.statistics_[i])]
    
    print("\n  [GB Interpret] Running Permutation Importance...")
    perm_imp = run_permutation_importance(gb_model, X_vl, y_vl, valid_features)
    
    print("  [GB Interpret] Generating SHAP explanations...")
    generate_shap_explanations(gb_model, X_vl, valid_features, out_dir)
    
    print("  [GB Interpret] Extracting surrogate rules (pseudo-regimes)...")
    # Surrogate trains on GB's strictly predicted outputs on train data
    y_pred_tr = gb_model.predict(X_tr)
    # We pass the unscaled raw data to the tree so the rule thresholds are in original units (e.g., hr=65 instead of hr_scaled=0.1)
    # Wait, the pipeline actually passes scaled data to gb_model safely because the gb_imputer was trained on raw.
    # To get unscaled threshold names we should use X_tr_raw, but X_tr_raw has missing values (filled with 0).
    # Since it's a decision tree, raw values without NaN are better. Let's use gb_imputer output so there are no NaNs.
    X_tr_imputed = gb_imputer.transform(X_tr_raw)
    surrogate_rules = extract_surrogate_rules(X_tr_imputed, y_pred_tr, valid_features, max_depth=3)
    
    # Save rules
    rules_path = os.path.join(out_dir, "gb_surrogate_rules.txt")
    with open(rules_path, "w") as f:
        f.write("Global Gap Prediction Rules (Surrogate Decision Tree mapped to GB outputs)\n")
        f.write("=========================================================================\n\n")
        f.write(surrogate_rules)

    return {
        "permutation_importance": perm_imp,
        "surrogate_rules": surrogate_rules,
        "shap_summary_path": os.path.join(out_dir, "gb_shap_summary.png")
    }
