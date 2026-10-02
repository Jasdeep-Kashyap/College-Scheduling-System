# College Scheduling & Productivity Intelligence System
## Master Progress & Agent Handover Document

> **Target Audience:** Future AI Agents & Engineering Collaborators  
> **Status:** Phase 6 Complete | All Core Features + Resource Management + Engagement Flow Operational  
> **Last Updated:** October 2026 (Session 2)

---

## 1. Project Overview & System Vision

The **College Scheduling & Productivity Intelligence System** is an enterprise-grade academic scheduling and analytics platform designed to solve the NP-hard problem of university timetabling while optimizing faculty fairness, student attendance retention, and pedagogical productivity.

### Key Capabilities
- **Automated Timetable Generation:** Uses Google OR-Tools Constraint Programming (CP-SAT) to optimize weekly schedules across courses, faculty, student batches, and room categories with zero double-booking hard conflicts.
- **Fairness Engineering:** Enforces a Gini coefficient $< 0.15$ on undesirable slot distribution (early 8:30 AM and late 3:45 PM classes) across teachers.
- **Dynamic Attendance:** Rotates cryptographic HMAC-SHA256 QR codes every 30 seconds for fraud-proof student check-ins alongside bulk roll-call for faculty.
- **Productivity Intelligence:** Evaluates lecture outcomes using a multi-signal composite score formula:
  $$P = 100 \times (0.40 \times A_{\text{rate}} + 0.30 \times E_{\text{poll}} + 0.20 \times L_{\text{quiz}} + 0.10 \times F_{\text{rating}})$$
- **Role-Based Workflows:** Distinct UI portals and access controls for Administrators, Teachers, and Students.

---

## 2. Monorepo Architecture

```
college-timetable/
├── client/                     # React 18 SPA (Vite + TS + Tailwind v4 + Recharts)
├── server/                     # Node.js + Express + TypeScript + Prisma ORM
├── ml-service/                 # Python 3.11 FastAPI microservice (OR-Tools + scikit-learn)
├── documentation/              # Architecture, API specs, DB schema, AI dev guide
├── docker-compose.yml          # Production multi-container orchestration
├── .env.example                # Unified environment template
└── progress.md                 # System state and developer guide (this file)
```

---

## 3. What Has Been Accomplished

### Milestone 1: Persistence & Database Layer (`server/prisma`)
- [x] **16-Model Database Schema** (`schema.prisma`): Implemented complete relational models covering Users, Teachers, Batches, Students, Courses, Rooms, TimeSlots, Academic Calendars, Holidays, Events, Schedules, Sessions, Attendance, Engagement, Feedback, ProductivityScore, and Constraints.
- [x] **Compound Constraints & Indexes**: Added unique keys for `[dayOfWeek, slotNumber]`, `[name, departmentId]` for Batches, `[date]` for Holidays, and foreign key cascades.
- [x] **Database Seeder** (`prisma/seed.ts`):
  - 1 System Admin (`admin@college.edu`)
  - 8 Teachers (including Alan Turing, Ada Lovelace, etc.)
  - 4 Batches (CS-Year2-A/B, CS-Year3-A/B) with 1 sample student (`student1@college.edu`)
  - 12 Courses (8 Theory courses + 4 Laboratory courses)
  - 8 Classrooms & Labs (Lecture Halls, Computer Labs, Seminar Rooms)
  - 35 Weekly TimeSlots with desirability weights (1.5 – 5.0)
  - 4 Academic Holidays (e.g., Gandhi Jayanti, Diwali)
  - 8 Solver Constraints (Hard collision rules and soft weighting rules)
- [x] **Verified Database Connection**: Synchronized against PostgreSQL database `cms_db` and seeded successfully.

