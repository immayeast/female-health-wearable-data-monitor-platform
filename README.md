# mcPHASES: The Truth Gap Platform
### *Clinical-Grade Physiological Recalibration Engine*

**mcPHASES** is a high-fidelity research platform designed to reconcile the **"Truth Gap"**—the mathematical divergence between subjective stress perception and objective wearable physiology. Built on a foundation of longitudinal female health data, the platform utilizes advanced Gradient Boosting models to recalibrate wearable scores in real-time.

---

## 🔬 The Research Hypothesis: The "Truth Gap"
Wearable devices often provide a "black box" stress or readiness score that fails to account for individual hormonal baselines. Our research identifies that the gap between how a user *feels* and what their sensors *report* is **100% state-dependent (ICC=0)**. While physiological baselines shift with the menstrual cycle (p=0.61 for phase-driven gap variance), the perception gap itself requires a dynamic, rather than static, recalibration strategy.

---

## 🧠 Model Inventory & Logic

The mcPHASES ecosystem utilizes a multi-model ensemble to reconcile physiological state with user perception:

### 1. Research Recalibration Models (User-Built)
These models form the core "Truth Gap" engine, trained on longitudinal participant data:
- **Gradient Boosting (GB) Regressor**: The primary high-fidelity engine (R²=0.89) used to predict the **Signed Perception Gap**. It utilizes 12 physiological features including HRV deltas and RHR trends.
- **Lasso (Linear) Baseline**: A secondary regularization model used to identify the most stable feature weights for baseline recalibration.
- **Within-Person Z-Scoring**: A normalization strategy that centers all inferences on individual baselines rather than population means.

### 2. Phase & State Detection (Support Models)
Models used to provide context for the recalibration engine:
- **Random Forest Phase Detector**: A 7-day sliding window model that classifies the current menstrual phase (Menstrual, Follicular, Fertility, Luteal) with high temporal resolution.
- **HDBSCAN State Clustering**: An unsupervised learning layer used to discover perception subtypes and "state regimes" across the participant pool.

### 3. Hormonal Signature Inference
A bio-mathematical model that predicts hormonal markers:
- **LH, Estrogen, & PdG Signatures**: Inferred using a combination of cycle-day tracking and physiological intensity (HRV/RHR interaction).

---

## 🛠 Technical Stack
- **Frontend**: React (Vite) + Framer Motion (Neumorphic UI).
- **Engine**: **Pyodide** (WebAssembly Python) running actual Scikit-Learn trees in the browser.
- **Data Science**: Pandas, NumPy, Scikit-Learn.
- **Deployment**: Netlify (CI/CD with TypeScript validation).

---

## 🚀 Usage & Deployment

### 1. Setup Environment
```bash
git clone [repository-url]
cd female-health-wearable-data-monitor-platform
cd web_app
npm install
```

### 2. Data Acquisition (PhysioNet)
The research engine relies on the **mcPHASES** dataset (PMC7141121). To acquire the raw data:
1. Download the dataset from [PhysioNet](https://physionet.org/content/mcphases/1.0.0/).
2. Place the extracted `data/` folder into your local `/physionet.org/files/mcphases/` directory.
3. Ensure your local paths in `save_research_model.py` match your directory structure.

### 3. Exporting the Research Model
Whenever you update your Gradient Boosting parameters in the Python environment, you MUST push them to the web engine:
```bash
python3 save_research_model.py
```
This deconstructs your trained Scikit-Learn trees into the JSON "Brain" (`research_model.json`) used by the Pyodide engine.

### 4. Version Control & Git Workflow
To push your latest research and UI updates to the live platform:
```bash
# 1. Stage your changes
git add .

# 2. Commit with a descriptive research note
git commit -m "chore: Update GB trees and refine HRV-to-RHR gap logic"

# 3. Push to main (triggers Netlify CI/CD)
git push origin main
```
*Note: The `.gitignore` is pre-configured to exclude all raw data files to maintain HIPAA/GDPR compliance.*

### 5. Local Development
```bash
cd web_app
npm run dev
```

### 4. Data Format Requirements
The platform expects a CSV (e.g., `user.csv`) with at least 30 days of data including:
- `rmssd` / `hrv`: Heart Rate Variability.
- `resting_hr`: Resting Heart Rate.
- `cycle_day`: Current day in menstrual cycle.
- `stress_score`: The original "Wearable" score to be recalibrated.

---

## 🧬 Deployment Strategy
- **Master Build**: The root `netlify.toml` handles the monolithic build of the React app and asset serving.
- **Indestructible Parser**: The CSV ingestion layer features fuzzy-header matching and universal newline sanitation to handle raw exports from diverse wearable ecosystems (Apple Health, Fitbit, Oura).

---

## 📊 Evaluation & Interpretability
The platform supports **SHAP-style** interpretability. By viewing the **"Drivers"** and **"Alignment"** screens, researchers can see exactly which physiological features (e.g., "Shifted -12% due to low HRV recovery") are driving the recalibration.

**Research Status**: Production-Ready / Deep Research Mode Locked.
