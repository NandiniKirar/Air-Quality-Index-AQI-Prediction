# 🌫️ AQI Prediction System

[![Python](https://img.shields.io/badge/Python-3.11-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688.svg)](https://fastapi.tiangolo.com/)
[![Streamlit](https://img.shields.io/badge/Streamlit-1.35-FF4B4B.svg)](https://streamlit.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-18%20passing-brightgreen.svg)](tests/)
[![Code style: black](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/psf/black)

An end-to-end, production-style Machine Learning system that predicts the **Air Quality Index (AQI)**
from environmental sensor readings (PM2.5, PM10, NO2, SO2, CO, O3, temperature, humidity, wind speed).

Built to demonstrate the full ML lifecycle: data generation/cleaning → EDA → feature engineering →
multi-model training & tuning → evaluation → REST API → interactive dashboard → containerized deployment.

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Folder Structure](#-folder-structure)
- [Screenshots](#-screenshots)
- [Installation](#-installation)
- [Usage](#-usage)
- [REST API](#-rest-api)
- [Model Details](#-model-details)
- [Results](#-results)
- [Testing](#-testing)
- [Docker Deployment](#-docker-deployment)
- [Future Improvements](#-future-improvements)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🧭 Overview

Air pollution monitoring stations report raw pollutant concentrations, but the public-facing metric
that actually communicates risk is the **Air Quality Index (AQI)**. This project builds a complete
system that:

1. Cleans and engineers features from raw sensor data.
2. Trains and compares **11 regression algorithms**.
3. Automatically selects and hyperparameter-tunes the best one.
4. Serves predictions via a **FastAPI REST API**.
5. Visualizes predictions in an interactive **Streamlit dashboard** with AQI category, health advice,
   and a live gauge chart.
6. Ships with Docker, automated tests, logging, and CI-ready structure.

> **Dataset note:** This environment doesn't have live internet access to pull a dataset from
> Kaggle/UCI/data.gov, so `src/generate_data.py` synthesizes a realistic dataset by simulating
> pollutant concentrations within real-world observed ranges and computing AQI using the **actual
> CPCB sub-index breakpoint formula** (piecewise linear interpolation) — the same method India's
> Central Pollution Control Board uses. To use a real dataset instead, drop a CSV with columns
> `PM2_5, PM10, NO2, SO2, CO, O3, Temperature, Humidity, WindSpeed, AQI` into `data/aqi_data.csv`
> and skip the generation step — the rest of the pipeline is dataset-agnostic.

---

## 🏗 Architecture

```
                     ┌────────────────────┐
                     │   Raw Sensor Data   │
                     │  (data/aqi_data.csv)│
                     └──────────┬─────────┘
                                │
                        preprocessing.py
                     (clean, impute, scale)
                                │
                                ▼
                          train.py
              (11 models compared, best tuned)
                                │
                 ┌──────────────┴──────────────┐
                 ▼                              ▼
          models/*.joblib                 outputs/*.png
       (model, scaler, features)         (leaderboard, plots)
                 │
                 ▼
             predict.py
     (loads artifacts, single prediction fn)
                 │
        ┌────────┴─────────┐
        ▼                  ▼
   FastAPI (api/)     Streamlit (streamlit_app/)
   /predict endpoint    interactive dashboard
        │                  │
        └────────┬─────────┘
                  ▼
             End User
```

---

## 📁 Folder Structure

```
AQI-Prediction/
│
├── data/                       # Raw + cleaned CSV datasets
├── notebooks/
│   ├── EDA.ipynb               # Full exploratory data analysis (executed, with output plots)
│   └── _build_notebook.py      # Script that programmatically builds EDA.ipynb
│
├── src/
│   ├── logger.py                # Centralized logging (console + rotating file)
│   ├── utils.py                  # Paths, constants, AQI category classifier
│   ├── generate_data.py          # Synthetic-but-realistic dataset generator (CPCB formula)
│   ├── preprocessing.py          # Cleaning, imputation, outlier capping, scaling
│   ├── train.py                  # Trains/compares 11 models, tunes best, saves artifacts
│   ├── predict.py                 # AQIPredictor class used by API + dashboard
│   └── generate_plots.py         # Generates all result visualizations
│
├── models/                     # Saved model, scaler, feature list, metadata (joblib)
├── api/
│   ├── main.py                   # FastAPI app (/, /predict, /docs)
│   └── schemas.py                # Pydantic request/response models
│
├── streamlit_app/
│   └── app.py                    # Interactive dashboard (gauge chart, sliders, history)
│
├── tests/
│   ├── test_preprocessing.py
│   ├── test_predict.py
│   └── test_api.py
│
├── outputs/                    # Model leaderboard CSV + all generated plots
├── logs/                       # Rotating log files
│
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── .gitignore
├── main.py                      # CLI orchestrator for the whole pipeline
├── README.md
├── LICENSE
├── CONTRIBUTING.md
└── .github/                     # Issue + PR templates
```

---

## 🖼 Screenshots

> _Add your own screenshots here after running the dashboard locally, e.g.:_
> `outputs/dashboard_screenshot.png`

- `[Dashboard Home — Screenshot Placeholder]`
- `[Prediction Gauge Chart — Screenshot Placeholder]`
- `[FastAPI Swagger Docs — Screenshot Placeholder]`

---

## ⚙️ Installation

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/AQI-Prediction.git
cd AQI-Prediction

# 2. Create and activate a virtual environment
python -m venv venv
source venv/bin/activate      # On Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt
```

---

## 🚀 Usage

Run the full pipeline (generate data → preprocess → train → sample predict) in one command:

```bash
python main.py all
```

Or run each stage individually:

```bash
python main.py generate      # Create data/aqi_data.csv
python main.py preprocess    # Clean data, fit & save scaler
python main.py train         # Train, compare, tune, save best model
python main.py predict       # Run one sample prediction
```

Generate all result visualizations (after training):

```bash
python src/generate_plots.py
```

Launch the REST API:

```bash
python main.py api
# or directly:
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

Launch the Streamlit dashboard:

```bash
python main.py dashboard
# or directly:
streamlit run streamlit_app/app.py
```

---

## 🔌 REST API

Base URL (local): `http://localhost:8000`

| Method | Endpoint   | Description                              |
|--------|-----------|-------------------------------------------|
| GET    | `/`        | Health check — confirms API & model status |
| POST   | `/predict` | Predict AQI from sensor readings           |
| GET    | `/docs`    | Interactive Swagger UI (auto-generated)     |

**Example request:**

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
        "PM2_5": 120.5, "PM10": 210.3, "NO2": 65.2, "SO2": 25.1,
        "CO": 2.8, "O3": 40.0, "Temperature": 18.5,
        "Humidity": 75.0, "WindSpeed": 1.2
      }'
```

**Example response:**

```json
{
  "predicted_aqi": 343.45,
  "category": "Very Poor",
  "color": "#ff0000",
  "health_advice": "Respiratory illness on prolonged exposure. Avoid outdoor activity."
}
```

---

## 🤖 Model Details

Eleven regression algorithms were trained and compared using an 80/20 train-test split and 5-fold
cross-validation:

Linear Regression · Decision Tree · Random Forest · Extra Trees · Gradient Boosting · AdaBoost ·
XGBoost · LightGBM · CatBoost · SVR · KNN

The best-performing model (by test R²) was automatically selected and further tuned with
`GridSearchCV`. Final artifacts saved to `models/`:

- `best_model.joblib` — the tuned final model
- `scaler.joblib` — the fitted `StandardScaler`
- `feature_columns.joblib` — the expected feature order
- `model_metadata.joblib` — model name, best hyperparameters, final metrics

---

## 📊 Results

### Model Comparison (R²)
![Model Comparison](outputs/model_comparison.png)

| Model            |    MAE |    RMSE |     R² | CV R² (mean ± std) |
|-------------------|-------:|--------:|-------:|---------------------|
| **CatBoost** 🏆   | 24.83 |  53.33  | 0.8696 | 0.855 ± 0.013       |
| LightGBM          | 27.01 |  53.51  | 0.8687 | 0.839 ± 0.019       |
| XGBoost           | 26.26 |  54.53  | 0.8636 | 0.831 ± 0.011       |
| GradientBoosting  | 31.63 |  55.09  | 0.8608 | 0.871 ± 0.011       |
| RandomForest      | 33.20 |  71.45  | 0.7659 | 0.759 ± 0.022       |
| ExtraTrees        | 59.33 |  91.50  | 0.6161 | 0.574 ± 0.003       |
| DecisionTree      | 30.10 |  94.18  | 0.5933 | 0.565 ± 0.023       |
| AdaBoost          | 94.05 | 116.87  | 0.3737 | 0.350 ± 0.140       |
| LinearRegression  | 82.08 | 125.19  | 0.2813 | 0.293 ± 0.005       |
| KNN               | 83.75 | 133.17  | 0.1868 | 0.211 ± 0.011       |
| SVR               | 62.46 | 134.18  | 0.1744 | 0.187 ± 0.014       |

*(Full leaderboard: `outputs/model_leaderboard.csv`, regenerated each time `train.py` runs.)*

**Winner: CatBoost** — after `GridSearchCV` tuning (`depth=4, iterations=400, learning_rate=0.1`),
achieving **R² ≈ 0.86** and **RMSE ≈ 55.6** on the held-out test set.

### Feature Importance
![Feature Importance](outputs/feature_importance.png)

PM2.5 and PM10 dominate, consistent with the CPCB methodology where AQI equals the maximum
sub-index across pollutants, and particulates are typically the binding constraint.

### Actual vs Predicted
![Actual vs Predicted](outputs/actual_vs_predicted.png)

### Residual Plot
![Residuals](outputs/residual_plot.png)

### Feature Correlation Heatmap
![Correlation Heatmap](outputs/correlation_heatmap.png)

---

## 🧪 Testing

18 automated tests cover preprocessing, prediction, and the API layer:

```bash
pytest tests/ -v
```

```
tests/test_api.py .....              [ 5 passed]
tests/test_predict.py .......        [ 7 passed]
tests/test_preprocessing.py ......   [ 6 passed]
======= 18 passed =======
```

---

## 🐳 Docker Deployment

Build and run the API + dashboard together:

```bash
docker-compose up --build
```

- API available at `http://localhost:8000`
- Dashboard available at `http://localhost:8501`

Or build/run a single image manually:

```bash
docker build -t aqi-prediction .
docker run -p 8000:8000 aqi-prediction
```

---

## 🔮 Future Improvements

- Swap synthetic data generator for a real-time API feed (e.g., OpenAQ, CPCB live stations).
- Add SHAP-based explainability to the dashboard for per-prediction feature attribution.
- Add a time-series forecasting mode (predict AQI N hours ahead, not just from current readings).
- Add CI/CD (GitHub Actions) to run tests and build the Docker image on every push.
- Add authentication/rate-limiting to the FastAPI service for public deployment.
- Persist prediction history to a database instead of Streamlit session state.

---

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines, and check the
issue templates under `.github/ISSUE_TEMPLATE/` before opening a new issue.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
