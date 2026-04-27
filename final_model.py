import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import f1_score, accuracy_score, classification_report, confusion_matrix
import warnings
warnings.filterwarnings('ignore')

# ============================================================
# 1. 核心配置 (CONFIG)
# ============================================================
OLD_DATA_DIR = "/Users/ryan/Desktop/mcphase_data"   # 旧数据文件夹路径 (训练集)
NEW_DATA_PATH = "/Users/ryan/Desktop/synthetic_mcphases_fullschema.csv" # 新数据文件路径 (测试集)
WINDOW_SIZE = 7                                     # 锁定 7天 滑窗
RANDOM_STATE = 42

# ============================================================
# 2. 特征工程与数据处理函数
# ============================================================
def add_day_in_cycle(df):
    """根据月经期(Menstrual)计算周期天数，并生成正弦/余弦周期特征"""
    df = df.sort_values(['id', 'day_in_study']).copy()
    df['day_in_cycle'] = 0
    for person_id in df['id'].unique():
        mask = df['id'] == person_id
        person = df.loc[mask].copy()
        phases = person['phase'].values
        cycle_day = 1
        for i in range(len(phases)):
            if i > 0 and phases[i] == 'Menstrual' and phases[i-1] != 'Menstrual':
                cycle_day = 1
            df.loc[person.index[i], 'day_in_cycle'] = cycle_day
            cycle_day += 1
            
    avg_cycle = 28.0
    df['day_in_cycle_sin'] = np.sin(2 * np.pi * df['day_in_cycle'] / avg_cycle)
    df['day_in_cycle_cos'] = np.cos(2 * np.pi * df['day_in_cycle'] / avg_cycle)
    return df

def apply_imputation(df, feature_cols):
    """三级插值法：按(人+生理期)中位数 -> 按(人)中位数 -> 全局中位数 -> 补0"""
    df_clean = df.copy()
    for col in feature_cols:
        df_clean[col] = df_clean.groupby(['id', 'phase'])[col].transform(lambda x: x.fillna(x.median()))
        df_clean[col] = df_clean.groupby('id')[col].transform(lambda x: x.fillna(x.median()))
        global_median = df_clean[col].median()
        if pd.isna(global_median):
            global_median = 0.0
        df_clean[col] = df_clean[col].fillna(global_median)
    return df_clean

def create_sliding_windows(df, feature_cols, window_size=7):
    """生成包含均值、斜率(趋势)、标准差和最新值的滑窗特征 (带Padding防数据丢失)"""
    all_samples, all_labels = [], []
    
    for person_id in sorted(df['id'].unique()):
        person_data = df[df['id'] == person_id].sort_values('day_in_study')
        person_features = person_data[feature_cols].values.astype(float)
        person_labels = person_data['phase_encoded'].values
        
        if len(person_features) == 0:
            continue
            
        pad_size = window_size - 1
        if pad_size > 0:
            pad_features = np.tile(person_features[0], (pad_size, 1))
            padded_features = np.vstack([pad_features, person_features])
        else:
            padded_features = person_features

        for i in range(len(person_data)):
            end_idx = i + pad_size
            start_idx = end_idx - window_size + 1
            
            window = padded_features[start_idx : end_idx + 1]
            sample_features = []
            
            # 1. 滑窗均值
            sample_features.extend(np.nanmean(window, axis=0))
            
            # 2. 滑窗趋势斜率
            x = np.arange(window_size)
            slopes = []
            for j in range(window.shape[1]):
                col = window[:, j]
                valid = ~np.isnan(col)
                if valid.sum() >= 2:
                    slopes.append(np.polyfit(x[valid], col[valid], 1)[0])
                else:
                    slopes.append(0.0)
            sample_features.extend(slopes)
            
            # 3. 滑窗标准差 & 4. 最新一天数值
            sample_features.extend(np.nan_to_num(np.nanstd(window, axis=0), nan=0.0))
            sample_features.extend(np.nan_to_num(window[-1], nan=0.0))
            
            all_samples.append(sample_features)
            all_labels.append(person_labels[i])

    X = np.nan_to_num(np.array(all_samples), nan=0.0, posinf=0.0, neginf=0.0)
    y = np.array(all_labels)
    
    feature_names = ([f"{c}_wmean" for c in feature_cols] + 
                     [f"{c}_wslope" for c in feature_cols] + 
                     [f"{c}_wstd" for c in feature_cols] + 
                     [f"{c}_last" for c in feature_cols])
              
    return X, y, feature_names

