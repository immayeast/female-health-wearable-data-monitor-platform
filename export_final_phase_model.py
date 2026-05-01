import json
import numpy as np
import pandas as pd
import os
from sklearn.ensemble import RandomForestClassifier
from final_model import add_day_in_cycle, apply_imputation, create_sliding_windows

# Configuration
OLD_DATA_DIR = "/Users/kikkiliu/physionet.org/files/mcphases/data"
WEB_OUTPUT = "/Users/kikkiliu/female-health-wearable-data-monitor-platform/web_app/public/research_model.json"
WINDOW_SIZE = 7

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
            # For classification, we return the class index (the one with the max value)
            # tree_.value[node] shape is (1, n_classes)
            return {
                "value": int(np.argmax(tree_.value[node][0])),
                "is_leaf": True
            }
    return recurse(0)

def rf_to_dict(model, feature_names):
    return [tree_to_dict(est, feature_names) for est in model.estimators_]

def train_and_export_final():
    print("🚀 STAGE 1: LOADING DATA FOR FINAL PHASE MODEL...")
    # Load hormones for base structure
    df_old = pd.read_csv(os.path.join(OLD_DATA_DIR, 'hormones_and_selfreport.csv')).dropna(subset=['phase'])
    df_old['phase'] = df_old['phase'].str.strip().str.lower()
    
    # Merge required wearable data
    hr = pd.read_csv(os.path.join(OLD_DATA_DIR, 'heart_rate.csv')).groupby(['id', 'day_in_study'])['bpm'].agg(hr_mean='mean').reset_index()
    temp = pd.read_csv(os.path.join(OLD_DATA_DIR, 'wrist_temperature.csv')).groupby(['id', 'day_in_study'])['temperature_diff_from_baseline'].mean().reset_index().rename(columns={'temperature_diff_from_baseline': 'temp_diff'})
    rhr = pd.read_csv(os.path.join(OLD_DATA_DIR, 'resting_heart_rate.csv')).groupby(['id', 'day_in_study'])['value'].mean().reset_index().rename(columns={'value': 'resting_hr'})
    hrv = pd.read_csv(os.path.join(OLD_DATA_DIR, 'heart_rate_variability_details.csv')).groupby(['id', 'day_in_study'])['rmssd'].mean().reset_index().rename(columns={'rmssd': 'hrv_rmssd'})
    
    for frame in [hr, temp, rhr, hrv]:
        df_old = df_old.merge(frame, on=['id', 'day_in_study'], how='left')

    feature_cols = ['hr_mean', 'temp_diff', 'resting_hr', 'hrv_rmssd']
    df_old = apply_imputation(df_old, feature_cols)
    
    print(f"🚀 STAGE 2: EXTRACTING WINDOWS (W={WINDOW_SIZE})...")
    # Encode labels
    phase_map = {'menstrual': 0, 'follicular': 1, 'fertility': 2, 'luteal': 3}
    df_old['phase_encoded'] = df_old['phase'].map(phase_map)
    df_old = df_old.dropna(subset=['phase_encoded'])
    
    X, y, feature_names = create_sliding_windows(df_old, feature_cols, WINDOW_SIZE)
    
    print("🚀 STAGE 3: TRAINING RANDOM FOREST CLASSIFIER...")
    rf = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1)
    rf.fit(X, y)
    
    # Also train a simple Regressor for the Gap (for now)
    # Gap = Stress_Score (synthetic)
    # We'll use the same windowed features
    print("🚀 STAGE 4: EXPORTING TO JSON...")
    
    output = {
        "phase_model": {
            "type": "random_forest_classifier",
            "feature_names": feature_names,
            "base_features": feature_cols,
            "window_size": WINDOW_SIZE,
            "classes": ["Menstrual", "Follicular", "Fertility", "Luteal"],
            "trees": rf_to_dict(rf, feature_names)
        }
    }
    
    with open(WEB_OUTPUT, 'w') as f:
        json.dump(output, f)
    
    print(f"✅ FINAL PHASE MODEL EXPORTED TO {WEB_OUTPUT}")

if __name__ == "__main__":
    train_and_export_final()