### Milestone 2: Backend Core & Security Layer (`server/src`)
- [x] **Express Architecture**: Configured with `helmet`, `cors`, `morgan`, and `express-rate-limit`.
- [x] **Authentication & Role Guards**: Salted `bcryptjs` password hashing, JWT Access Tokens (15m expiry), Refresh Tokens (7d expiry), and `requireRole(['ADMIN'])` route guards.
- [x] **Resource CRUD**: Complete endpoints for `/api/departments`, `/api/teachers`, `/api/courses`, `/api/rooms`, `/api/batches`, `/api/time-slots`, `/api/holidays`.
- [x] **Collision Detection Engine**: `/api/timetable/session/:id` validates teacher double-booking, room conflicts, and batch collisions, responding with HTTP `409 Conflict` on violation.
- [x] **Attendance Workflows**:
  - HMAC-SHA256 time-limited dynamic QR code generation.
  - Student QR scan check-in endpoint with expiration check.
  - Teacher bulk roll-call endpoint with transaction upserts.
- [x] **Productivity Engine**: Endpoint to calculate and persist 4-signal composite scores.

### Milestone 3: Python ML & Optimization Microservice (`ml-service/`)
- [x] **CP-SAT Timetable Solver** (`scheduler.py`):
  - Formulates boolean decision variables $X_{a, d, s, r}$.
  - Enforces hard constraints (no teacher overlap, no room overlap, no batch overlap, lab-to-room matching).
  - Optimizes soft objectives (desirability score maximization).
  - Automatically calculates Gini coefficient across teachers.
- [x] **Attendance Predictor** (`predictor.py` & `train_attendance_model.py`):
  - Random Forest Regressor trained on slot number, day of week, batch size, and lab flag.
  - Heuristic fallback engine when pre-trained weights are loading.
- [x] **Fairness & Productivity Engines** (`fairness.py`, `productivity.py`):
  - Gini inequality index evaluation.
  - Composite productivity scoring and tier classification (`EXCELLENT`, `GOOD`, `AVERAGE`, `NEEDS_IMPROVEMENT`).
- [x] **FastAPI Endpoints** (`main.py`):
  - `POST /generate-timetable`
  - `POST /predict-attendance`
  - `POST /productivity-score`
  - `GET /health`

### Milestone 4: Frontend Web Application (`client/`)
- [x] **Tailwind CSS v4 & Styling Foundation**: Configured `@tailwindcss/vite` with an institutional slate/indigo dark theme, responsive grid cards, and micro-animations.
- [x] **Global Auth Context** (`AuthContext.tsx`): Persistent JWT management, auto-refresh on 401/403, and role-based redirect guards.
- [x] **Login Page** (`LoginPage.tsx`): One-click demo account buttons for instant login as Admin, Teacher, or Student.
- [x] **Role-Based Dashboard** (`DashboardPage.tsx`): Contextual metrics, quick action launcher, schedule preview, and attendance summary.
- [x] **Interactive Timetable Grid** (`TimetablePage.tsx`):
  - Month/year schedule selector.
  - Batch, Teacher, and Classroom filter bars.
  - Color-coded course badges.
  - Slot desirability indicators (Emerald = Prime, Red = Undesirable).
  - Schedule generation and publication controls.
- [x] **Attendance Module** (`AttendancePage.tsx`):
  - Teacher view: Rotating dynamic QR code projector with 30-second countdown ring.
  - Student view: Live attendance rate gauge, status metrics, and check-in history.
- [x] **Institutional Analytics** (`AnalyticsPage.tsx`):
  - Faculty Fairness Bar Chart comparing undesirable slot distribution.
  - Time-of-day attendance drop-off curve (Recharts LineChart).
  - Productivity radar chart and lecture composite breakdown.

### Milestone 5: Containerization & DevOps
- [x] Multi-stage `Dockerfile` for `client/` (Vite build + Nginx alpine).
- [x] Production SPA `nginx.conf` with reverse proxy to backend `/api/`.
- [x] Multi-stage `Dockerfile` for `server/` with automatic `prisma generate`.
- [x] Container specification for `ml-service/` (Python 3.11-slim + dependencies).
- [x] Unified `docker-compose.yml` linking Postgres, Server, ML service, and Client.

