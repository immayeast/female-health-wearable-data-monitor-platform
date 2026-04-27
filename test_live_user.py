import pandas as pd
import numpy as np
import os
from alignment_bin_models import default_feature_pool, build_pipeline

def test_live_user_data(user_csv_path: str, master_data_dir: str):
    print(f"Loading new user data from {user_csv_path}...")
    user_df = pd.read_csv(user_csv_path)
    
    if user_df.empty:
        return

    print("Building TRUE master training data from raw PhysioNet records...")
    # Import the real master compiler from script 4
    from script4_phase_models import build_master_df
    master = build_master_df(master_data_dir)
    
    # Convert stress
    LIKERT_MAP = {
        "restful": 1, "very restful": 1,
        "somewhat restful": 3, "somewhat stressed": 3,
        "stressed": 5, "very stressed": 5
    }
    if "stress" in master.columns and master["stress"].dtype == object:
        master["stress"] = master["stress"].replace(LIKERT_MAP)
    master["stress"] = pd.to_numeric(master["stress"], errors="coerce")
    
    from alignment_bin_models import build_alignment_label
    master = build_alignment_label(master, "stress", "stress_score")
    
    print("Training Gradient Boosting alignment classifier on TRUE master context...")
    features = default_feature_pool(master, include_wearable_score=False)
    for f in features:
        if f not in user_df.columns:
            user_df[f] = np.nan
            
    if "phase" not in user_df.columns:
        user_df["phase"] = np.nan
            
    X_train = master[features]
    y_train = master["alignment_bin"]
    mask = y_train.notna()
    X_train = X_train[mask]
    y_train = y_train[mask]
    
    pipeline = build_pipeline(master, features, "gb")
    pipeline.fit(X_train, y_train)
    
    print("Predicting alignment states for the new user...")
    X_test = user_df[features]
    predictions = pipeline.predict(X_test)
    
    user_df["predicted_alignment"] = predictions
    
    dist = user_df["predicted_alignment"].value_counts(normalize=True)*100
    print("\nTRUE Daily Perception Distribution (Real Model):")
    print(dist.to_string())

if __name__ == "__main__":
    user_file = "/Users/kikkiliu/physionet.org/files/mcphases/anonymized_user_pipeline_ready.csv"
    master_dir = "/Users/kikkiliu/physionet.org/files/mcphases/data"
    test_live_user_data(user_file, master_dir)
