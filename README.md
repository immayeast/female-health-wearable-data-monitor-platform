# 💪 Female Health Wearable Data Monitor Platform

A full-stack system for analyzing, modeling, and visualizing menstrual health using multimodal physiological data from wearable devices and self-reports.

This project integrates:

* Machine learning on physiological + hormonal data
* Backend validation and statistical testing
* Interactive frontend visualization for personalized insights

---

## 📌 Overview

This platform is built on top of the **mcPHASES dataset**, a multimodal menstrual health dataset containing physiological signals, hormone measurements, and self-reported symptoms collected from wearable devices and surveys.

* 📄 Dataset: [mcPHASES dataset (PhysioNet)](https://www.physionet.org/content/mcphases/?utm_source=chatgpt.com)
* 📄 Paper: [https://doi.org/10.13026/zx6a-2c81](https://doi.org/10.13026/zx6a-2c81)

The dataset provides a **longitudinal, multimodal record** of menstrual health, integrating:

* Wearable physiological signals (e.g., heart rate, sleep, temperature)
* Hormonal measurements (LH, E3G, PdG)
* Continuous glucose monitoring
* Self-reported symptoms and behavioral data ([Nature][1])

It includes data from **42 participants across multiple study periods**, organized into structured tables for cross-modal analysis ([Nature][1]).

---

## ⚠️ Data Access (IMPORTANT)

This project **does NOT include the dataset**.

The mcPHASES dataset is hosted on PhysioNet and is **restricted access**.

To obtain the data, you must:

1. Create an account on PhysioNet
2. Agree to the **PhysioNet Restricted Health Data Use Agreement (DUA)**
3. Request access to the dataset

👉 [Access dataset on PhysioNet](https://www.physionet.org/content/mcphases/?utm_source=chatgpt.com)

### Key restrictions from the agreement:

* You **must not attempt to identify individuals**
* You **must not share the data**
* You must ensure **secure storage and handling**
* Data can only be used for **scientific research purposes** ([PhysioNet][2])

---

## 🧠 Project Goals

This system is designed to:

* Model relationships between **hormones, physiology, and symptoms**
* Develop predictive models for:

  * menstrual cycle phases
  * physiological trends
  * health indicators
* Provide **personalized insights** through a user-facing interface
* Enable **research-grade validation and reproducibility**

---

## 🏗️ System Architecture

```text
Frontend (Netlify / React)
        ↓
Backend API (FastAPI / Railway)
        ↓
ML Models + Validation Pipeline
        ↓
Local / Secure Data Storage (PhysioNet data)
```

---

## 📂 Repository Structure

```text
backend/        # ML models, API, validation pipeline
frontend/       # UI dashboard and visualization
docs/           # system design, data governance, validation
experiments/    # model experiments and reports
evaluation/     # metrics and statistical testing
```

---

## ⚙️ Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/immayeast/female-health-wearable-data-monitor-platform.git
cd female-health-wearable-data-monitor-platform
```

---

### 2. Install backend dependencies

```bash
cd backend
pip install -r requirements.txt
```

---

### 3. Download dataset (after approval)

⚠️ You must first obtain access from PhysioNet.

Then download locally:

```bash
wget -c https://physionet.org/files/mcphases/1.0.0/calories.csv
```

Recommended: use resume + retry

```bash
wget -c -t 10 https://physionet.org/files/mcphases/1.0.0/<file>.csv
```

---

### 4. Set environment variables

Create `.env`:

```bash
PHYSIONET_DATA_DIR=/path/to/data
```

---

### 5. Run backend

```bash
uvicorn src.api.main:app --reload
```

---

### 6. Run frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 📊 Features (Planned / In Progress)

* [ ] Data ingestion pipeline
* [ ] Feature engineering across modalities
* [ ] ML models for prediction and trend analysis
* [ ] Statistical validation (significance testing, robustness)
* [ ] Personalized dashboard (user vs population baseline)
* [ ] Recommendation system

---

## 🔒 Privacy & Ethics

This project follows strict data governance principles:

* No raw PhysioNet data is stored in this repository
* All sensitive data must remain **local and secure**
* Outputs are **aggregated and anonymized**
* Intended for **research and educational purposes only**

---

## 📖 Citation

If you use this dataset, please cite:

> Lin et al., *mcPHASES: A Dataset of Physiological, Hormonal, and Self-reported Events and Symptoms for Menstrual Health Tracking with Wearables*, PhysioNet (2025)

DOI: [https://doi.org/10.13026/zx6a-2c81](https://doi.org/10.13026/zx6a-2c81)

---

## 🚀 Future Work

* Real-time wearable integration
* Cycle phase prediction models
* Cross-user similarity modeling
* Deployment for clinical / consumer applications

---

## 👩‍💻 Author

Kikki Liu
NYU Data Science

---

[1]: https://www.nature.com/articles/s41597-026-06805-3?utm_source=chatgpt.com "A longitudinal dataset of physiological, hormonal ..."
[2]: https://physionet.org/content/mcphases/view-dua/1.0.0/?utm_source=chatgpt.com "PhysioNet Restricted Health Data Use Agreement 1.5.0"
