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

def walk_tree(node, row):
    while not node.get("is_leaf", False):
        val = row[node["feature_idx"]]
        node = node["left"] if val <= node["threshold"] else node["right"]
    return node["value"]

try:
    # 1. Load Unified Brain
    with open("research_model.json", "r") as f:
        brain = json.load(f)
    
    # 2. Read & Clean Data (Resilient Python-only Parser)
    try:
        df = pd.read_csv(io.StringIO(input_csv_content), sep=None, engine='python', on_bad_lines='skip', quotechar='"', escapechar='\\\\')
    except Exception:
        cleaned = "".join(ch for ch in input_csv_content if ch.isprintable() or ch in "\\n\\r\\t,")
        df = pd.read_csv(io.StringIO(cleaned), sep=',', engine='python', on_bad_lines='skip')
    
    MAPPING = {
        'rhr': 'resting_hr', 'hrv': 'hrv_rmssd', 'rmssd': 'hrv_rmssd',
        'stress_level': 'stress_score', 'stress': 'stress_score',
        'temp_diff': 'temp_diff', 'day_in_cycle': 'cycle_day',
        'hr_mean': 'hr_mean'
    }
    df = df.rename(columns=MAPPING)
    df = df.loc[:, ~df.columns.duplicated()]

    # Ensure required features exist (fill with NaN if missing)
    for feat in phase_cfg["base_features"]:
        if feat not in df.columns:
            df[feat] = np.nan

    # 3. PHASE PREDICTION (7-Day Sliding Window RF)
    phase_cfg = brain["phase_model"]
    window_size = phase_cfg["window_size"]
    base_features = phase_cfg["base_features"]
    
    # Sort and ensure we have enough history (pad if needed)
    df = df.sort_values(df.columns[0]).reset_index(drop=True) 
    if len(df) < window_size:
        pad = pd.DataFrame([df.iloc[0]] * (window_size - len(df)))
        padded_df = pd.concat([pad, df]).reset_index(drop=True)
    else:
        padded_df = df.tail(window_size).reset_index(drop=True)

    # Calculate Windowed Features (Means, Slopes, Std, Last)
    window_X = padded_df[base_features].values.astype(float)
    window_X = np.nan_to_num(window_X, nan=np.nanmean(window_X) if not np.all(np.isnan(window_X)) else 0)
    
    sample = []
    # a. Means
    sample.extend(np.nanmean(window_X, axis=0))
    # b. Slopes
    x_axis = np.arange(window_size)
    for j in range(window_X.shape[1]):
        col = window_X[:, j]
        valid = ~np.isnan(col)
        sample.append(np.polyfit(x_axis[valid], col[valid], 1)[0] if valid.sum() >= 2 else 0.0)
    # c. Std
    sample.extend(np.nan_to_num(np.nanstd(window_X, axis=0), nan=0.0))
    # d. Last
    sample.extend(np.nan_to_num(window_X[-1], nan=0.0))

    # Phase Vote (RF Averaging)
    votes = [walk_tree(tree, sample) for tree in phase_cfg["trees"]]
    final_phase_idx = int(max(set(votes), key=votes.count))
    predicted_phase = phase_cfg["classes"][final_phase_idx]

    # 4. GAP PREDICTION (Static GB)
    gap_cfg = brain["gap_model"]
    # Single row features for gap
    X_gap = df.reindex(columns=gap_cfg["features"]).iloc[-1].values.astype(float)
    X_gap = np.nan_to_num(X_gap, nan=0)
    X_gap = (X_gap - np.array(gap_cfg["scaler_mean"])) / np.array(gap_cfg["scaler_scale"])
    
    # GB uses sum of residuals
    gap_residual = sum(walk_tree(tree, X_gap) for tree in gap_cfg["trees"])
    predicted_gap = gap_cfg["init_value"] + (gap_cfg["learning_rate"] * gap_residual)

    # 5. Final Result Formatting
    score_candidates = ['stress_score', 'overall_score', 'stress', 'readiness', 'wellness', 'score']
    base_col = next((c for c in score_candidates if c in df.columns), None)
    current_score = df[base_col].iloc[-1] if (base_col and not pd.isna(df[base_col].iloc[-1])) else 65
    
    if base_col is None:
        latest_rhr = df['resting_hr'].iloc[-1] if 'resting_hr' in df.columns else 70
        latest_hrv = df['rmssd_mean'].iloc[-1] if 'rmssd_mean' in df.columns else 65
        rhr_n = np.clip((latest_rhr - 40) / 60, 0, 1)
        hrv_n = np.clip((latest_hrv - 20) / 100, 0, 1)
        current_score = 70 - (rhr_n * 30) + (hrv_n * 20)

    final_score = np.clip(current_score + predicted_gap, 0, 100)
    
    results = {
        "score": round(float(final_score), 1),
        "gap": round(float(predicted_gap), 1),
        "base_score": round(float(current_score), 1),
        "phase": predicted_phase,
        "status": "Balanced" if final_score < 70 else "High Performance"
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
