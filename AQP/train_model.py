import pandas as pd
import numpy as np
import joblib
import json
import matplotlib.pyplot as plt
import seaborn as sns
import os
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

def main():
    print("Loading dataset air_quality_data.csv...")
    df = pd.read_csv('air_quality_data.csv')
    
    # Drop missing values
    df = df.dropna()
    
    # Clean column names
    df.columns = [col.strip().lower() for col in df.columns]
    
    # Filter dataset for India coordinates only
    print("Filtering dataset for India coordinates only...")
    df = df[(df['lat'] >= 8.0) & (df['lat'] <= 38.0) & (df['lng'] >= 68.0) & (df['lng'] <= 98.0)]
    
    print("Dataset loaded successfully. Shape:", df.shape)
    print("Columns:", list(df.columns))
    
    # Define features and target
    feature_cols = ['co aqi value', 'ozone aqi value', 'no2 aqi value', 'pm2.5 aqi value']
    target_col = 'aqi value'
    
    X = df[feature_cols]
    y = df[target_col]
    
    # Train-test split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training RandomForestRegressor...")
    model = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)
    
    print("Evaluating model...")
    y_pred = model.predict(X_test)
    
    mae = mean_absolute_error(y_test, y_pred)
    mse = mean_squared_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    print(f"Mean Absolute Error: {mae:.4f}")
    print(f"Mean Squared Error: {mse:.4f}")
    # R2 score is standard format
    print(f"R2 Score: {r2:.4f}")
    
    # Save the model
    print("Saving model to model.joblib...")
    joblib.dump(model, 'model.joblib')
    
    # Calculate stats
    stats = {
        "metrics": {
            "mae": round(mae, 4),
            "mse": round(mse, 4),
            "r2": round(r2, 4)
        },
        "averages": {
            "aqi": round(df['aqi value'].mean(), 2),
            "co": round(df['co aqi value'].mean(), 2),
            "ozone": round(df['ozone aqi value'].mean(), 2),
            "no2": round(df['no2 aqi value'].mean(), 2),
            "pm25": round(df['pm2.5 aqi value'].mean(), 2),
        },
        "max_values": {
            "aqi": int(df['aqi value'].max()),
            "co": int(df['co aqi value'].max()),
            "ozone": int(df['ozone aqi value'].max()),
            "no2": int(df['no2 aqi value'].max()),
            "pm25": int(df['pm2.5 aqi value'].max()),
        },
        "min_values": {
            "aqi": int(df['aqi value'].min()),
            "co": int(df['co aqi value'].min()),
            "ozone": int(df['ozone aqi value'].min()),
            "no2": int(df['no2 aqi value'].min()),
            "pm25": int(df['pm2.5 aqi value'].min()),
        }
    }
    
    # Correlation Matrix
    corr_matrix = df[['aqi value'] + feature_cols].corr().round(4).to_dict()
    stats["correlation"] = corr_matrix
    
    # Generate and save correlation heatmap plot using matplotlib/seaborn
    print("Generating correlation heatmap image...")
    plt.figure(figsize=(7, 5.5))
    
    # Style plot for dark theme match
    sns.set_theme(style="dark", rc={
        "axes.facecolor": "#0b0f19",
        "figure.facecolor": "#0b0f19",
        "text.color": "#f8fafc",
        "axes.labelcolor": "#f8fafc",
        "xtick.color": "#94a3b8",
        "ytick.color": "#94a3b8"
    })
    
    # Capitalize names for correlation plot display
    corr_df = df[['aqi value'] + feature_cols].copy()
    corr_df.columns = [col.replace(' value', '').upper() for col in corr_df.columns]
    
    # Calculate matrix
    corr_matrix_df = corr_df.corr()
    
    # Draw heatmap
    ax = sns.heatmap(
        corr_matrix_df, 
        annot=True, 
        cmap='coolwarm', 
        fmt=".3f", 
        linewidths=.5,
        annot_kws={"size": 10, "weight": "bold"},
        cbar=True
    )
    plt.title('Correlation Matrix', fontsize=12, fontweight='bold', color='#f8fafc', pad=15)
    plt.tight_layout()
    
    # Save to static directory
    os.makedirs('static', exist_ok=True)
    plt.savefig('static/correlation_heatmap.png', dpi=150, facecolor='#0b0f19', edgecolor='none')
    plt.close()
    
    # Sample actual vs predicted for chart (first 150 points)
    stats["actual_vs_pred"] = {
        "actual": [int(v) for v in y_test.values[:150]],
        "pred": [round(float(v), 2) for v in y_pred[:150]]
    }
    
    # Downsample points for Leaflet map (e.g. max 1000 points to keep map smooth)
    # Filter points to make sure they are within reasonable bounds and clean
    map_df = df[['lat', 'lng', 'aqi value', 'co aqi value', 'ozone aqi value', 'no2 aqi value', 'pm2.5 aqi value']].dropna()
    if len(map_df) > 1000:
        # Downsample by taking a random sample with a fixed seed
        map_df = map_df.sample(n=1000, random_state=42)
    
    points = []
    for _, row in map_df.iterrows():
        points.append({
            "lat": float(row['lat']),
            "lng": float(row['lng']),
            "aqi": int(row['aqi value']),
            "co": int(row['co aqi value']),
            "ozone": int(row['ozone aqi value']),
            "no2": int(row['no2 aqi value']),
            "pm25": int(row['pm2.5 aqi value'])
        })
    stats["map_points"] = points
    
    # Save metadata JSON
    print("Saving metadata to model_metadata.json...")
    with open('model_metadata.json', 'w') as f:
        json.dump(stats, f, indent=4)
        
    print("Model training and metadata generation complete!")

if __name__ == "__main__":
    main()
