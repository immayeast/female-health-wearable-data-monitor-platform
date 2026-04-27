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
        record['resting_hr'] = safe_get('HKQuantityTypeIdentifierHeartRate', '10th') # 10th percentile daily HR approx Resting
        record['rmssd_mean'] = safe_get('HKQuantityTypeIdentifierHeartRateVariabilitySDNN', 'mean')
        
        # Breathing
        record['full_sleep_breathing_rate'] = safe_get('HKQuantityTypeIdentifierRespiratoryRate', 'mean')
        
        # Sleep
        sleep_sub = group[group['type'] == 'HKCategoryTypeIdentifierSleepAnalysis']
        if not sleep_sub.empty:
            total_mins = sleep_sub['sleep_duration_mins'].sum()
            # Convert 8 hours (480 mins) to 100 benchmark score roughly matching Oura scaling
            score = (total_mins / 480.0) * 100
            score = min(100.0, score)
            record['overall_score'] = score
        else:
            record['overall_score'] = np.nan

        # Menstrual tag (anchor for basic inference later)
        flow = group[group['type'] == 'HKCategoryTypeIdentifierMenstrualFlow']
        record['menstrual_flow_day'] = 1 if not flow.empty else 0
        
        daily_records.append(record)
        
    daily_df = pd.DataFrame(daily_records)
    
    # 3. Phase Inferencing
    print("Building Phase approximations...")
    # If the user has menstrual flow logs, we'll infer 
    # Menstrual (Days 1-5), Follicular (Days 6-13), Ovulation (14-16), Luteal (17-28)
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
                daily_df.loc[i, 'phase'] = 'ovulation'
            elif days_since_period <= 28:
                daily_df.loc[i, 'phase'] = 'luteal'
            else:
                # Cycle length past 28, just stay in luteal until next bleed
                daily_df.loc[i, 'phase'] = 'luteal'
                
    # 4. Fill required uncaptured columns with NaNs
    daily_df['stress'] = np.nan 
    daily_df['stress_score'] = np.nan # Apple Health doesn't natively do a global stress score
    
    # Cleanup dropping intermediate helpers
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
