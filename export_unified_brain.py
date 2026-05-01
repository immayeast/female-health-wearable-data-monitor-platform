import json
import numpy as np
import pandas as pd
import os
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from final_model import add_day_in_cycle, apply_imputation, create_sliding_windows
from recalibration_scores import run_recalibration_pipeline

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
            return {
                "value": int(np.argmax(tree_.value[node][0])) if len(tree_.value[node].shape) > 1 else float(tree_.value[node].flatten()[0]),
                "is_leaf": True
            }
    return recurse(0)

def train_and_export_unified():
    print("🚀 LOADING DATA FOR UNIFIED BRAIN...")
    # Load hormones for base structure
    hormones = pd.read_csv(os.path.join(OLD_DATA_DIR, 'hormones_and_selfreport.csv')).dropna(subset=['phase'])
    stress = pd.read_csv(os.path.join(OLD_DATA_DIR, "stress_score.csv"))
    hr = pd.read_csv(os.path.join(OLD_DATA_DIR, 'heart_rate.csv')).groupby(['id', 'day_in_study'])['bpm'].agg(hr_mean='mean').reset_index()
    temp = pd.read_csv(os.path.join(OLD_DATA_DIR, 'wrist_temperature.csv')).groupby(['id', 'day_in_study'])['temperature_diff_from_baseline'].mean().reset_index().rename(columns={'temperature_diff_from_baseline': 'temp_diff'})
    rhr = pd.read_csv(os.path.join(OLD_DATA_DIR, 'resting_heart_rate.csv')).groupby(['id', 'day_in_study'])['value'].mean().reset_index().rename(columns={'value': 'resting_hr'})
    hrv = pd.read_csv(os.path.join(OLD_DATA_DIR, 'heart_rate_variability_details.csv')).groupby(['id', 'day_in_study'])['rmssd'].mean().reset_index().rename(columns={'rmssd': 'hrv_rmssd'})
    
    # 1. PHASE MODEL (Random Forest - 7 Day Window)
    df_phase = hormones.copy()
    for frame in [hr, temp, rhr, hrv]:
        df_phase = df_phase.merge(frame, on=['id', 'day_in_study'], how='left')

    phase_feature_cols = ['hr_mean', 'temp_diff', 'resting_hr', 'hrv_rmssd']
    df_phase = apply_imputation(df_phase, phase_feature_cols)
    
    phase_map = {'menstrual': 0, 'follicular': 1, 'fertility': 2, 'luteal': 3}
    df_phase['phase_encoded'] = df_phase['phase'].str.strip().str.lower().map(phase_map)
    df_phase = df_phase.dropna(subset=['phase_encoded'])
    
    X_phase, y_phase, phase_feature_names = create_sliding_windows(df_phase, phase_feature_cols, WINDOW_SIZE)
    
    print("🚀 TRAINING RANDOM FOREST PHASE CLASSIFIER...")
    rf = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1)
    rf.fit(X_phase, y_phase)

    # 2. GAP MODEL (Gradient Boosting - Static)
    print("🚀 TRAINING GRADIENT BOOSTING GAP REGRESSOR...")
    LIKERT_MAP = {"Not at all": 0, "Very Low/Little": 1, "Low": 2, "Moderate": 3, "High": 4, "Very High": 5}
    hormones_gap = hormones.copy()
    hormones_gap["stress_report"] = hormones_gap["stress"].map(LIKERT_MAP) * 20
    master_gap = hormones_gap.merge(stress[stress["status"]=="READY"], on=['id', 'day_in_study'], how="inner")
    master_gap = master_gap.merge(rhr, on=['id', 'day_in_study'], how="inner")
    master_gap = master_gap.merge(hrv.rename(columns={'hrv_rmssd':'rmssd'}), on=['id', 'day_in_study'], how="inner")
    master_gap = master_gap.merge(temp.rename(columns={'temp_diff':'temperature_diff_from_baseline'}), on=['id', 'day_in_study'], how="left")
    
    adjusted_df, artifacts = run_recalibration_pipeline(master_gap, score_col="stress_score", self_report_col="stress_report")
    gb_gap = artifacts.gb_model

    # 3. EXPORT UNIFIED BRAIN
    print("🚀 EXPORTING UNIFIED BRAIN TO JSON...")
    
    output = {
        "phase_model": {
            "feature_names": phase_feature_names,
            "base_features": phase_feature_cols,
            "window_size": WINDOW_SIZE,
            "classes": ["Menstrual", "Follicular", "Fertility", "Luteal"],
            "trees": [tree_to_dict(est, phase_feature_names) for est in rf.estimators_]
        },
        "gap_model": {
            "features": artifacts.gb_features,
            "imputer_medians": artifacts.gb_imputer.statistics_.tolist(),
            "scaler_mean": artifacts.gb_scaler.mean_.tolist(),
            "scaler_scale": artifacts.gb_scaler.scale_.tolist(),
            "learning_rate": float(gb_gap.learning_rate),
            "init_value": float(gb_gap.init_.constant_.flatten()[0]),
            "trees": []
        }
    }
    
    for estimator in gb_gap.estimators_.flatten():
        output["gap_model"]["trees"].append(tree_to_dict(estimator, artifacts.gb_features))
    
    with open(WEB_OUTPUT, 'w') as f:
        json.dump(output, f)
    
    print(f"✅ UNIFIED BRAIN EXPORTED TO {WEB_OUTPUT}")

if __name__ == "__main__":
    train_and_export_unified()
