import os
import json
import numpy as np
import pandas as pd
from recalibration_scores import run_recalibration_pipeline

def export_to_json():
    print("🧠 Deconstructing Research Brain into JSON trees...")
    
    # 1. Train/Get the model as usual
    DATA_DIR = "/Users/kikkiliu/physionet.org/files/mcphases/data"
    stress = pd.read_csv(os.path.join(DATA_DIR, "stress_score.csv"))
    hrv = pd.read_csv(os.path.join(DATA_DIR, "heart_rate_variability_details.csv"))
    rhr = pd.read_csv(os.path.join(DATA_DIR, "resting_heart_rate.csv"))
    hormones = pd.read_csv(os.path.join(DATA_DIR, "hormones_and_selfreport.csv"))
    
    stress = stress[stress["status"] == "READY"]
    LIKERT_MAP = {"Not at all": 0, "Very Low/Little": 1, "Low": 2, "Moderate": 3, "High": 4, "Very High": 5}
    hormones["stress"] = hormones["stress"].map(LIKERT_MAP) * 20
    hormones = hormones.dropna(subset=["stress"])
    
    JOIN_KEYS = ["id", "day_in_study"]
    for df in [stress, hrv, rhr, hormones]:
        df["id"] = df["id"].astype(str)
        df["day_in_study"] = df["day_in_study"].astype(int)

    hrv_daily = hrv.groupby(JOIN_KEYS)["rmssd"].mean().reset_index()
    rhr_daily = rhr.groupby(JOIN_KEYS)["value"].mean().reset_index().rename(columns={"value": "resting_hr"})
    
    master = hormones.merge(stress, on=JOIN_KEYS, how="inner")
    master = master.merge(rhr_daily, on=JOIN_KEYS, how="inner")
    master = master.merge(hrv_daily, on=JOIN_KEYS, how="inner")
    
    adjusted_df, artifacts = run_recalibration_pipeline(master, score_col="stress_score", self_report_col="stress")
    
    model = artifacts.gb_model
    
    # 2. Extract Trees
    serialized_trees = []
    for estimator in model.estimators_.flatten():
        tree = estimator.tree_
        serialized_trees.append({
            "children_left": tree.children_left.tolist(),
            "children_right": tree.children_right.tolist(),
            "feature": tree.feature.tolist(),
            "threshold": tree.threshold.tolist(),
            "value": tree.value.flatten().tolist()
        })
    
    brain_data = {
        "init_estimator_value": float(model.init_.constant_.flatten()[0]),
        "learning_rate": float(model.learning_rate),
        "trees": serialized_trees,
        "features": artifacts.gb_features,
        "imputer_medians": artifacts.gb_imputer.statistics_.tolist(),
        "scaler_mean": artifacts.gb_scaler.mean_.tolist(),
        "scaler_scale": artifacts.gb_scaler.scale_.tolist()
    }
    
    output_path = "web_app/public/research_model.json"
    with open(output_path, "w") as f:
        json.dump(brain_data, f)
        
    print(f"✅ Research Brain (JSON) saved to {output_path}")

if __name__ == "__main__":
    export_to_json()
