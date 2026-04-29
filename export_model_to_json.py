import pandas as pd
import numpy as np
import json
import os
from sklearn.linear_model import LassoCV
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer

# Paths from script3_modeling.py
DATA_DIR = "/Users/kikkiliu/physionet.org/files/mcphases/data"
WEB_OUTPUT = "/Users/kikkiliu/female-health-wearable-data-monitor-platform/web_app/public/model_metadata.json"

def export_model_to_json():
    print("Loading data for weight extraction...")
    # Loading a subset of key files for the demo model
    stress = pd.read_csv(os.path.join(DATA_DIR, "stress_score.csv"))
    hrv = pd.read_csv(os.path.join(DATA_DIR, "heart_rate_variability_details.csv"))
    rhr = pd.read_csv(os.path.join(DATA_DIR, "resting_heart_rate.csv"))
    hormones = pd.read_csv(os.path.join(DATA_DIR, "hormones_and_selfreport.csv"))

    # Simplified merge for weight extraction
    JOIN_KEYS = ["id", "day_in_study"]
    hrv_daily = hrv.groupby(JOIN_KEYS)["rmssd"].mean().reset_index()
    
    master = hormones.merge(stress, on=JOIN_KEYS, how="inner")
    master = master.merge(rhr.rename(columns={"value": "resting_hr"}), on=JOIN_KEYS, how="inner")
    master = master.merge(hrv_daily, on=JOIN_KEYS, how="inner")
    
    # Define features used in script 3
    features = ["resting_hr", "rmssd", "lh", "estrogen", "pdg"]
    target = "stress_score"
    
    # Cleanup
    master = master[features + [target]].dropna()
    X = master[features]
    y = master[target]

    # Calculate Normalization Params (The "Z-score" baselines)
    stats = {
        "means": X.mean().to_dict(),
        "stds": X.std().to_dict(),
        "feature_names": features
    }

    # Train Lasso to get Weights
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    model = LassoCV(cv=5, random_state=42)
    model.fit(X_scaled, y)

    # Export Weights
    stats["weights"] = dict(zip(features, model.coef_.tolist()))
    stats["intercept"] = float(model.intercept_)
    stats["r2_score"] = float(model.score(X_scaled, y))

    # Save for Web App
    with open(WEB_OUTPUT, 'w') as f:
        json.dump(stats, f, indent=2)
    
    print(f"Successfully exported real model weights to {WEB_OUTPUT}")
    print(f"Model R²: {stats['r2_score']:.4f}")

if __name__ == "__main__":
    export_model_to_json()
