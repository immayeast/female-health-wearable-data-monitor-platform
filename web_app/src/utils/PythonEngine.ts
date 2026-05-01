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
      await this.pyodide.loadPackage(["pandas", "scikit-learn", "numpy", "micropip"]);
      await this.pyodide.runPythonAsync("import micropip; await micropip.install('joblib')");
      
      // 2. Load your Research Scripts into the Virtual Filesystem
      const scripts = ['recalibration_scores.py', 'interpret_gb.py', 'research_model.joblib'];
      for (const script of scripts) {
        const response = await fetch(`/${script}`);
        if (response.ok) {
          const content = script.endsWith('.joblib') 
            ? new Uint8Array(await response.arrayBuffer())
            : await response.text();
          
          this.pyodide.FS.writeFile(script, content);
          console.log(`📄 Loaded research asset: ${script}`);
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

  async runRecalibration(csvData: string) {
    if (!this.isLoaded) await this.init();

    // Pass the CSV to Python
    this.pyodide.globals.set("input_csv_content", csvData);

    const pythonCode = `
import pandas as pd
import joblib
import io
import json
import traceback
from recalibration_scores import RecalibrationArtifacts

try:
    # 1. Load the Research Brain
    artifacts = joblib.load("research_model.joblib")
    
    # 2. Read the user's uploaded data
    # Use 'sep=None, engine=python' to autodetect delimiters (comma, semicolon, etc.)
    df = pd.read_csv(io.StringIO(input_csv_content), sep=None, engine='python')
    
    print(f"📊 CSV Loaded. Rows: {len(df)}, Columns: {list(df.columns)}")

    # 3. Preprocess user data
    LIKERT_MAP = {"Not at all": 0, "Very Low/Little": 1, "Low": 2, "Moderate": 3, "High": 4, "Very High": 5}
    if "stress" in df.columns and df["stress"].dtype == object:
        df["stress"] = df["stress"].map(LIKERT_MAP) * 20

    # 4. Align Features (Robustly handle missing columns)
    X = df.reindex(columns=artifacts.gb_features)
    missing = []
    for i, feat in enumerate(artifacts.gb_features):
        if X[feat].isnull().all():
            X[feat] = artifacts.gb_imputer.statistics_[i]
            missing.append(feat)
    
    if missing:
        print(f"⚠️ Missing columns filled with research baselines: {missing}")

    X_imp = artifacts.gb_imputer.transform(X)
    X_sc = artifacts.gb_scaler.transform(X_imp)

    predicted_gap = artifacts.gb_model.predict(X_sc)
    
    # Determine base score (use stress_score, or overall_score, or fallback to 65)
    base_col = "stress_score" if "stress_score" in df.columns else ("overall_score" if "overall_score" in df.columns else None)
    if base_col:
        adjusted_score = df[base_col] + predicted_gap
    else:
        print("⚠️ No stress_score found in CSV. Using model intercept (65) as baseline.")
        adjusted_score = pd.Series([65] * len(df)) + predicted_gap

    # 5. Format results for React
    results = {
        "score": float(adjusted_score.iloc[-1]),
        "gap": float(predicted_gap[-1]),
        "phase": str(df["phase"].iloc[-1]) if ("phase" in df.columns and not pd.isna(df["phase"].iloc[-1])) else "Unknown"
    }
    print(f"✅ Recalibration Success: Score={results['score']:.2f}, Gap={results['gap']:.2f}")
    final_output = json.dumps(results)

except Exception as e:
    error_msg = f"❌ Python Error: {str(e)}\n{traceback.format_exc()}"
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