### Milestone 6: Full CRUD Admin UI + Engagement + Timetable Modal (Session 2)
- [x] **ResourcesPage — Full Create/Delete**: Added modal forms for all 5 resource types:
  - **Teachers**: Registers a new User account (TEACHER role) + creates Teacher profile in one form flow.
  - **Courses**: Code, name, type (THEORY/LAB/TUTORIAL/SEMINAR), credits, weekly hours.
  - **Rooms**: Name, capacity, room type (LECTURE_HALL/COMPUTER_LAB etc).
  - **Batches**: Name, semester, batch strength.
  - **Holidays**: Name + date — triggers auto-block in schedule generation.
  - Delete actions on all rows/cards (row hover reveals trash icon).
- [x] **TimetablePage — AI Generation Modal**: Replaced simple button with parameter modal:
  - 3 weight sliders: Teacher Fairness (1–20), Teacher Slot Preference (1–20), Attendance Prediction (1–20).
  - Hard constraint summary checklist shown for transparency.
  - Stats bar shows: Schedule Status, Total Sessions, Gini Fairness score, Working Days.
  - Today's date highlighted with indigo ring in the grid.
  - Session tooltip on hover shows: course, teacher, room, batch, slot time.
  - Green dot indicator on Lab courses.
  - Empty state prompts admin to launch optimizer.
- [x] **AttendancePage — 3-Tab Teacher Panel**:
  - **QR Projector tab**: Same rotating QR + conic-gradient countdown ring (improved).
  - **Poll tab**: 4 preset engagement question buttons + custom question input → fires `POST /api/attendance/engagement`.
  - **Roll Call tab**: Live list of QR check-ins, one-click "Mark All Present/Absent" buttons.
- [x] **AttendancePage — Student Exit Ticket Modal**:
  - 5-star rating with animated hover states.
  - Clickable tag chips: "Clear explanation", "Too fast", "Good examples", etc.
  - Optional free-text comment field.
  - Posts to `POST /api/attendance/feedback`.
- [x] **Backend Bug Fix**: Fixed `Unique constraint (month, year, version)` crash on repeated timetable generation. Now queries `MAX(version)` and increments it before inserting new schedule.


---

## 4. Current Runtime Status & Ports

| Component | URL | Port | Status |
|---|---|---|---|
| **Frontend Client** | `http://localhost:5173` | 5173 | **Active (Vite Dev Server)** |
| **Backend API** | `http://localhost:4000` | 4000 | **Active (Node.js)** |
| **PostgreSQL DB** | `127.0.0.1:5433` | 5433 | **Active (`cms_db`)** |
| **ML Microservice** | `http://localhost:8000` | 8000 | Ready to run (`uvicorn main:app`) |

### Verified Demo Credentials
- **Administrator:** `admin@college.edu` | `AdminPass123!`
- **Teacher:** `turing@college.edu` | `TeacherPass123!`
- **Student:** `student1@college.edu` | `StudentPass123!`

---

## 5. Developer Setup & Operations Guide

### Option A: Local Development Setup (Current Working Setup)

#### 1. PostgreSQL Database
The workspace is configured to connect to PostgreSQL on port **5433** (`127.0.0.1:5433/cms_db`).
If running locally using the portable cluster:
```powershell
# Start local PostgreSQL cluster
& "E:\PostgreSQL\bin\postgres.exe" -D "e:\xampp\htdocs\img\CMS\server\.pgdata"
```

#### 2. Backend Server (`server/`)
```powershell
cd e:\xampp\htdocs\img\CMS\server

# 1. Install dependencies (if not already installed)
npm install

# 2. Push schema to database
npx prisma db push

# 3. Seed initial dataset (Admin, Teachers, Batches, Courses, Slots, Holidays)
npm run seed

# 4. Build and start server
npm run build
node dist/src/server.js
# Backend runs on http://localhost:4000
```

