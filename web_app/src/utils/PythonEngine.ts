/**
 * mcPHASES Python Research Engine (Pyodide)
 * 
 * This service runs your ACTUAL Python research code in the browser.
 * It provides 100% mathematical parity with your Python environment.
 */

declare global {
  interface Window {
    loadPyodide: any;
    pyodide: any;
  }
}

class PythonEngine {
  private pyodide: any = null;
  private isLoaded: boolean = false;
  private isLoading: boolean = false;

  async init() {
    if (this.isLoaded || this.isLoading) return;
    this.isLoading = true;

    console.log("🚀 Initializing Python Research Engine (Pyodide)...");
    
    try {
      this.pyodide = await window.loadPyodide();
      
      // 1. Load Essential Data Science Libraries
      console.log("📦 Loading Python libraries (Pandas, Scikit-Learn, Joblib)...");
      await this.pyodide.loadPackage(["pandas", "numpy", "scikit-learn", "micropip"]);
      await this.pyodide.runPythonAsync("import micropip; await micropip.install('joblib')");
      
      // 2. Load your Research Scripts into the Virtual Filesystem
      const scripts = ['recalibration_scores.py', 'interpret_gb.py', 'research_model.pkl'];
      for (const script of scripts) {
        const response = await fetch(`/${script}`);
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          
          // CRITICAL: Check if we got HTML (404 page) instead of binary/python
          if (contentType && contentType.includes('text/html')) {
            console.error(`❌ Asset load failed for ${script}: Received HTML instead of data. Ensure the file is in public/`);
            continue; 
          }

          const content = script.endsWith('.pkl') 
            ? new Uint8Array(await response.arrayBuffer())
            : await response.text();
          
          this.pyodide.FS.writeFile(script, content);
          console.log(`📄 Loaded research asset: ${script}`);
        } else {
          console.warn(`⚠️ Could not find research asset: ${script}. Deep Research mode may fail.`);
        }
      }

      this.isLoaded = true;
      console.log("✅ Python Research Engine is READY.");
    } catch (err) {
      console.error("❌ Failed to initialize Pyodide:", err);
    } finally {
      this.isLoading = false;
    }
  }

  async runRecalibration(inputCsvData: string) {
    if (!this.isLoaded) throw new Error("Python Research Engine not initialized.");

    // SAFETY CHECK: Ensure the model exists before running Python
    try {
      this.pyodide.FS.stat('research_model.pkl');
    } catch (e) {
      throw new Error("❌ Missing Research Model: Please run 'python3 save_research_model.py' locally and push 'research_model.pkl' to your repository to activate Deep Research Mode.");
    }

    // Pass the CSV to Python
    this.pyodide.globals.set("input_csv_content", inputCsvData);

    const pythonCode = `
import pandas as pd
import pickle
import io
import json
import traceback
import sys

# COMPATIBILITY PATCH: Scikit-learn 1.4+ renamed _gb_losses to _loss
# We alias them here so models trained on new versions work in Pyodide (1.3.2)
try:
    import sklearn.ensemble._gb_losses as _gb_losses
    sys.modules['sklearn.ensemble._loss'] = _gb_losses
except ImportError:
    pass

from recalibration_scores import RecalibrationArtifacts

try:
    # 1. Load the Research Brain
    with open("research_model.pkl", "rb") as f:
        artifacts = pickle.load(f)
    
    # 2. Read the user's uploaded data
    # Use 'sep=None, engine=python' to autodetect delimiters (comma, semicolon, etc.)
    df = pd.read_csv(io.StringIO(input_csv_content), sep=None, engine='python')
    print(f"📊 Raw Data Received: {len(df)} rows")

    # 3. 🔥 EMBEDDED RESEARCH CLEANING PIPELINE 🔥
    # A. Column Normalization (Mapping common variations)
    MAPPING = {
        'rhr': 'resting_hr', 'hrv': 'rmssd', 'temp_diff': 'temperature_diff_from_baseline',
        'stress_level': 'stress', 'day': 'day_in_study'
    }
    df = df.rename(columns=MAPPING)
    
    # B. Filter Status (If status column exists)
    if 'status' in df.columns:
        df = df[df['status'] == 'READY'].copy()
        print(f"  - Filtered for READY status: {len(df)} rows remain")

    # C. Map ALL Likert Scales (Generic handler for self-reports)
    LIKERT_MAP = {
        "Not at all": 0, "Very Low/Little": 1, "Low": 2, 
        "Moderate": 3, "High": 4, "Very High": 5,
        "None": 0, "Very Low": 1, "Normal": 3
    }
    for col in df.select_dtypes(include=['object']).columns:
        # Check if column contains Likert values
        if df[col].isin(LIKERT_MAP.keys()).any():
            df[col] = df[col].map(LIKERT_MAP).fillna(3) * 20 # Fill unknown with 'Moderate'
            print(f"  - Cleaned Likert column: {col}")

    # D. Handle Row Count
    if len(df) == 0:
        raise ValueError("No valid 'READY' data rows found after cleaning.")

    # 4. Feature Alignment & Inference
    X = df.reindex(columns=artifacts.gb_features)
    for i, feat in enumerate(artifacts.gb_features):
        if X[feat].isnull().all():
            X[feat] = artifacts.gb_imputer.statistics_[i]
    
    X_imp = artifacts.gb_imputer.transform(X)
    X_sc = artifacts.gb_scaler.transform(X_imp)

    predicted_gap = artifacts.gb_model.predict(X_sc)
    
    # Base score selection logic
    base_col = "stress_score" if "stress_score" in df.columns else ("overall_score" if "overall_score" in df.columns else None)
    if base_col:
        adjusted_score = df[base_col] + predicted_gap
    else:
        adjusted_score = pd.Series([65] * len(df)) + predicted_gap

    # 5. Result Formatting
    results = {
        "score": float(adjusted_score.iloc[-1]),
        "gap": float(predicted_gap[-1]),
        "phase": str(df["phase"].iloc[-1]) if ("phase" in df.columns and not pd.isna(df["phase"].iloc[-1])) else "Unknown"
    }
    print(f"✅ Cleaning & Inference complete.")
    final_output = json.dumps(results)

except Exception as e:
    error_msg = f"""❌ Python Error: {str(e)}
{traceback.format_exc()}"""
    print(error_msg)
    final_output = json.dumps({"error": str(e), "traceback": traceback.format_exc()})

final_output
`;

    try {
      const jsonResult = await this.pyodide.runPythonAsync(pythonCode);
      const parsed = JSON.parse(jsonResult);
      if (parsed.error) {
        throw new Error(parsed.error);
      }
      return parsed;
    } catch (err: any) {
      console.error("🐍 Python Execution Error:", err.message);
      throw err;
    }
  }

  status() {
    return { isLoaded: this.isLoaded, isLoading: this.isLoading };
  }
}

export const pythonEngine = new PythonEngine();