# ============================================================
# 3. 数据加载与对齐管道
# ============================================================
def load_and_align_datasets():
    print("=" * 60)
    print("STAGE 1: Loading & Cleaning Old Data (Train Set)")
    print("=" * 60)
    
    # 基础与自述数据
    df_old = pd.read_csv(os.path.join(OLD_DATA_DIR, 'hormones_and_selfreport.csv')).dropna(subset=['phase'])
    ordinal_map = {'Not at all': 0, 'Very Low/Little': 1, 'Low': 2, 'Moderate': 3, 'High': 4, 'Very High': 5}
    symptom_cols = ['appetite', 'exerciselevel', 'headaches', 'cramps', 'sorebreasts', 'fatigue', 'sleepissue', 'moodswing', 'stress', 'foodcravings', 'indigestion', 'bloating']
    for col in symptom_cols:
        if df_old[col].dtype == object: df_old[col] = df_old[col].map(ordinal_map)
    if df_old['flow_volume'].dtype == object: df_old['flow_volume'] = df_old['flow_volume'].map({'Not at all': 0, 'Very Low/Little': 1, 'Low': 2, 'Moderate': 3, 'High': 4, 'Very High': 5}).fillna(0)
    if df_old['flow_color'].dtype == object: df_old['flow_color'] = df_old['flow_color'].map({'Not at all': 0, 'Pink': 1, 'Red': 2, 'Dark Red': 3, 'Brown': 4}).fillna(0)
    if 'pdg' in df_old.columns: df_old = df_old.drop(columns=['pdg'])

    # 标签编码
    le = LabelEncoder()
    df_old['phase_encoded'] = le.fit_transform(df_old['phase'])

    # 穿戴设备数据汇总
    hr = pd.read_csv(os.path.join(OLD_DATA_DIR, 'heart_rate.csv')).groupby(['id', 'day_in_study'])['bpm'].agg(hr_mean='mean', hr_min='min', hr_max='max', hr_std='std').reset_index()
    temp = pd.read_csv(os.path.join(OLD_DATA_DIR, 'wrist_temperature.csv')).groupby(['id', 'day_in_study'])['temperature_diff_from_baseline'].agg(temp_mean='mean', temp_min='min', temp_max='max', temp_std='std').reset_index()
    sleep_cols = ['overall_score', 'composition_score', 'revitalization_score', 'duration_score', 'deep_sleep_in_minutes', 'resting_heart_rate', 'restlessness']
    sleep = pd.read_csv(os.path.join(OLD_DATA_DIR, 'sleep_score.csv')).groupby(['id', 'day_in_study'])[sleep_cols].mean().reset_index()
    sleep.columns = ['id', 'day_in_study'] + ['sleep_' + c for c in sleep_cols]
    stress = pd.read_csv(os.path.join(OLD_DATA_DIR, 'stress_score.csv')).groupby(['id', 'day_in_study'])['stress_score'].mean().reset_index().rename(columns={'stress_score': 'daily_stress_score'})
    rhr = pd.read_csv(os.path.join(OLD_DATA_DIR, 'resting_heart_rate.csv')).groupby(['id', 'day_in_study'])['value'].mean().reset_index().rename(columns={'value': 'resting_hr'})
    resp = pd.read_csv(os.path.join(OLD_DATA_DIR, 'respiratory_rate_summary.csv')).groupby(['id', 'day_in_study'])[['full_sleep_breathing_rate', 'deep_sleep_breathing_rate']].mean().reset_index().rename(columns={'full_sleep_breathing_rate': 'resp_full_sleep', 'deep_sleep_breathing_rate': 'resp_deep_sleep'})
    hrv = pd.read_csv(os.path.join(OLD_DATA_DIR, 'heart_rate_variability_details.csv')).groupby(['id', 'day_in_study'])[['rmssd', 'low_frequency', 'high_frequency']].mean().reset_index().rename(columns={'rmssd': 'hrv_rmssd', 'low_frequency': 'hrv_lf', 'high_frequency': 'hrv_hf'})

    for frame in [hr, temp, sleep, stress, rhr, resp, hrv]:
        df_old = df_old.merge(frame, on=['id', 'day_in_study'], how='left')

    df_old = add_day_in_cycle(df_old)
    
    print("\n" + "=" * 60)
    print("STAGE 2: Loading & Cleaning New Data (Test Set)")
    print("=" * 60)
    df_new = pd.read_csv(NEW_DATA_PATH).dropna(subset=['phase'])
    df_new['phase_encoded'] = le.transform(df_new['phase']) 
    if 'day_in_cycle' not in df_new.columns:
        df_new = add_day_in_cycle(df_new)

    # 提取公共特征
    drop_cols = ['study_interval', 'is_weekend', 'phase', 'phase_encoded', 'id', 'day_in_study']
    old_cols = set([c for c in df_old.columns if c not in drop_cols])
    new_cols = set([c for c in df_new.columns if c not in drop_cols])
    common_features = sorted(list(old_cols.intersection(new_cols)))

    print("Applying imputation strategy...")
    df_old = apply_imputation(df_old, common_features)
    df_new = apply_imputation(df_new, common_features)

    return df_old, df_new, common_features, le

