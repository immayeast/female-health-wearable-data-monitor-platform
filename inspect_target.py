import os
import pandas as pd

def inspect_health_data(csv_path: str):
    """
    Reads the target.csv generated from Apple Health and breaks down the features.
    In Apple Health data, features are typically embedded as row variables under the 'type' column.
    """
    if not os.path.exists(csv_path):
        print(f"File not found: {csv_path}")
        return

    print(f"Loading {csv_path}... (this may take a moment for large files)")
    
    # Load just the categorical columns to save memory if it's huge
    # In Apple Health, the main categorical columns are 'type', 'sourceName', 'unit'
    try:
        # Read the first chunk just to see the columns available
        sample_df = pd.read_csv(csv_path, nrows=5)
        print("\n--- Columns found in the CSV ---")
        print(list(sample_df.columns))
        
        # Load the relevant columns
        usecols = [c for c in ['type', 'sourceName', 'unit'] if c in sample_df.columns]
        
        if not usecols:
            print("\nDid not find 'type', 'sourceName', or 'unit' columns. Scanning all columns for objects...")
            df = pd.read_csv(csv_path, low_memory=False)
            cat_cols = df.select_dtypes(include=['object']).columns
        else:
            df = pd.read_csv(csv_path, usecols=usecols, low_memory=False)
            cat_cols = usecols

    except Exception as e:
        print(f"Error loading CSV: {e}")
        return

    print(f"\n--- Scanning Categorical Features ---")
    print(f"Total rows scanned: {len(df):,}")
    
    for col in cat_cols:
        print(f"\n==================================================")
        print(f"Column: {col} | Unique Values: {df[col].nunique():,}")
        print(f"==================================================")
        
        # Print top 30 most common values
        counts = df[col].value_counts()
        print(counts.head(30).to_string())
        
        if len(counts) > 30:
            print(f"... and {len(counts) - 30} more.")

if __name__ == "__main__":
    # Point this to your target.csv location
    target_file = "/Users/kikkiliu/apple_health_export/target.csv"
    inspect_health_data(target_file)
