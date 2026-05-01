import json
import numpy as np
import pandas as pd
import os
from sklearn.ensemble import GradientBoostingRegressor, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer

# Paths
DATA_DIR = "/Users/kikkiliu/physionet.org/files/mcphases/data"
WEB_OUTPUT = "/Users/kikkiliu/female-health-wearable-data-monitor-platform/web_app/public/model_metadata_gb.json"

def tree_to_dict(tree, feature_names):
    """Recursively convert a sklearn DecisionTree to a dictionary."""
    tree_ = tree.tree_
    def recurse(node):
        if tree_.feature[node] != -2: # not a leaf
            return {
                "feature_idx": int(tree_.feature[node]),
                "feature_name": feature_names[int(tree_.feature[node])],
                "threshold": float(tree_.threshold[node]),
                "left": recurse(tree_.children_left[node]),
                "right": recurse(tree_.children_right[node]),
                "is_leaf": False
            }
        else:
            return {
                "value": float(tree_.value[node][0][0] if len(tree_.value[node].shape) > 2 else tree_.value[node][0]),
                "is_leaf": True
            }
    return recurse(0)

def gb_to_dict(model, feature_names):
    return [tree_to_dict(est[0], feature_names) for est in model.estimators_]

def export_gb_models_v2():
    print("🚀 TRAINING GAP-CENTRIC RECALIBRATION MODELS...")
    
    # 1. Load Data
    stress = pd.read_csv(os.path.join(DATA_DIR, "stress_score.csv"))
    hrv = pd.read_csv(os.path.join(DATA_DIR, "heart_rate_variability_details.csv"))
    rhr = pd.read_csv(os.path.join(DATA_DIR, "resting_heart_rate.csv"))
    hormones = pd.read_csv(os.path.join(DATA_DIR, "hormones_and_selfreport.csv"))
    temp = pd.read_csv(os.path.join(DATA_DIR, "wrist_temperature.csv"))

    # 2. Preprocess & Merge
    JOIN_KEYS = ["id", "day_in_study"]
    hrv_daily = hrv.groupby(JOIN_KEYS)["rmssd"].mean().reset_index()
    temp_daily = temp.groupby(JOIN_KEYS)["temperature_diff_from_baseline"].mean().reset_index()
    
    # LIKERT MAPPING (0-5)
    LIKERT_MAP = {"Not at all": 0, "Very Low/Little": 1, "Low": 2, "Moderate": 3, "High": 4, "Very High": 5}
    hormones["subjective_stress"] = hormones["stress"].map(LIKERT_MAP) * 20 # Map to 0-100
    
    master = hormones.merge(stress, on=JOIN_KEYS, how="inner")
    master = master.merge(rhr.rename(columns={"value": "resting_hr"}), on=JOIN_KEYS, how="inner")
    master = master.merge(hrv_daily, on=JOIN_KEYS, how="inner")
    master = master.merge(temp_daily, on=JOIN_KEYS, how="left")
    
    # CALCULATE GAP (Research Target)
    # Gap = Perception - Wearable
    master["gap_signed"] = master["subjective_stress"] - master["stress_score"]
    
    # 3. WITHIN-PERSON Z-SCORING (The core of the research)
    CENTER_COLS = ["resting_hr", "rmssd", "temperature_diff_from_baseline", "lh", "estrogen", "pdg"]
    master = master.dropna(subset=["gap_signed", "phase", "resting_hr", "rmssd"])
    
    # Calculate global stats for the UI to use as fallbacks
    global_means = master[CENTER_COLS].mean().to_dict()
    global_stds = master[CENTER_COLS].std().to_dict()
    
    # Perform within-person centering for training
    X = master.copy()
    for col in CENTER_COLS:
        pmean = X.groupby("id")[col].transform("mean")
        pstd = X.groupby("id")[col].transform("std").replace(0, 1)
        X[f"{col}_z"] = (X[col] - pmean) / pstd
    
    z_features = [f"{c}_z" for c in CENTER_COLS]
    
    # 4. TRAIN GAP PREDICTOR
    print(f"  Training Gap GB (Target: gap_signed)...")
    X_z = X[z_features].fillna(0) # 0 is the neutral Z-score (person's own mean)
    gb_gap = GradientBoostingRegressor(n_estimators=100, max_depth=3, learning_rate=0.1, random_state=42)
    gb_gap.fit(X_z, X["gap_signed"])
    
    # 5. TRAIN PHASE CLASSIFIER (using Z-scores)
    print(f"  Training Phase GB...")
    phase_map = {"menstrual": 0, "follicular": 1, "fertility": 2, "luteal": 3}
    y_phase = X["phase"].str.lower().map(phase_map)
    mask = y_phase.notna()
    gb_phase = GradientBoostingClassifier(n_estimators=100, max_depth=3, learning_rate=0.1, random_state=42)
    gb_phase.fit(X_z[mask], y_phase[mask])

    # 6. EXPORT
    priors = gb_phase.init_.class_prior_
    log_priors = np.log(priors).tolist()

    output = {
        "metadata": {
            "features": CENTER_COLS,
            "z_features": z_features,
            "global_means": global_means,
            "global_stds": global_stds,
            "phase_labels": ["Menstrual", "Follicular", "Fertility", "Luteal"],
            "learning_rate": 0.1,
            "intercept_gap": float(gb_gap.init_.constant_[0][0]),
            "intercept_phase": log_priors,
        },
        "gap_trees": gb_to_dict(gb_gap, z_features),
        "phase_trees": []
    }
    
    phase_trees = []
    for i in range(gb_phase.n_estimators_):
        iteration_trees = []
        for j in range(gb_phase.n_classes_):
            iteration_trees.append(tree_to_dict(gb_phase.estimators_[i, j], z_features))
        phase_trees.append(iteration_trees)
    output["phase_trees"] = phase_trees

    with open(WEB_OUTPUT, 'w') as f:
        json.dump(output, f)
    
    print(f"✅ GAP-CENTRIC MODELS EXPORTED TO {WEB_OUTPUT}")

if __name__ == "__main__":
    export_gb_models_v2()
