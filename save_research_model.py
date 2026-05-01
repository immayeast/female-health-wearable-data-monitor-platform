import os
import pickle
import pandas as pd
from recalibration_scores import run_recalibration_pipeline

# Paths
DATA_DIR = "/Users/kikkiliu/physionet.org/files/mcphases/data"
OUTPUT_PATH = "web_app/public/research_model.pkl"

def export_research_brain():
    print("🧠 Building Research Brain (Pickle Format with Compat Patch)...")
    
    # 1. Load Data
    stress = pd.read_csv(os.path.join(DATA_DIR, "stress_score.csv"))
    hrv = pd.read_csv(os.path.join(DATA_DIR, "heart_rate_variability_details.csv"))
    rhr = pd.read_csv(os.path.join(DATA_DIR, "resting_heart_rate.csv"))
    hormones = pd.read_csv(os.path.join(DATA_DIR, "hormones_and_selfreport.csv"))
    
    # Pre-cleaning: filter for READY status as in script 3
    stress = stress[stress["status"] == "READY"]
    
    # Map Likert stress to numeric 0-100 for the gap calculation
    LIKERT_MAP = {
        "Not at all": 0, "Very Low/Little": 1, "Low": 2,
        "Moderate": 3, "High": 4, "Very High": 5,
    }
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
    
    if len(master) == 0:
        print("❌ ERROR: No rows remaining after merge.")
        return

    # 2. Train the Recalibration Pipeline
    print("  Training Gradient Boosting Recalibrator...")
    adjusted_df, artifacts = run_recalibration_pipeline(
        master, 
        score_col="stress_score", 
        self_report_col="stress"
    )
    
    # 3. Serialize to Pickle (Browser will use the compat patch)
    with open(OUTPUT_PATH, "wb") as f:
        pickle.dump(artifacts, f)
        
    print(f"✅ Research Brain serialized to {OUTPUT_PATH}")

if __name__ == "__main__":
    export_research_brain()
