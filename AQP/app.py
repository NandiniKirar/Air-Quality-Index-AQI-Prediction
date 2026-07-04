import os
import json
import joblib
import pandas as pd
import numpy as np
import webbrowser
import threading
import time
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Initialize FastAPI app
app = FastAPI(title="Air Quality Prediction API", description="API for predicting Air Quality Index (AQI) using Random Forest model.")

# Add CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model and metadata
MODEL_PATH = "model.joblib"
METADATA_PATH = "model_metadata.json"
DATA_PATH = "air_quality_data.csv"

if not os.path.exists(MODEL_PATH) or not os.path.exists(METADATA_PATH):
    raise FileNotFoundError("Model files not found. Please run train_model.py first.")

print("Loading Random Forest model...")
model = joblib.load(MODEL_PATH)

print("Loading metadata...")
with open(METADATA_PATH, "r") as f:
    model_metadata = json.load(f)

print("Loading CSV dataset for API services...")
df_data = pd.read_csv(DATA_PATH).dropna()
df_data.columns = [col.strip().lower() for col in df_data.columns]
print("Filtering CSV dataset for India coordinates only...")
df_data = df_data[(df_data['lat'] >= 8.0) & (df_data['lat'] <= 38.0) & (df_data['lng'] >= 68.0) & (df_data['lng'] <= 98.0)]

# Pydantic models for validation
class PredictionInput(BaseModel):
    co: float
    ozone: float
    no2: float
    pm25: float

@app.post("/api/predict")
async def predict_aqi(data: PredictionInput):
    try:
        # Features order must match training: ['co aqi value', 'ozone aqi value', 'no2 aqi value', 'pm2.5 aqi value']
        features = pd.DataFrame(
            [[data.co, data.ozone, data.no2, data.pm25]], 
            columns=['co aqi value', 'ozone aqi value', 'no2 aqi value', 'pm2.5 aqi value']
        )
        prediction = model.predict(features)[0]
        return {
            "success": True,
            "predicted_aqi": round(float(prediction), 2)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.get("/api/stats")
async def get_stats():
    return {
        "success": True,
        "metrics": model_metadata.get("metrics"),
        "averages": model_metadata.get("averages"),
        "max_values": model_metadata.get("max_values"),
        "min_values": model_metadata.get("min_values"),
        "correlation": model_metadata.get("correlation"),
        "actual_vs_pred": model_metadata.get("actual_vs_pred"),
        "map_points": model_metadata.get("map_points")
    }

@app.get("/api/data")
async def get_dataset(
    page: int = 1, 
    per_page: int = 15, 
    search: str = "", 
    sort_by: str = "", 
    sort_order: str = "asc"
):
    try:
        df_temp = df_data.copy()
        
        # Simple text/numeric filtering across all columns
        if search:
            search_str = search.lower().strip()
            # Check which columns contain the search string
            mask = np.zeros(len(df_temp), dtype=bool)
            for col in df_temp.columns:
                mask = mask | df_temp[col].astype(str).str.lower().str.contains(search_str)
            df_temp = df_temp[mask]
            
        # Handle sorting
        if sort_by:
            col_name = sort_by.lower().strip()
            # map frontend columns to df columns if needed
            frontend_to_db = {
                "aqi": "aqi value",
                "co": "co aqi value",
                "ozone": "ozone aqi value",
                "no2": "no2 aqi value",
                "pm25": "pm2.5 aqi value",
                "lat": "lat",
                "lng": "lng"
            }
            db_col = frontend_to_db.get(col_name, col_name)
            if db_col in df_temp.columns:
                ascending = (sort_order.lower() == "asc")
                df_temp = df_temp.sort_values(by=db_col, ascending=ascending)
        
        # Paginate
        total_records = len(df_temp)
        start_idx = (page - 1) * per_page
        end_idx = start_idx + per_page
        
        paginated_data = df_temp.iloc[start_idx:end_idx].to_dict(orient="records")
        
        # Rename columns to camelCase/friendly names for frontend API consumption
        formatted_data = []
        for row in paginated_data:
            formatted_data.append({
                "aqi": int(row["aqi value"]),
                "co": int(row["co aqi value"]),
                "ozone": int(row["ozone aqi value"]),
                "no2": int(row["no2 aqi value"]),
                "pm25": int(row["pm2.5 aqi value"]),
                "lat": float(row["lat"]),
                "lng": float(row["lng"])
            })
            
        return {
            "success": True,
            "total_records": total_records,
            "page": page,
            "per_page": per_page,
            "data": formatted_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Data retrieval error: {str(e)}")

# Mount the static files directory
# Make sure to run this last so standard routes are checked first
if os.path.exists("static"):
    app.mount("/", StaticFiles(directory="static", html=True), name="static")
else:
    print("WARNING: 'static' directory not found yet. Please create it to serve frontend.")

def open_browser():
    # Wait for the server to spin up
    time.sleep(1.5)
    url = "http://127.0.0.1:8000"
    print(f"\nOpening dashboard in your web browser: {url}\n")
    webbrowser.open_new_tab(url)

if __name__ == "__main__":
    # Start browser opener thread
    threading.Thread(target=open_browser, daemon=True).start()
    
    # Run server
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=False)
