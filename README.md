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

## 🧭 Overview

Air pollution monitoring stations report raw pollutant concentrations, but the public-facing metric
that actually communicates risk is the **Air Quality Index (AQI)**. This project builds a complete
system that:

1. Cleans and engineers features from raw sensor data.
2. Trains and compares **11 regression algorithms**.

   
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




## 🔮 Future Improvements

- Swap synthetic data generator for a real-time API feed (e.g., OpenAQ, CPCB live stations).
- Add SHAP-based explainability to the dashboard for per-prediction feature attribution.
- Add a time-series forecasting mode (predict AQI N hours ahead, not just from current readings).
- Add CI/CD (GitHub Actions) to run tests and build the Docker image on every push.
- Add authentication/rate-limiting to the FastAPI service for public deployment.
- Persist prediction history to a database instead of Streamlit session state.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
