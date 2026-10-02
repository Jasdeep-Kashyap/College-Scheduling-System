from pydantic import BaseModel
from typing import List, Optional, Any, Dict


class TimeSlotSchema(BaseModel):
    id: str
    dayOfWeek: int
    slotNumber: int
    desirabilityScore: float


class TeacherSchema(BaseModel):
    id: str
    name: str
    maxWeeklyLoad: int
    preferences: Optional[Dict[str, Any]] = {}


class BatchSchema(BaseModel):
    id: str
    name: str
    size: int
    semester: int


class CourseSchema(BaseModel):
    id: str
    code: str
    weeklyHours: int
    type: str  # THEORY, LAB, TUTORIAL, SEMINAR


class RoomSchema(BaseModel):
    id: str
    name: str
    capacity: int
    type: str  # LECTURE_HALL, COMPUTER_LAB, etc.


class SolverWeights(BaseModel):
    fairnessWeight: float = 10.0
    teacherPreferenceWeight: float = 5.0
    attendancePredictionWeight: float = 8.0
    minimizeGapsWeight: float = 4.0


class GenerateTimetableRequest(BaseModel):
    month: int
    year: int
    teachers: List[TeacherSchema]
    batches: List[BatchSchema]
    courses: List[CourseSchema]
    rooms: List[RoomSchema]
    timeSlots: List[TimeSlotSchema]
    holidays: List[str]  # ISO date strings
    events: List[Dict[str, Any]]
    constraints: List[Dict[str, Any]]
    solverWeights: Optional[SolverWeights] = SolverWeights()


class SessionAssignment(BaseModel):
    courseId: str
    teacherId: str
    batchId: str
    roomId: str
    timeSlotId: str
    date: str


class GenerateTimetableResponse(BaseModel):
    status: str
    fairnessGini: Optional[float]
    sessions: List[SessionAssignment]
    message: Optional[str] = None
    executionTimeMs: Optional[int] = None


class PredictAttendanceRequest(BaseModel):
    dayOfWeek: int
    slotNumber: int
    courseCode: str
    teacherId: str
    batchSize: int
    courseType: str = "THEORY"


class PredictAttendanceResponse(BaseModel):
    predictedAttendanceRate: float


class ProductivityRequest(BaseModel):
    sessionId: str
    attendanceRate: float
    engagementScore: float
    learningScore: float
    feedbackScore: float


class ProductivityResponse(BaseModel):
    sessionId: str
    compositeScore: float
    breakdown: Dict[str, float]
