import pandas as pd
from script4_phase_models import train_df, val_df, master, OUT_DIR
from recalibration_scores import run_recalibration_pipeline
from interpret_gb import execute_gb_interpretability

print("Running recal...")
adjusted_df, artifacts = run_recalibration_pipeline(
    master, score_col="stress_score", train_df=train_df, val_df=val_df, self_report_col="stress"
)

print("Running interpret...")
try:
    execute_gb_interpretability(
        artifacts.gb_model, artifacts.gb_imputer, artifacts.gb_scaler,
        train_df, val_df, artifacts.gb_features, OUT_DIR
    )
except Exception as e:
    import traceback
    traceback.print_exc()
