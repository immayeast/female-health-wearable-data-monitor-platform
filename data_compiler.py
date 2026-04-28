import pandas as pd
import numpy as np
import os

def build_real_master(data_dir="./data"):
    def load(fname):
        return pd.read_csv(os.path.join(data_dir, fname))

    JOIN_KEYS = ["id", "day_in_study", "study_interval"]

    hormones = load("hormones_and_selfreport.csv")
    LIKERT_MAP = {"Not at all": 0, "Very Low/Little": 1, "Low": 2, "Moderate": 3, "High": 4, "Very High": 5}
    SYMPTOM_COLS = ["headaches", "cramps", "sorebreasts", "fatigue", "bloating", "moodswing", "stress", "sleepissue", "foodcravings", "appetite", "indigestion"]
    for col in SYMPTOM_COLS:
        if col in hormones.columns:
            hormones[col] = hormones[col].replace(LIKERT_MAP)
            hormones[col] = pd.to_numeric(hormones[col], errors="coerce")
            
    _num_cols = [c for c in hormones.select_dtypes(include="number").columns if c not in JOIN_KEYS]
    _cat_cols = [c for c in hormones.columns if c not in _num_cols and c not in JOIN_KEYS]

    _num_agg = hormones.groupby(JOIN_KEYS)[_num_cols].mean()
    _cat_agg = hormones.groupby(JOIN_KEYS)[_cat_cols].first()
    hormones = _num_agg.join(_cat_agg).reset_index()

    if "phase" in hormones.columns:
        hormones["phase"] = hormones["phase"].astype(str).str.strip().str.lower().replace("nan", np.nan)
    PHASE_ORDER  = ["menstrual", "follicular", "fertility", "luteal"]
    hormones = hormones[hormones["phase"].isin(PHASE_ORDER)]

    stress     = load("stress_score.csv")
    sleep_sc   = load("sleep_score.csv")
    resting_hr = load("resting_heart_rate.csv")
    active_min = load("active_minutes.csv")
    calories   = load("calories.csv")
    distance   = load("distance.csv")
    steps_df   = load("steps.csv")
    
    stress = stress[(stress["status"] == "READY") & (stress["calculation_failed"].astype(str).str.upper() != "TRUE")]
    def daily_agg(df, agg_dict):
        cols = JOIN_KEYS + list(agg_dict.keys())
        df   = df[[c for c in cols if c in df.columns]].copy()
        out  = df.groupby(JOIN_KEYS).agg(agg_dict).reset_index()
        out.columns = ["_".join(c).strip("_") if isinstance(c, tuple) else c for c in out.columns]
        return out

    s_agg = daily_agg(stress, {"daily_stress_score": "mean"})
    master = pd.merge(hormones, s_agg, on=JOIN_KEYS, how="inner")
    
    sl_agg = daily_agg(sleep_sc, {"overall_score": "mean"})
    master = pd.merge(master, sl_agg, on=JOIN_KEYS, how="left")
    
    hr_agg = daily_agg(resting_hr, {"resting_heart_rate": "mean"})
    if "resting_heart_rate" in hr_agg.columns: hr_agg.rename(columns={"resting_heart_rate": "resting_hr"}, inplace=True)
    master = pd.merge(master, hr_agg, on=JOIN_KEYS, how="left")
    
    st_agg = daily_agg(steps_df, {"steps": "sum"})
    master = pd.merge(master, st_agg, on=JOIN_KEYS, how="left")
    
    ca_agg = daily_agg(calories, {"calories": "sum"})
    master = pd.merge(master, ca_agg, on=JOIN_KEYS, how="left")
    
    di_agg = daily_agg(distance, {"distance": "sum"})
    master = pd.merge(master, di_agg, on=JOIN_KEYS, how="left")
    
    hrv_df = load("heart_rate_variability_details.csv")
    hrv_agg = daily_agg(hrv_df, {"rmssd": "mean"})
    if "rmssd" in hrv_agg.columns: hrv_agg.rename(columns={"rmssd": "rmssd_mean"}, inplace=True)
    master = pd.merge(master, hrv_agg, on=JOIN_KEYS, how="left")

    return master

if __name__ == "__main__":
    df = build_real_master()
    print(f"✅ Successfully compiled raw real data mapping: {df.shape}")
