import os
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import umap


from alignment_bin_models import default_feature_pool, build_pipeline

def generate_user_report(user_csv: str, master_csv: str, output_dir: str):
    print("Loading datasets...")
    user_df = pd.read_csv(user_csv)
    master = pd.read_csv(master_csv)
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    print("Pre-computing alignment classification...")
    # Get master ready for bin model training
    LIKERT_MAP = {"restful": 1, "very restful": 1, "somewhat restful": 3, "somewhat stressed": 3, "stressed": 5, "very stressed": 5}
    if "stress" in master.columns and master["stress"].dtype == object:
        master["stress"] = master["stress"].replace(LIKERT_MAP)
    master["stress"] = pd.to_numeric(master["stress"], errors="coerce")
    
    from alignment_bin_models import build_alignment_label
    master = build_alignment_label(master, "stress", "daily_stress_score")
    
    features = default_feature_pool(master, include_wearable_score=False)
    for f in features:
        if f not in user_df.columns:
            user_df[f] = np.nan
    if "phase" not in user_df.columns:
        user_df["phase"] = np.nan
        
    X_train = master[features]
    y_train = master["alignment_bin"]
    mask = y_train.notna()
    X_train, y_train = X_train[mask], y_train[mask]
    
    pipeline = build_pipeline(master, features, "gb")
    pipeline.fit(X_train, y_train)
    
    print("Classifying New User...")
    X_user = user_df[features]
    user_preds = pipeline.predict(X_user)
    user_df["predicted_alignment"] = user_preds

    # 1. Generate text report
    report_path = os.path.join(output_dir, "live_user_report.txt")
    with open(report_path, "w") as f:
        f.write("===============================================\n")
        f.write("      SINGLE USER BEHAVIORAL REPORT\n")
        f.write("===============================================\n\n")
        f.write(f"Total Logged Days: {len(user_df)}\n")
        
        counts = user_df["predicted_alignment"].value_counts(normalize=True) * 100
        f.write("\n── ALIGNMENT CLASSIFICATION ──\n")
        f.write("The user's predicted perception states based strictly on physiology:\n")
        for cls, pct in counts.items():
            f.write(f"  - {cls.ljust(15)}: {pct:.1f}%\n")
            
        f.write("\n── PHYSIOLOGICAL BASES ──\n")
        f.write(f"  Average Resting HR:   {user_df['resting_hr'].median():.1f} bpm\n")
        f.write(f"  Average HRV (SDNN):   {user_df['rmssd_mean'].median():.1f} ms\n")
        f.write(f"  Average Daily Steps:  {user_df['steps'].median():.0f}\n")
        
        f.write("\n── PHASE-LEVEL TRENDS ──\n")
        if "phase" in user_df.columns and user_df["phase"].notna().sum() > 0:
            for phase in ["menstrual", "follicular", "ovulation", "luteal"]:
                phase_df = user_df[user_df["phase"] == phase]
                if phase_df.empty: continue
                mode_align = phase_df["predicted_alignment"].mode()
                mode_val = mode_align[0] if not mode_align.empty else "N/A"
                f.write(f"  {phase.capitalize().ljust(10)}: Mode Prediction = {mode_val}\n")
        else:
            f.write("  No phase data detected for inference trends.\n")
            
    print(f"Report initialized. Proceeding to visual manifold mappings...")

    # 2. Extract numeric features array for UMAP Projection
    # We must cleanly impute before UMAP or it breaks.
    from sklearn.impute import SimpleImputer
    from sklearn.compose import ColumnTransformer
    from sklearn.preprocessing import StandardScaler
    
    num_cols = [c for c in features if c != 'phase']
    imp = SimpleImputer(strategy="median")
    scaler = StandardScaler()
    
    # We fit UMAP on both to map them to the exact same space
    X_train_num = X_train[num_cols]
    X_user_num = X_user[num_cols]
    
    # Build complete manifold array
    X_combo = pd.concat([X_train_num, X_user_num], ignore_index=True)
    X_combo_clean = scaler.fit_transform(imp.fit_transform(X_combo))
    
    print("Running UMAP dimensionality reduction...")
    reducer = umap.UMAP(n_neighbors=25, min_dist=0.2, random_state=42)
    embedding = reducer.fit_transform(X_combo_clean)
    
    n_train = len(X_train_num)
    emb_train = embedding[:n_train]
    emb_user = embedding[n_train:]
    
    # Plot 1: Standard Overlay
    plt.figure(figsize=(10, 8))
    plt.scatter(emb_train[:, 0], emb_train[:, 1], c='lightgray', s=10, alpha=0.3, label='Population Manifold')
    
    # Color user by predicted alignment
    align_colors = {'aligned': '#66bb6a', 'self_higher': '#ef5350', 'wearable_higher': '#42a5f5'}
    user_colors = [align_colors.get(a, 'black') for a in user_preds]
    
    plt.scatter(emb_user[:, 0], emb_user[:, 1], c=user_colors, s=80, edgecolor='white', linewidth=1, label='Live User Data')
    
    plt.title("Live User Mapping in Perception Space", fontsize=14, pad=15)
    plt.xlabel("UMAP 1")
    plt.ylabel("UMAP 2")
    
    import matplotlib.patches as mpatches
    handles = [
        mpatches.Patch(color='lightgray', label='Population Background'),
        mpatches.Patch(color='#66bb6a', label='User: Aligned'),
        mpatches.Patch(color='#ef5350', label='User: Over-perceiving (self_higher)'),
        mpatches.Patch(color='#42a5f5', label='User: Under-perceiving (wearable_higher)'),
    ]
    plt.legend(handles=handles, loc='best')
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, "live_user_umap_overlay.png"), dpi=200)
    plt.close()
    
    # Plot 2: Trajectory Line Mapping
    # Shows the "momentum" of the user through space
    plt.figure(figsize=(10, 8))
    plt.scatter(emb_train[:, 0], emb_train[:, 1], c='lightgray', s=10, alpha=0.3)
    
    plt.plot(emb_user[:, 0], emb_user[:, 1], c='black', alpha=0.4, linewidth=1, zorder=1)
    scatter = plt.scatter(emb_user[:, 0], emb_user[:, 1], c=np.arange(len(emb_user)), cmap='viridis', s=60, edgecolor='white', zorder=2)
    
    plt.colorbar(scatter, label='Days Since Start')
    plt.title("Live User Trajectory (Momentum) in Perception Space", fontsize=14)
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, "live_user_umap_trajectory.png"), dpi=200)
    plt.close()

    print(f"Data mapping complete! Plots stored in {output_dir}")

if __name__ == "__main__":
    user_file = "/Users/kikkiliu/physionet.org/files/mcphases/anonymized_user_pipeline_ready.csv"
    master_file = "/Users/kikkiliu/physionet.org/files/mcphases/data/synthetic_mcphases_fullschema.csv"
    out_dir = "/Users/kikkiliu/physionet.org/files/mcphases/eda_outputs/live_user_testing"
    generate_user_report(user_file, master_file, out_dir)