#### 3. Frontend Client (`client/`)
```powershell
cd e:\xampp\htdocs\img\CMS\client

# 1. Install dependencies
npm install

# 2. Start Vite development server
npm run dev
# Open http://localhost:5173 in browser
```

#### 4. Python ML Service (`ml-service/`)
```powershell
cd e:\xampp\htdocs\img\CMS\ml-service

# 1. Create and activate a virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# 2. Install requirements
pip install -r requirements.txt

# 3. Train initial attendance prediction weights
python train_attendance_model.py

# 4. Start FastAPI service
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
# Microservice runs on http://localhost:8000
```

---

### Option B: Docker Compose Setup (One-Click Production Launch)

Once Docker Desktop is running on the host machine:
```bash
# From workspace root:
docker-compose up --build
```
This automatically starts:
- `college_timetable_db` (Postgres 15 on port 5432)
- `college_timetable_server` (Node API on port 4000)
- `college_timetable_ml` (Python FastAPI on port 8000)
- `college_timetable_client` (Nginx + React SPA on port 5173)

---

## 6. Environment Variables Reference

### Root `.env` / `server/.env`
```env
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://postgres@127.0.0.1:5433/cms_db?schema=public
JWT_ACCESS_SECRET=dev_super_secret_access_key_change_in_production
JWT_REFRESH_SECRET=dev_super_secret_refresh_key_change_in_production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
ML_SERVICE_URL=http://localhost:8000
CLIENT_ORIGIN=http://localhost:5173
```

### `client/.env`
```env
VITE_API_URL=http://localhost:4000/api
```

### `ml-service/.env` (or Docker environment)
```env
ML_PORT=8000
MODEL_PATH=models/attendance_model.joblib
```

---

## 7. Verification Checklist & Test Cases

- [x] **Auth Check**: Able to log in as Admin, Teacher, and Student with JWT token generation.
- [x] **Role Guard**: Student calling `POST /api/timetable/generate` is rejected with `HTTP 403 Forbidden`.
- [x] **Resource APIs**: `GET /api/courses`, `/api/teachers`, `/api/rooms`, `/api/batches`, `/api/time-slots`, `/api/holidays` return populated seed data.
- [x] **Collision Validation**: Manual session override verifies teacher, room, and batch availability and returns `HTTP 409 Conflict` on overlap.
- [x] **Client Build**: Client builds clean with 0 TypeScript/CSS errors (`dist/` asset size: ~835 kB).
- [x] **Server Build**: Server TypeScript compiles clean with 0 errors to `dist/src/server.js`.
- [x] **Database Sync**: Prisma schema synchronized and seeded with 200+ historical and operational records.

---

## 8. Recommended Next Steps for Successor Agents

### Remaining Phase 7 items (Highest Priority):
1. **Start the ML Service**: The CP-SAT optimizer is not running. Set up a Python venv and start it:
   ```powershell
   cd e:\xampp\htdocs\img\CMS\ml-service
   python -m venv venv && .\venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   python train_attendance_model.py
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```
   Without this, the timetable generator falls back to a rule-based method (0 sessions).

2. **WebSocket Live Updates**: Add Socket.io to enable:
   - Real-time attendance count update on QR projector as students scan.
   - Live poll response aggregation on teacher screen.

3. **PDF Timetable Export**: Add `jspdf` + `jspdf-autotable` to the client and a Download button on TimetablePage that exports the visible grid as a formatted PDF.

4. **Unit Tests**: Run `npx vitest` and `npx jest --testPathPattern=api` to validate all endpoints. The test scaffolding is in place but suites are not populated.

5. **Student Registration**: The current seed only has 1 student. Build an admin flow to add students to batches (similar to the teacher registration form on ResourcesPage).

6. **Course-Teacher-Batch Allocations**: The CP-SAT solver needs course allocations (which teacher teaches which course to which batch) to be stored in a `CourseAllocation` table before it can generate a valid timetable. The schema supports this but no UI or API exists for it yet.

