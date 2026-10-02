"""
Attendance Prediction Model using scikit-learn Random Forest.
Predicts the probability of student attendance for a given session.
"""

import os
import numpy as np
import joblib
from pathlib import Path

MODEL_PATH = Path(os.getenv("MODEL_PATH", "models/attendance_model.joblib"))

# Feature names
FEATURES = ["day_of_week", "slot_number", "is_first_slot", "is_last_slot", "is_lab", "batch_size_normalized"]


def _build_features(day_of_week: int, slot_number: int, is_lab: bool, batch_size: int) -> np.ndarray:
    """Build feature vector for prediction."""
    return np.array([[
        day_of_week / 5.0,           # Normalize 1-5 → 0.2-1.0
        slot_number / 7.0,           # Normalize 1-7 → 0.14-1.0
        1.0 if slot_number == 1 else 0.0,   # Is first slot of day
        1.0 if slot_number == 7 else 0.0,   # Is last slot of day (undesirable)
        1.0 if is_lab else 0.0,
        min(batch_size / 80.0, 1.0),  # Normalize batch size
    ]])


def predict_attendance(day_of_week: int, slot_number: int, course_type: str, batch_size: int) -> float:
    """
    Predict expected attendance rate for a session.
    Returns a float in [0.0, 1.0].
    """
    is_lab = course_type == "LAB"
    features = _build_features(day_of_week, slot_number, is_lab, batch_size)

    if MODEL_PATH.exists():
        try:
            model = joblib.load(MODEL_PATH)
            prediction = model.predict(features)[0]
            return float(np.clip(prediction, 0.0, 1.0))
        except Exception as e:
            print(f"[PREDICTOR] Error loading/using model: {e}. Using heuristic.")

    # Heuristic fallback (no trained model)
    return _heuristic_predict(slot_number, is_lab)


def _heuristic_predict(slot_number: int, is_lab: bool) -> float:
    """Rule-based attendance prediction when model isn't available."""
    slot_attendance = {1: 0.65, 2: 0.88, 3: 0.90, 4: 0.82, 5: 0.78, 6: 0.72, 7: 0.55}
    base = slot_attendance.get(slot_number, 0.75)
    # Lab courses generally have slightly higher attendance (mandatory practical)
    if is_lab:
        base = min(base + 0.05, 1.0)
    return base
