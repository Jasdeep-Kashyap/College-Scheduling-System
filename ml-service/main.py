"""
FastAPI ML Service - College Timetable Intelligence Microservice
Provides: timetable optimization, attendance prediction, productivity scoring
"""

import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from schemas import (
    GenerateTimetableRequest,
    GenerateTimetableResponse,
    PredictAttendanceRequest,
    PredictAttendanceResponse,
    ProductivityRequest,
    ProductivityResponse,
)
from scheduler import solve_timetable
from predictor import predict_attendance
from productivity import compute_productivity_score

app = FastAPI(
    title="CMS Intelligence Service",
    description="ML & Optimization backend for College Scheduling System",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {
        "status": "UP",
        "service": "CMS ML Service",
        "solver": "OR-Tools CP-SAT",
        "model": "scikit-learn Random Forest",
        "timestamp": time.time(),
    }


@app.post("/generate-timetable", response_model=GenerateTimetableResponse)
def generate_timetable(req: GenerateTimetableRequest):
    """
    Generate an optimized monthly timetable using OR-Tools CP-SAT.
    Enforces hard constraints and optimizes for attendance, fairness, and preferences.
    """
    return solve_timetable(req)


@app.post("/predict-attendance", response_model=PredictAttendanceResponse)
def predict_attendance_endpoint(req: PredictAttendanceRequest):
    """
    Predict expected student attendance rate for a potential session.
    Uses trained Random Forest model (or heuristic fallback).
    """
    rate = predict_attendance(
        day_of_week=req.dayOfWeek,
        slot_number=req.slotNumber,
        course_type=req.courseType,
        batch_size=req.batchSize,
    )
    return PredictAttendanceResponse(predictedAttendanceRate=rate)


@app.post("/productivity-score", response_model=ProductivityResponse)
def compute_productivity(req: ProductivityRequest):
    """
    Compute weighted composite productivity score for a lecture session.
    Formula: P = 100 × (0.4×A + 0.3×E + 0.2×L + 0.1×F)
    """
    result = compute_productivity_score(
        attendance_rate=req.attendanceRate,
        engagement_score=req.engagementScore,
        learning_score=req.learningScore,
        feedback_score=req.feedbackScore,
    )
    return ProductivityResponse(
        sessionId=req.sessionId,
        compositeScore=result["compositeScore"],
        breakdown=result["breakdown"],
    )
