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
    """Convert a GradientBoosting ensemble to a list of tree dicts."""
    return [tree_to_dict(est[0], feature_names) for est in model.estimators_]

def export_gb_models():
    print("🚀 Training and Exporting High-Fidelity GB Models...")
    
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
    
    master = hormones.merge(stress, on=JOIN_KEYS, how="inner")
    master = master.merge(rhr.rename(columns={"value": "resting_hr"}), on=JOIN_KEYS, how="inner")
    master = master.merge(hrv_daily, on=JOIN_KEYS, how="inner")
    master = master.merge(temp_daily, on=JOIN_KEYS, how="left")
    
    # Feature set for both models
    features = ["resting_hr", "rmssd", "temperature_diff_from_baseline", "lh", "estrogen", "pdg"]
    master = master.dropna(subset=["stress_score", "phase", "resting_hr", "rmssd"]) 
    
    X = master[features]
    y_stress = master["stress_score"]
    
    # Map phases to numeric for classifier
    phase_map = {"menstrual": 0, "follicular": 1, "fertility": 2, "luteal": 3}
    y_phase = master["phase"].str.lower().map(phase_map)
    mask = y_phase.notna()
    X_phase, y_phase = X[mask], y_phase[mask]

    # 3. Train Models
    imp = SimpleImputer(strategy="median").fit(X)
    X_imp = imp.transform(X)
    X_phase_imp = imp.transform(X_phase)
    
    sc = StandardScaler().fit(X_imp)
    X_sc = sc.transform(X_imp)
    X_phase_sc = sc.transform(X_phase_imp)

    print(f"  Training Stress GB (n=100)...")
    gb_stress = GradientBoostingRegressor(n_estimators=100, max_depth=3, learning_rate=0.1, random_state=42)
    gb_stress.fit(X_sc, y_stress)

    print(f"  Training Phase GB (n=100)...")
    gb_phase = GradientBoostingClassifier(n_estimators=100, max_depth=3, learning_rate=0.1, random_state=42)
    gb_phase.fit(X_phase_sc, y_phase)

    # 4. Export
    output = {
        "metadata": {
            "features": features,
            "means": dict(zip(features, imp.statistics_.tolist())),
            "stds": dict(zip(features, sc.scale_.tolist())),
            "phase_labels": ["Menstrual", "Follicular", "Fertility", "Luteal"],
            "learning_rate": 0.1,
            "intercept_stress": float(gb_stress.init_.constant_[0][0]),
        },
        "stress_trees": gb_to_dict(gb_stress, features),
        "phase_trees": [] 
    }
    
    phase_trees = []
    for i in range(gb_phase.n_estimators_):
        iteration_trees = []
        for j in range(gb_phase.n_classes_):
            iteration_trees.append(tree_to_dict(gb_phase.estimators_[i, j], features))
        phase_trees.append(iteration_trees)
    
    output["phase_trees"] = phase_trees
    output["intercept_phase"] = gb_phase.init_.class_prior_.tolist()

    with open(WEB_OUTPUT, 'w') as f:
        json.dump(output, f)
    
    print(f"✅ Success! High-fidelity models exported to {WEB_OUTPUT}")

if __name__ == "__main__":
    export_gb_models()
