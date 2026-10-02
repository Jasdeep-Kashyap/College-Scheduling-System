# REST API Reference & Endpoint Specification

This document provides the complete API specification for the **College Scheduling & Productivity Intelligence System**. All endpoints follow RESTful conventions, accept/return JSON payloads, and enforce strict token-based authentication.

---

## 1. Global Conventions & Standards

### 1.1 Base URL
- Local Development Server: `http://localhost:4000/api`
- Internal ML Service: `http://localhost:8000`

### 1.2 Authentication Headers
Protected endpoints require an `Authorization` header containing a valid Bearer JWT:
```http
Authorization: Bearer <access_token>
```

### 1.3 Standard Response Format
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully",
  "timestamp": "2026-10-02T15:30:00.000Z"
}
```

### 1.4 Standard Error Format
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Detailed error explanation",
    "details": []
  },
  "timestamp": "2026-10-02T15:30:00.000Z"
}
```

---

## 2. Authentication & User Management

### 2.1 Register New User
- **`POST /api/auth/register`**
- **Access:** Public or Admin-only in production
- **Request Body:**
```json
{
  "name": "Prof. Alan Turing",
  "email": "turing@college.edu",
  "password": "SecurePassword123!",
  "role": "TEACHER",
  "departmentId": "dept-uuid-cs"
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr-uuid-1",
      "name": "Prof. Alan Turing",
      "email": "turing@college.edu",
      "role": "TEACHER"
    },
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi..."
  }
}
```

### 2.2 Login User
- **`POST /api/auth/login`**
- **Access:** Public
- **Request Body:**
```json
{
  "email": "turing@college.edu",
  "password": "SecurePassword123!"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": { "id": "usr-uuid-1", "name": "Prof. Alan Turing", "role": "TEACHER" },
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi..."
  }
}
```

### 2.3 Refresh Access Token
- **`POST /api/auth/refresh`**
- **Access:** Public (valid refresh token required)
- **Request Body:** `{ "refreshToken": "eyJhbGciOi..." }`
- **Response (200 OK):** `{ "accessToken": "new-jwt-token" }`

### 2.4 Get Current User Profile
- **`GET /api/users/me`**
- **Access:** Authenticated (Any role)

---

## 3. Academic Resources (CRUD)

| Resource | Endpoints Available | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `/departments` | `GET`, `POST`, `PUT /:id`, `DELETE /:id` | Read: All; Write: Admin | Academic departments (CSE, EEE, etc.) |
| `/teachers` | `GET`, `POST`, `PUT /:id`, `DELETE /:id` | Read: All; Write: Admin | Teacher profiles, weekly load, preferences |
| `/students` | `GET`, `POST`, `PUT /:id`, `DELETE /:id` | Read: Teachers/Admin; Write: Admin | Student roster and batch association |
| `/batches` | `GET`, `POST`, `PUT /:id`, `DELETE /:id` | Read: All; Write: Admin | Student cohorts (e.g. CS Year 2 Batch A) |
| `/courses` | `GET`, `POST`, `PUT /:id`, `DELETE /:id` | Read: All; Write: Admin | Course definitions, weekly hours, theory/lab |
| `/rooms` | `GET`, `POST`, `PUT /:id`, `DELETE /:id` | Read: All; Write: Admin | Classrooms, computer labs, capacities |
| `/time-slots`| `GET`, `POST`, `PUT /:id` | Read: All; Write: Admin | Days, start/end times, desirability scores |
| `/holidays` | `GET`, `POST`, `PUT /:id`, `DELETE /:id` | Read: All; Write: Admin | Gazetted institutional holidays |
| `/events` | `GET`, `POST`, `PUT /:id`, `DELETE /:id` | Read: All; Write: Admin | Exams, cultural festivals, sports days |

---

## 4. Timetable & Scheduling Engine

