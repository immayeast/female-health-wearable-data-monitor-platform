import os
import pandas as pd
import numpy as np
import json
import xgboost as xgb
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
import umap

# ============================================================
# 1. CONFIG & DATA PATHS
# ============================================================
MASTER_DATA = "/Users/kikkiliu/physionet.org/files/mcphases/data/synthetic_mcphases_fullschema.csv"
USER_DATA = "/Users/kikkiliu/physionet.org/files/mcphases/anonymized_user_pipeline_ready.csv"
OUTPUT_JSON = "/Users/kikkiliu/female-health-wearable-data-monitor-platform/web_app/public/user_trajectory.json"

# Feature Mapping: User CSV -> Master CSV
FEATURE_MAP = {
    "steps": "steps",
    "calories": "calories",
    "resting_hr": "resting_hr",
    "rmssd_mean": "hrv_rmssd",
    "overall_score": "sleep_overall_score",
    "full_sleep_breathing_rate": "resp_full_sleep",
}

# Add phase dummies and cycle day features later
BASIC_FEATURES = list(FEATURE_MAP.values())
PHASES = ["menstrual", "follicular", "fertility", "luteal"]

def calculate_cycle_day(df):
    """Simple cycle day calculation based on 'menstrual' phase anchors"""
    df = df.sort_values('date').copy() if 'date' in df.columns else df.copy()
    df['day_in_cycle'] = 0
    cycle_day = 1
    phases = df['phase'].astype(str).str.lower().values
    for i in range(len(phases)):
        if i > 0 and phases[i] == 'menstrual' and phases[i-1] != 'menstrual':
            cycle_day = 1
        df.loc[df.index[i], 'day_in_cycle'] = cycle_day
        cycle_day += 1
    
    # Cos/Sin features
    df['day_in_cycle_sin'] = np.sin(2 * np.pi * df['day_in_cycle'] / 28.0)
    df['day_in_cycle_cos'] = np.cos(2 * np.pi * df['day_in_cycle'] / 28.0)
    return df

def run_inference():
    print("Loading Master Data for training...")
    master = pd.read_csv(MASTER_DATA)
    master['phase'] = master['phase'].astype(str).str.lower()
    
    print("Loading User Data for inference...")
    user = pd.read_csv(USER_DATA)
    user = user.rename(columns=FEATURE_MAP)
    user['phase'] = user['phase'].astype(str).str.lower()
    user = calculate_cycle_day(user)
    
    # ── 1. Prepare Training Set ───────────────────────────────────────────────
    # We only use features that exist in BOTH datasets
    train_features = BASIC_FEATURES + ['day_in_cycle_sin', 'day_in_cycle_cos']
    # Add phase dummies
    for p in PHASES:
        master[f"phase_{p}"] = (master["phase"] == p).astype(int)
        user[f"phase_{p}"] = (user["phase"] == p).astype(int)
        train_features.append(f"phase_{p}")
        
    X_train = master[train_features]
    y_train = master["stress"] # Predicting 'Truth' (Self-report)
    
    # Drop NaNs in target
    mask = y_train.notna()
    X_train, y_train = X_train[mask], y_train[mask]
    
    print(f"Training XGBoost on {len(X_train)} samples with {len(train_features)} features...")
    
    # Impute & Scale
    imp = SimpleImputer(strategy="median")
    scaler = StandardScaler()
    
    X_train_s = scaler.fit_transform(imp.fit_transform(X_train))
    
    model = xgb.XGBRegressor(n_estimators=100, max_depth=5, learning_rate=0.1, random_state=42)
    model.fit(X_train_s, y_train)
    
    # ── 2. Run Inference on User ──────────────────────────────────────────────
    X_user = user[train_features]
    X_user_s = scaler.transform(imp.transform(X_user))
    user_preds = model.predict(X_user_s)
    
    # Clip to 0-5 range
    user_preds = np.clip(user_preds, 0, 5)
    user['predicted_stress'] = user_preds
    
    print("Inference complete. Predicted stress generated.")
    
    # ── 3. UMAP Projection for Trajectory ─────────────────────────────────────
    print("Generating UMAP trajectory coordinates...")
    # Map user to population space
    # Use numeric basics for UMAP
    umap_cols = BASIC_FEATURES + ['day_in_cycle_sin', 'day_in_cycle_cos']
    
    X_pop_umap = master[umap_cols].dropna()
    X_user_umap = user[umap_cols]
    
    # Combine for joint embedding
    X_combo = pd.concat([X_pop_umap, X_user_umap], ignore_index=True)
    X_combo_s = StandardScaler().fit_transform(SimpleImputer(strategy="median").fit_transform(X_combo))
    
    reducer = umap.UMAP(n_neighbors=15, min_dist=0.1, random_state=42)
    embedding = reducer.fit_transform(X_combo_s)
    
    n_pop = len(X_pop_umap)
    user_coords = embedding[n_pop:]
    
    user['umap_x'] = user_coords[:, 0]
    user['umap_y'] = user_coords[:, 1]
    
    # ── 4. Save to JSON ───────────────────────────────────────────────────────
    # We want a format the UI can easily consume
    trajectory = []
    for i, row in user.iterrows():
        trajectory.append({
            "date": str(row['date']),
            "stress": float(row['predicted_stress']),
            "phase": str(row['phase']),
            "x": float(row['umap_x']),
            "y": float(row['umap_y']),
            "rmssd": float(row['hrv_rmssd']) if not pd.isna(row['hrv_rmssd']) else None
        })
        
    # Also include some population background points for context (sampled)
    pop_points = []
    pop_sample = master.sample(min(200, len(master)))
    # We need UMAP for these too... actually we already have 'embedding'
    pop_coords = embedding[:n_pop]
    # Sample from pop_coords
    indices = np.random.choice(n_pop, min(200, n_pop), replace=False)
    for idx in indices:
        pop_points.append({
            "x": float(embedding[idx, 0]),
            "y": float(embedding[idx, 1]),
            "type": "population"
        })
        
    output = {
        "user_trajectory": trajectory,
        "population_background": pop_points
    }
    
    os.makedirs(os.path.dirname(OUTPUT_JSON), exist_ok=True)
    with open(OUTPUT_JSON, "w") as f:
        json.dump(output, f, indent=2)
        
    print(f"JSON Trajectory saved to: {OUTPUT_JSON}")

if __name__ == "__main__":
    run_inference()