# ============================================================
# 4. 可视化函数
# ============================================================
def plot_dual_confusion_matrix(y_train_true, y_train_pred, y_test_true, y_test_pred, classes):
    cm_train = confusion_matrix(y_train_true, y_train_pred, labels=range(len(classes)))
    cm_test = confusion_matrix(y_test_true, y_test_pred, labels=range(len(classes)))
    
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))
    
    sns.heatmap(cm_train, annot=True, fmt='d', cmap='Blues', xticklabels=classes, yticklabels=classes, ax=axes[0])
    axes[0].set_title('Training Set (Old Data) Performance')
    axes[0].set_xlabel('Predicted Phase')
    axes[0].set_ylabel('Actual Phase')

    sns.heatmap(cm_test, annot=True, fmt='d', cmap='Greens', xticklabels=classes, yticklabels=classes, ax=axes[1])
    axes[1].set_title('Testing Set (New Data) Performance')
    axes[1].set_xlabel('Predicted Phase')
    axes[1].set_ylabel('Actual Phase')

    plt.tight_layout()
    plt.savefig('final_confusion_matrix.png', dpi=150, bbox_inches='tight')
    print("\n  >> Saved confusion matrix plot as: final_confusion_matrix.png")
    plt.show()

# ============================================================
# 5. MAIN 主程序
# ============================================================
def main():
    df_old, df_new, common_features, le = load_and_align_datasets()
    
    print("\n" + "=" * 60)
    print(f"STAGE 3: Extracting Sliding Windows (W={WINDOW_SIZE})")
    print("=" * 60)
    X_train, y_train, feature_names = create_sliding_windows(df_old, common_features, WINDOW_SIZE)
    X_test, y_test, _ = create_sliding_windows(df_new, common_features, WINDOW_SIZE)
    print(f"  Training Set: {X_train.shape[0]} samples | Testing Set: {X_test.shape[0]} samples")

    print("\n" + "=" * 60)
    print("STAGE 4: Training Final Optimized Random Forest")
    print("=" * 60)
    
    # 【终极策略：精准克制】打压易孕期误报，提升月经期敏感度
    best_weights = {
        le.transform(['Fertility'])[0]: 0.6, 
        le.transform(['Follicular'])[0]: 1.5, 
        le.transform(['Luteal'])[0]: 1.0, 
        le.transform(['Menstrual'])[0]: 2.5
    }
    
    # 加入深度限制(max_depth)防止死记硬背
    rf = RandomForestClassifier(
        n_estimators=300, 
        max_depth=10, 
        min_samples_leaf=5, 
        random_state=RANDOM_STATE, 
        n_jobs=-1, 
        class_weight=best_weights
    )
    rf.fit(X_train, y_train)
    print("  Model Training Complete.")
    
    print("\n" + "=" * 60)
    print("STAGE 5: Final Evaluation Report")
    print("=" * 60)
    
    y_train_pred = rf.predict(X_train)
    y_test_pred = rf.predict(X_test)
    
    print(f"  Overall Accuracy (Test): {accuracy_score(y_test, y_test_pred):.4f}")
    print(f"  Macro F1 Score (Test):   {f1_score(y_test, y_test_pred, average='macro'):.4f}")
    
    print("\nClassification Report (Test Data):")
    print(classification_report(y_test, y_test_pred, target_names=le.classes_))
        
    print("\nTop 15 Feature Importances:")
    importances = rf.feature_importances_
    indices = np.argsort(importances)[::-1]
    print(f"  {'Rank':>4s}  {'Feature Name':40s}  {'Importance':>12s}")
    print("  " + "-" * 60)
    for i in range(min(15, len(indices))):
        print(f"  #{i+1:3d}  {feature_names[indices[i]]:40s}  {importances[indices[i]]:12.6f}")

    plot_dual_confusion_matrix(y_train, y_train_pred, y_test, y_test_pred, le.classes_)

if __name__ == "__main__":
    main()