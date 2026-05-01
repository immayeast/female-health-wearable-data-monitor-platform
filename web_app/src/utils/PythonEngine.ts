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
from recalibration_scores import RecalibrationArtifacts

# 1. Load the Research Brain
artifacts = joblib.load("research_model.joblib")

# 2. Read the user's uploaded data
df = pd.read_csv(io.StringIO(input_csv_content))

# 3. Preprocess user data (Map Likert if needed)
LIKERT_MAP = {"Not at all": 0, "Very Low/Little": 1, "Low": 2, "Moderate": 3, "High": 4, "Very High": 5}
if "stress" in df.columns and df["stress"].dtype == object:
    df["stress"] = df["stress"].map(LIKERT_MAP) * 20

# 4. Run Inference (Predict Gap)
# We use the GB model from artifacts to predict the gap for this user
X = df[artifacts.gb_features]
X_imp = artifacts.gb_imputer.transform(X)
X_sc = artifacts.gb_scaler.transform(X_imp)

predicted_gap = artifacts.gb_model.predict(X_sc)
adjusted_score = df["stress_score"] + predicted_gap

# 5. Format results for React
results = {
    "score": float(adjusted_score.iloc[-1]),
    "gap": float(predicted_gap[-1]),
    "phase": str(df["phase"].iloc[-1]) if "phase" in df.columns else "Unknown"
}
json.dumps(results)
`;

    const jsonResult = await this.pyodide.runPythonAsync(pythonCode);
    return JSON.parse(jsonResult);
  }

  status() {
    return { isLoaded: this.isLoaded, isLoading: this.isLoading };
  }
}

export const pythonEngine = new PythonEngine();
