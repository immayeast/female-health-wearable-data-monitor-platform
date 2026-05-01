import os
import pandas as pd
import numpy as np
from datetime import timedelta

def clean_and_anonymize_health_data(target_csv: str, out_csv: str):
    """
    Parses Apple Health target.csv into an anonymized, daily-level 
    dataset matching the mcPHASES script4 model feature pool.
    """
    print(f"Loading {target_csv}...")
    df = pd.read_csv(target_csv, low_memory=False)

    # 0. Custom Data Filtering (Apple Watch + Since March 2026)
    print("Filtering data for Apple Watch records since March 2026...")
    if "sourceName" in df.columns:
        # Apple Health often uses non-breaking spaces (\xa0). Search for "apple" and "watch" flexibly.
        raw_strs = df["sourceName"].astype(str).str.lower()
        apple_watch_mask = raw_strs.str.contains("apple", regex=False) & raw_strs.str.contains("watch", regex=False)
        df = df[apple_watch_mask]
        print(f"Filtered to Apple Watch sources: {len(df)} rows remaining")
        
    if "startDate" in df.columns:
        df["temp_dt"] = pd.to_datetime(df["startDate"], errors="coerce", utc=True)
        date_mask = df["temp_dt"] >= pd.Timestamp("2026-03-01", tz="UTC")
        df = df[date_mask]
        df = df.drop(columns=["temp_dt"])
        print(f"Filtered to dates >= 2026-03-01: {len(df)} rows remaining")
        
    if df.empty:
        print("Dataset is completely empty after filtering. Aborting processing.")
        return

    # 1. PII Stripping
    print("Stripping PII (device names, hardware sources, precise timestamps)...")
    cols_to_drop = ["sourceName", "sourceVersion", "device", "creationDate"]
    df = df.drop(columns=[c for c in cols_to_drop if c in df.columns], errors='ignore')

    # Truncate dates to days
    if "startDate" in df.columns:
        # Apple Health dates frequently include timezone ' -0400'
        df['date'] = pd.to_datetime(df['startDate'], errors='coerce', utc=True).dt.date
    if "endDate" in df.columns:
        df['endDate_dt'] = pd.to_datetime(df['endDate'], errors='coerce', utc=True)
        df['startDate_dt'] = pd.to_datetime(df['startDate'], errors='coerce', utc=True)

    # Drop any rows missing a date or value
    df = df.dropna(subset=['date'])
    
    # Pre-process Sleep Analysis before pivoting
    # Sleep value in Apple Health is often categorical (e.g. HKCategoryValueSleepAnalysisAsleep)
    # We will sum the duration in minutes where type is SleepAnalysis
    sleep_mask = df['type'] == 'HKCategoryTypeIdentifierSleepAnalysis'
    if sleep_mask.any():
        df.loc[sleep_mask, 'sleep_duration_mins'] = (df.loc[sleep_mask, 'endDate_dt'] - df.loc[sleep_mask, 'startDate_dt']).dt.total_seconds() / 60.0
    
    print("Aggregating daily variables...")
    # 2. Aggregations
    # Create empty dicts to store daily metrics
    daily_records = []
    
    grouped = df.groupby('date')
    
    for date, group in grouped:
        record = {'date': date}
        
        # Helper lambda
        def safe_get(type_id, agg="mean"):
            subset = group[group['type'] == type_id]
            if subset.empty:
                return np.nan
            # Drop purely null values if they survived conversion
            vals = pd.to_numeric(subset['value'], errors='coerce').dropna()
            if vals.empty:
                return np.nan
            
            if agg == "sum": return vals.sum()
            elif agg == "mean": return vals.mean()
            elif agg == "min": return vals.min()
            elif agg == "max": return vals.max()
            elif agg == "std": return vals.std()
            elif agg == "10th": return np.percentile(vals, 10)
            return np.nan

        # Extract features mapped to exact names expected in pipeline
        record['steps'] = safe_get('HKQuantityTypeIdentifierStepCount', 'sum')
        record['calories'] = np.nansum([
            safe_get('HKQuantityTypeIdentifierActiveEnergyBurned', 'sum'),
            safe_get('HKQuantityTypeIdentifierBasalEnergyBurned', 'sum')
        ]) 
        # Replace 0 sum with nan if both were nan
        if record['calories'] == 0.0 and np.isnan(safe_get('HKQuantityTypeIdentifierActiveEnergyBurned', 'sum')):
            record['calories'] = np.nan
            
        record['distance'] = safe_get('HKQuantityTypeIdentifierDistanceWalkingRunning', 'sum')
        
        # Heart Rate & HRV
        record['resting_hr'] = safe_get('HKQuantityTypeIdentifierHeartRate', '10th')
        record['bpm_mean'] = safe_get('HKQuantityTypeIdentifierHeartRate', 'mean')
        record['bpm_max'] = safe_get('HKQuantityTypeIdentifierHeartRate', 'max')
        record['bpm_std'] = safe_get('HKQuantityTypeIdentifierHeartRate', 'std')
        
        record['rmssd_mean'] = safe_get('HKQuantityTypeIdentifierHeartRateVariabilitySDNN', 'mean')
        record['rmssd_max'] = safe_get('HKQuantityTypeIdentifierHeartRateVariabilitySDNN', 'max')
        record['rmssd_std'] = safe_get('HKQuantityTypeIdentifierHeartRateVariabilitySDNN', 'std')
        record['rmssd_min'] = safe_get('HKQuantityTypeIdentifierHeartRateVariabilitySDNN', 'min')
        
        # Breathing
        record['full_sleep_breathing_rate'] = safe_get('HKQuantityTypeIdentifierRespiratoryRate', 'mean')
        
        # 4. Synthetic Scoring (Filling the gaps for missing wearable metrics)
        # Sleep Score: Based on a 7.5 hour (450 min) benchmark for 100
        # First calculate total sleep duration for the day
        sleep_sub = group[group['type'] == 'HKCategoryTypeIdentifierSleepAnalysis']
        record['sleep_duration_mins'] = sleep_sub['sleep_duration_mins'].sum() if not sleep_sub.empty else np.nan
        
        if not np.isnan(record.get('sleep_duration_mins', np.nan)):
            record['overall_score'] = np.clip((record['sleep_duration_mins'] / 450.0) * 100, 0, 100)
        else:
            # Fallback to a neutral 70 if no sleep data is found
            record['overall_score'] = 70.0

        # Stress Score: Synthetic Wearable Score (Autonomic Balance)
        # Mapping RHR (40-100) and HRV (20-120) to a 0-100 scale
        if not np.isnan(record.get('resting_hr', np.nan)) and not np.isnan(record.get('rmssd_mean', np.nan)):
            rhr_n = np.clip((record['resting_hr'] - 40) / 60, 0, 1)
            hrv_n = np.clip((record['rmssd_mean'] - 20) / 100, 0, 1)
            # Wearable Score starts at 70, penalized by high RHR and rewarded by high HRV
            # Note: This is the 'Wearable Truth' that we will then recalibrate
            record['stress_score'] = 70 - (rhr_n * 30) + (hrv_n * 20)
        else:
            record['stress_score'] = 65.0 # Neutral fallback
            
        record['stress'] = record['stress_score'] # Duplicate for naming flexibility

        # Menstrual tag (anchor for basic inference later)
        flow = group[group['type'] == 'HKCategoryTypeIdentifierMenstrualFlow']
        record['menstrual_flow_day'] = 1 if not flow.empty else 0
        
        daily_records.append(record)
        
    daily_df = pd.DataFrame(daily_records)
    
    # 5. Phase Inferencing
    print("Building Phase approximations...")
    # If the user has menstrual flow logs, we'll infer 
    # Menstrual (Days 1-5), Follicular (Days 6-13), Fertility (14-16), Luteal (17-28)
    # Simple rolling inference
    daily_df = daily_df.sort_values('date').reset_index(drop=True)
    daily_df['phase'] = np.nan
    
    days_since_period = None
    for i in range(len(daily_df)):
        if daily_df.loc[i, 'menstrual_flow_day'] == 1:
            days_since_period = 1
            daily_df.loc[i, 'phase'] = 'menstrual'
        elif days_since_period is not None:
            days_since_period += 1
            if days_since_period <= 5:
                daily_df.loc[i, 'phase'] = 'menstrual'
            elif days_since_period <= 13:
                daily_df.loc[i, 'phase'] = 'follicular'
            elif days_since_period <= 16:
                daily_df.loc[i, 'phase'] = 'fertility'
            elif days_since_period <= 28:
                daily_df.loc[i, 'phase'] = 'luteal'
            else:
                # Cycle length past 28, just stay in luteal until next bleed
                daily_df.loc[i, 'phase'] = 'luteal'
                
    # Cleanup
    if 'menstrual_flow_day' in daily_df.columns:
        daily_df = daily_df.drop(columns=['menstrual_flow_day'])
    
    print(f"Data constructed. Final shape: {daily_df.shape}")
    daily_df.to_csv(out_csv, index=False)
    print(f"Anonymized and aggregated dataset saved to: {out_csv}")

if __name__ == "__main__":
    target_in = "/Users/kikkiliu/apple_health_export/target.csv"
    out_file = "/Users/kikkiliu/physionet.org/files/mcphases/anonymized_user_pipeline_ready.csv"
    if not os.path.exists(target_in):
        print(f"File {target_in} not found. Ensure you ran convert_xml_to_csv.py successfully.")
    else:
        clean_and_anonymize_health_data(target_in, out_file)
