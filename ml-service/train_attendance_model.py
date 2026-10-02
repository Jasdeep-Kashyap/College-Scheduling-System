"""
Training script for the Attendance Prediction Random Forest model.
Run this once to generate models/attendance_model.joblib.

Usage:
    python train_attendance_model.py
"""

import os
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
import joblib

MODEL_DIR = Path("models")
MODEL_PATH = MODEL_DIR / "attendance_model.joblib"


def generate_synthetic_data(n_samples: int = 2000) -> pd.DataFrame:
    """Generate realistic synthetic attendance data for initial model training."""
    np.random.seed(42)

    days = np.random.randint(1, 6, n_samples)           # Mon-Fri
    slots = np.random.randint(1, 8, n_samples)           # Slot 1-7
    is_lab = np.random.choice([0, 1], n_samples, p=[0.7, 0.3])
    batch_sizes = np.random.randint(40, 80, n_samples)

    # Base attendance by slot (from institutional patterns)
    slot_base = {1: 0.65, 2: 0.88, 3: 0.90, 4: 0.82, 5: 0.78, 6: 0.72, 7: 0.55}

    attendance = np.array([
        slot_base[s]
        + (0.05 if is_lab[i] else 0.0)   # Labs slightly higher
        - (0.03 if days[i] == 5 else 0.0)  # Friday slightly lower
        + np.random.normal(0, 0.08)          # Gaussian noise
        for i, s in enumerate(slots)
    ])
    attendance = np.clip(attendance, 0.1, 1.0)

    return pd.DataFrame({
        "day_of_week_norm": days / 5.0,
        "slot_number_norm": slots / 7.0,
        "is_first_slot": (slots == 1).astype(float),
        "is_last_slot": (slots == 7).astype(float),
        "is_lab": is_lab.astype(float),
        "batch_size_norm": np.minimum(batch_sizes / 80.0, 1.0),
        "attendance_rate": attendance,
    })


def train():
    print("🤖 Training attendance prediction model...")
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    df = generate_synthetic_data(n_samples=2000)
    X = df.drop("attendance_rate", axis=1).values
    y = df["attendance_rate"].values

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = RandomForestRegressor(
        n_estimators=150,
        max_depth=10,
        min_samples_split=5,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)

    print(f"✅ Model trained successfully!")
    print(f"   MAE : {mae:.4f}")
    print(f"   R²  : {r2:.4f}")

    joblib.dump(model, MODEL_PATH)
    print(f"💾 Model saved to: {MODEL_PATH}")


if __name__ == "__main__":
    train()
