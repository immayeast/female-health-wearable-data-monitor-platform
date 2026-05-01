import os
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import umap
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
import matplotlib.patches as mpatches

# Import local modules
from alignment_bin_models import default_feature_pool, build_pipeline, build_alignment_label

def run_audit(user_csv: str, master_csv: str, output_dir: str):
    print(f"--- Starting Audit of {user_csv} ---")
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"Created output directory: {output_dir}")

    print("Loading datasets...")
    user_df = pd.read_csv(user_csv)
    master = pd.read_csv(master_csv)
    
    print("Preparing Master Data...")
    # Get master ready for bin model training
    LIKERT_MAP = {
        "restful": 1, "very restful": 1, 
        "somewhat restful": 3, "somewhat stressed": 3, 
        "stressed": 5, "very stressed": 5
    }
    if "stress" in master.columns and master["stress"].dtype == object:
        master["stress"] = master["stress"].replace(LIKERT_MAP)
    master["stress"] = pd.to_numeric(master["stress"], errors="coerce")
    
    # We use 'daily_stress_score' if available, otherwise 'stress'
    target_col = "daily_stress_score" if "daily_stress_score" in master.columns else "stress"
    master = build_alignment_label(master, "stress", target_col)
    
    features = default_feature_pool(master, include_wearable_score=False)
    
    # Ensure user_df has all required features (even if NaN)
    for f in features:
        if f not in user_df.columns:
            user_df[f] = np.nan
    if "phase" not in user_df.columns:
        user_df["phase"] = np.nan
        
    X_train = master[features]
    y_train = master["alignment_bin"]
    mask = y_train.notna()
    X_train, y_train = X_train[mask], y_train[mask]
    
    print(f"Training Model (GB) on {len(X_train)} samples...")
    pipeline = build_pipeline(master, features, "gb")
    pipeline.fit(X_train, y_train)
    
    print("Classifying User Data...")
    X_user = user_df[features]
    user_preds = pipeline.predict(X_user)
    user_df["predicted_alignment"] = user_preds

    # 1. Generate text report
    report_path = os.path.join(output_dir, "audit_report.txt")
    with open(report_path, "w") as f:
        f.write("===============================================\n")
        f.write("      USER DATA AUDIT & VERIFICATION REPORT\n")
        f.write("===============================================\n\n")
        f.write(f"Source File: {user_csv}\n")
        f.write(f"Total Logged Days: {len(user_df)}\n")
        
        counts = user_df["predicted_alignment"].value_counts(normalize=True) * 100
        f.write("\n── ALIGNMENT CLASSIFICATION ──\n")
        for cls, pct in counts.items():
            f.write(f"  - {cls.ljust(15)}: {pct:.1f}%\n")
            
        f.write("\n── PHYSIOLOGICAL BASES (Medians) ──\n")
        for col in ['resting_hr', 'rmssd_mean', 'steps']:
            if col in user_df.columns:
                f.write(f"  {col.ljust(20)}: {user_df[col].median():.1f}\n")
            
        f.write("\n── PHASE-LEVEL TRENDS ──\n")
        if "phase" in user_df.columns and user_df["phase"].notna().sum() > 0:
            for phase in ["menstrual", "follicular", "fertility", "luteal"]:
                phase_df = user_df[user_df["phase"] == phase]
                if phase_df.empty: continue
                counts_p = phase_df["predicted_alignment"].value_counts(normalize=True) * 100
                f.write(f"  {phase.capitalize()}:\n")
                for cls, pct in counts_p.items():
                    f.write(f"    - {cls.ljust(15)}: {pct:.1f}%\n")
        else:
            f.write("  No phase data detected.\n")

    print(f"Report saved to {report_path}")

    # 2. UMAP Projection
    print("Computing UMAP projection...")
    num_cols = [c for c in features if c != 'phase']
    imp = SimpleImputer(strategy="median")
    scaler = StandardScaler()
    
    X_train_num = X_train[num_cols]
    X_user_num = X_user[num_cols]
    
    X_combo = pd.concat([X_train_num, X_user_num], ignore_index=True)
    X_combo_clean = scaler.fit_transform(imp.fit_transform(X_combo))
    
    reducer = umap.UMAP(n_neighbors=25, min_dist=0.2, random_state=42)
    embedding = reducer.fit_transform(X_combo_clean)
    
    n_train = len(X_train_num)
    emb_train = embedding[:n_train]
    emb_user = embedding[n_train:]
    
    # Plot
    plt.figure(figsize=(10, 8))
    plt.scatter(emb_train[:, 0], emb_train[:, 1], c='lightgray', s=10, alpha=0.3, label='Population')
    
    align_colors = {'aligned': '#66bb6a', 'self_higher': '#ef5350', 'wearable_higher': '#42a5f5'}
    user_colors = [align_colors.get(a, 'black') for a in user_preds]
    
    plt.scatter(emb_user[:, 0], emb_user[:, 1], c=user_colors, s=80, edgecolor='white', linewidth=1, label='User')
    
    plt.title("User Data vs Population Manifold")
    handles = [
        mpatches.Patch(color='lightgray', label='Population'),
        mpatches.Patch(color='#66bb6a', label='Aligned'),
        mpatches.Patch(color='#ef5350', label='Self Higher'),
        mpatches.Patch(color='#42a5f5', label='Wearable Higher'),
    ]
    plt.legend(handles=handles)
    
    plot_path = os.path.join(output_dir, "audit_umap_overlay.png")
    plt.savefig(plot_path, dpi=200)
    plt.close()
    print(f"UMAP Plot saved to {plot_path}")
    print("--- Audit Complete ---")

if __name__ == "__main__":
    WORKSPACE = "/Users/kikkiliu/female-health-wearable-data-monitor-platform"
    USER_FILE = "/Users/kikkiliu/physionet.org/files/mcphases/anonymized_user_pipeline_ready.csv"
    MASTER_FILE = "/Users/kikkiliu/physionet.org/files/mcphases/data/synthetic_mcphases_fullschema.csv"
    OUTPUT_DIR = os.path.join(WORKSPACE, "audit_results")
    
    run_audit(USER_FILE, MASTER_FILE, OUTPUT_DIR)
