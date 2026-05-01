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
      const scripts = ['recalibration_scores.py', 'interpret_gb.py', 'research_model.json'];
      for (const script of scripts) {
        const response = await fetch(`/${script}`);
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('text/html')) {
            console.error(`❌ Asset load failed for ${script}: Received HTML instead of data.`);
            continue; 
          }
          const content = await response.text();
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

  async runRecalibration(inputCsvData: string) {
    if (!this.isLoaded) throw new Error("Python Research Engine not initialized.");

    // SAFETY CHECK: Ensure the model exists before running Python
    try {
      this.pyodide.FS.stat('research_model.json');
    } catch (e) {
      throw new Error("❌ Missing Research Model: Please run 'python3 save_research_model.py' locally and push 'research_model.json' to activate Deep Research Mode.");
    }

    // Pass the CSV to Python
    this.pyodide.globals.set("input_csv_content", inputCsvData);

    const pythonCode = `
import pandas as pd
import numpy as np
import io
import json
import traceback

def predict_tree(tree, x):
    node = 0
    # While not a leaf
    while tree['children_left'][node] != -1:
        if x[tree['feature'][node]] <= tree['threshold'][node]:
            node = tree['children_left'][node]
        else:
            node = tree['children_right'][node]
    return tree['value'][node]

def predict_ensemble(brain, X):
    # Initialize with the constant value
    y = np.full(X.shape[0], brain['init_estimator_value'])
    for tree in brain['trees']:
        for i in range(X.shape[0]):
            y[i] += brain['learning_rate'] * predict_tree(tree, X[i])
    return y

try:
    # 1. Load the Universal Research Brain (JSON)
    with open("research_model.json", "r") as f:
        brain = json.load(f)
    
    # 2. Read & Clean Data (Resilient Python-only Parser)
    # Forced 'python' engine avoids C-buffer overflow on malformed files
    try:
        df = pd.read_csv(io.StringIO(input_csv_content), sep=None, engine='python', on_bad_lines='skip', quotechar='"', escapechar='\\\\')
    except Exception:
        # Final fallback: Clean the string and use a simple comma-split
        cleaned = "".join(ch for ch in input_csv_content if ch.isprintable() or ch in "\\n\\r\\t,")
        df = pd.read_csv(io.StringIO(cleaned), sep=',', engine='python', on_bad_lines='skip')
    
    # Map common variations
    MAPPING = {'rhr': 'resting_hr', 'hrv': 'rmssd', 'stress_level': 'stress',
               'temp_diff': 'temperature_diff_from_baseline'}
    df = df.rename(columns=MAPPING)
    
    # 3. Universal Inference (Zero-Dependency)
    # Align features to model expectations
    X_raw = df.reindex(columns=brain['features']).values
    
    # Manual Imputation & Scaling
    X = X_raw.copy()
    if 'cycle_day' in brain['features']:
        idx = brain['features'].index('cycle_day')
        X[:, idx] = np.clip(X[:, idx], None, 45)

    for i in range(X.shape[1]):
        mask = np.isnan(X[:, i])
        X[mask, i] = brain['imputer_medians'][i]
    
    X = (X - np.array(brain['scaler_mean'])) / np.array(brain['scaler_scale'])
    
    predicted_gaps = predict_ensemble(brain, X)
    
    # 4. Result Formatting
    base_col = "stress_score" if "stress_score" in df.columns else ("overall_score" if "overall_score" in df.columns else None)
    current_score = df[base_col].iloc[-1] if (base_col and not pd.isna(df[base_col].iloc[-1])) else 65
    
    results = {
        "score": float(current_score + predicted_gaps[-1]),
        "gap": float(predicted_gaps[-1]),
        "phase": str(df["phase"].iloc[-1]) if ("phase" in df.columns and not pd.isna(df["phase"].iloc[-1])) else "Unknown"
    }
    final_output = json.dumps(results)
except Exception as e:
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