### 4.1 Query Monthly Timetable
- **`GET /api/timetable`**
- **Access:** Authenticated
- **Query Parameters:**
  - `month` (e.g. `10`)
  - `year` (e.g. `2026`)
  - `batchId` (optional, filter for student view)
  - `teacherId` (optional, filter for teacher personal schedule)
  - `roomId` (optional, filter for classroom allocation)
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "schedule": {
      "id": "sched-uuid-oct2026",
      "month": 10,
      "year": 2026,
      "status": "PUBLISHED",
      "fairnessGini": 0.14
    },
    "sessions": [
      {
        "id": "sess-uuid-1",
        "date": "2026-10-05T00:00:00.000Z",
        "course": { "id": "c1", "name": "Operating Systems", "code": "CS402" },
        "teacher": { "id": "t1", "user": { "name": "Dr. Grace Hopper" } },
        "batch": { "id": "b1", "name": "CS-Year-3-A" },
        "room": { "id": "r1", "name": "Lecture Hall 2" },
        "timeSlot": {
          "id": "ts-mon-2",
          "dayOfWeek": 1,
          "slotNumber": 2,
          "startTime": "09:30",
          "endTime": "10:30",
          "desirabilityScore": 5.0
        },
        "status": "SCHEDULED"
      }
    ]
  }
}
```

### 4.2 Trigger Automated ML Schedule Generation
- **`POST /api/timetable/generate`**
- **Access:** Admin only
- **Request Body:**
```json
{
  "departmentId": "dept-uuid-cs",
  "month": 10,
  "year": 2026,
  "solverWeights": {
    "fairnessWeight": 10.0,
    "teacherPreferenceWeight": 5.0,
    "attendancePredictionWeight": 8.0,
    "minimizeGapsWeight": 4.0
  }
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "scheduleId": "sched-uuid-oct2026",
    "totalSessionsGenerated": 284,
    "fairnessGini": 0.12,
    "solverStatus": "OPTIMAL",
    "executionTimeMs": 6240,
    "conflicts": []
  }
}
```

### 4.3 Manual Drag-and-Drop Override
- **`PUT /api/timetable/session/:id`**
- **Access:** Admin only
- **Request Body:**
```json
{
  "timeSlotId": "ts-wed-3",
  "roomId": "r-lh-102",
  "date": "2026-10-07"
}
```
- **Collision Checking Response (if collision detected, 409 Conflict):**
```json
{
  "success": false,
  "error": {
    "code": "HARD_CONSTRAINT_VIOLATION",
    "message": "Room 'Lecture Hall 102' is already booked by Batch 'CS-Year-2-B' on 2026-10-07 at Slot 3"
  }
}
```

### 4.4 Publish Schedule
- **`POST /api/timetable/publish`**
- **Access:** Admin only
- **Request Body:** `{ "scheduleId": "sched-uuid-oct2026" }`
- **Response (200 OK):** Schedule status updated to `PUBLISHED`, notifying teachers and students.

---

## 5. Attendance & Productivity Loop

### 5.1 Generate Dynamic Attendance QR Code (Teacher)
- **`POST /api/attendance/session/:id/start-qr`**
- **Access:** Teacher of this session or Admin
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "qrToken": "signed-jwt-token-valid-for-30s",
    "expiresAt": "2026-10-05T09:35:30.000Z"
  }
}
```

### 5.2 Student Check-in via QR Scan
- **`POST /api/attendance/scan-qr`**
- **Access:** Student only
- **Request Body:**
```json
{
  "qrToken": "signed-jwt-token-valid-for-30s"
}
```
- **Response (200 OK):** `{ "markedStatus": "PRESENT", "timestamp": "2026-10-05T09:35:12.000Z" }`

### 5.3 Manual Bulk Attendance Mark (Teacher)
- **`POST /api/attendance/bulk`**
- **Access:** Teacher or Admin
- **Request Body:**
```json
{
  "sessionId": "sess-uuid-1",
  "records": [
    { "studentId": "std-1", "status": "PRESENT" },
    { "studentId": "std-2", "status": "ABSENT" },
    { "studentId": "std-3", "status": "LATE" }
  ]
}
```

### 5.4 Submit In-Lecture Engagement (Teacher launches poll)
- **`POST /api/engagement`**
- **Access:** Teacher only
- **Request Body:**
```json
{
  "sessionId": "sess-uuid-1",
  "type": "POLL",
  "prompt": "Which data structure provides O(1) average lookup?",
  "score": 0.88
}
```

### 5.5 Submit Student Lecture Feedback
- **`POST /api/feedback`**
- **Access:** Student (must be enrolled in the batch of this session)
- **Request Body:**
```json
{
  "sessionId": "sess-uuid-1",
  "rating": 5,
  "tags": ["clear_explanation", "interactive"],
  "comment": "Great demonstration on virtual memory."
}
```

---

## 6. Analytics & Intelligence Endpoints

### 6.1 Teacher Fairness Index
- **`GET /api/analytics/fairness?month=10&year=2026`**
- **Access:** Admin only
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "overallGini": 0.12,
    "averageUndesirableSlots": 3.2,
    "teacherDistribution": [
      {
        "teacherId": "t1",
        "teacherName": "Dr. Hopper",
        "totalHours": 16,
        "undesirableSlotCount": 3,
        "desirabilityIndexAverage": 3.9
      },
      {
        "teacherId": "t2",
        "teacherName": "Prof. Knuth",
        "totalHours": 16,
        "undesirableSlotCount": 3,
        "desirabilityIndexAverage": 4.1
      }
    ]
  }
}
```

### 6.2 Attendance Trends
- **`GET /api/analytics/attendance-trends?departmentId=dept-1`**
- **Access:** Admin & Teacher
- **Response (200 OK):** Attendance averages broken down by day of week, time slot, and course.

### 6.3 Lecture Productivity Breakdown
- **`GET /api/analytics/productivity?sessionId=sess-uuid-1`**
- **Access:** Admin & Teacher
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "sessionId": "sess-uuid-1",
    "attendanceRate": 0.92,
    "engagementScore": 0.85,
    "learningScore": 0.78,
    "feedbackScore": 0.90,
    "compositeScore": 86.8
  }
}
```

---

## 7. Python ML Service Internal API

The following endpoints are hosted by the FastAPI service (`localhost:8000`) and called by the backend:

- **`POST /generate-timetable`**: Solves CP-SAT optimization model and returns collision-free schedule with fairness metrics.
- **`POST /predict-attendance`**: Takes session features (`dayOfWeek`, `slotNumber`, `courseCode`, `teacherId`, `batchSize`) and returns predicted attendance percentage ($0.0 - 1.0$).
- **`POST /productivity-score`**: Calculates weighted composite score from attendance, quiz, poll, and feedback signals.
- **`POST /calculate-fairness`**: Calculates Gini coefficient and slot distribution variances.
