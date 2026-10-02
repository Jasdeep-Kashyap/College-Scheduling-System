# AI Agent Development Guide & Master Execution Blueprint

> **Notice to AI Agent (Claude, Antigravity, or other LLM coding agents):**
> You are tasked with implementing the complete, production-grade codebase for the **College Scheduling & Productivity Intelligence System**.
> Follow this exact blueprint, adhere strictly to the modular architecture, and execute each milestone sequentially.

---

## 1. System Vision & Technical Boundaries

You are building a 3-tier monorepo:
1. **`client/`**: Modern React 18 SPA with TypeScript, Tailwind CSS, shadcn/ui components, TanStack Query, and Recharts.
2. **`server/`**: Node.js + Express + TypeScript REST API using Prisma ORM with PostgreSQL.
3. **`ml-service/`**: Python 3.11 microservice using FastAPI, Google OR-Tools CP-SAT for constraint optimization, and scikit-learn for attendance prediction.

### Architectural Rules
- **No monolithic single-file dumps:** Break code down cleanly into controllers, services, middlewares, models, components, hooks, and utilities.
- **Type Safety:** TypeScript in strict mode across client and server. Strict Pydantic models for Python API schemas.
- **Never mock core algorithms:** Implement the actual CP-SAT constraint model and the actual scikit-learn model training/inference scripts.
- **Zero Hardcoded Secrets:** Consume all ports, URLs, secrets, and database strings from environment variables.

---

## 2. Target File Tree Structure

Your implementation must deliver the following file organization:

```
college-timetable/
├── docker-compose.yml
├── .env.example
├── README.md
├── user_guide.md
├── documentation/
│   ├── ARCHITECTURE.md
│   ├── PHASES.md
│   ├── DATABASE.md
│   ├── API.md
│   ├── ML_SERVICE.md
│   ├── SETUP.md
│   └── AI_DEV_GUIDE.md
│
├── client/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── index.css
│   │   ├── api/
│   │   │   ├── client.ts              # Axios / Fetch client with JWT interceptors
│   │   │   ├── auth.api.ts
│   │   │   ├── timetable.api.ts
│   │   │   ├── attendance.api.ts
│   │   │   └── analytics.api.ts
│   │   ├── context/
│   │   │   └── AuthContext.tsx        # User state, login, logout, role guards
│   │   ├── components/
│   │   │   ├── ui/                    # shadcn/ui buttons, dialogs, badges, inputs
│   │   │   ├── layout/                # Navbar, Sidebar, PageHeader
│   │   │   ├── timetable/             # DragDropGrid, SlotCard, FilterBar, Legend
│   │   │   ├── attendance/            # QrScannerModal, DynamicQrDisplay, RollCallTable
│   │   │   └── analytics/             # FairnessBarChart, AttendanceHeatmap, ProductivityRadar
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── DashboardPage.tsx      # Role-based dashboard (Admin/Teacher/Student)
│   │   │   ├── TimetablePage.tsx      # Interactive monthly/weekly schedule view
│   │   │   ├── ResourcesPage.tsx      # Admin CRUD for Teachers, Rooms, Courses
│   │   │   ├── AttendancePage.tsx     # Teacher check-in & student history
│   │   │   └── AnalyticsPage.tsx      # Deep-dive institutional reports
│   │   └── types/
│   │       └── index.ts               # Shared TypeScript interfaces
│
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   ├── schema.prisma              # Complete 16-model schema from DATABASE.md
│   │   └── seed.ts                    # Realistic data seeder with 200+ sessions
│   ├── src/
│   │   ├── server.ts                  # App initialization & port binding
│   │   ├── app.ts                     # Express middlewares, routing, error handlers
│   │   ├── config/
│   │   │   └── env.ts                 # Validated environment settings
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.ts     # JWT token verification
│   │   │   ├── role.middleware.ts     # Role authorization guard (ADMIN, etc.)
│   │   │   └── error.middleware.ts    # Global centralized error handler
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── resource.controller.ts # Teachers, Batches, Courses, Rooms, Slots
│   │   │   ├── timetable.controller.ts# Generation trigger, manual override, publish
│   │   │   ├── attendance.controller.ts# Dynamic QR token, scan check-in, bulk roll call
│   │   │   ├── engagement.controller.ts# Polls & quiz recording
│   │   │   └── analytics.controller.ts# Aggregated metrics & productivity
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── resource.service.ts
│   │   │   ├── timetable.service.ts   # Communicates with Python ML service
│   │   │   ├── attendance.service.ts
│   │   │   └── mlClient.service.ts    # Axios HTTP client calling port 8000
│   │   └── routes/
│   │       ├── auth.routes.ts
│   │       ├── resource.routes.ts
│   │       ├── timetable.routes.ts
│   │       ├── attendance.routes.ts
│   │       └── analytics.routes.ts
│
└── ml-service/
    ├── requirements.txt
    ├── Dockerfile
    ├── main.py                        # FastAPI entrypoint, routes & CORS
    ├── schemas.py                     # Pydantic schemas for request/response
    ├── scheduler.py                   # Google OR-Tools CP-SAT timetable optimizer
    ├── predictor.py                   # scikit-learn Random Forest attendance inference
    ├── fairness.py                    # Gini coefficient & slot variance engine
    ├── productivity.py                # Multi-signal lecture productivity calculator
    ├── train_attendance_model.py      # Standalone training script for attendance predictor
    └── models/
        └── attendance_model.joblib    # Serialized model artifact
```

---

## 3. Step-by-Step Implementation Sequence

Follow this rigorous 6-step build path:

### Step 1: Persistence & Database Layer (`server/prisma`)
1. Create `server/prisma/schema.prisma` using the verified schema in [DATABASE.md](file:///e:/xampp/htdocs/img/CMS/documentation/DATABASE.md).
2. Write `server/prisma/seed.ts` populating:
   - 1 Admin (`admin@college.edu`), 8 Teachers with differing weekly load capacities.
   - 4 Batches (Year 2 & 3, Batches A & B) with 160 students.
   - 12 Courses (8 Theory, 4 Labs) with assigned credits and weekly hours.
   - 8 Rooms (Lecture Halls, Computer Labs, Seminar Rooms).
   - 35 TimeSlots with realistic desirability scores ($1.0 - 5.0$).
   - 200 historical Session records with realistic attendance and feedback.
3. Test migration: `npx prisma migrate dev --name init && npx prisma db seed`.

### Step 2: Backend Core & Security Layer (`server/src`)
1. Configure Express application with `cors`, `helmet`, `express.json()`, and `morgan` logging.
2. Implement JWT authentication system:
   - Salted password hashing with `bcryptjs`.
   - Access Token (15 min) + Refresh Token (7 days).
3. Build complete CRUD controllers for academic resources (`/teachers`, `/courses`, `/rooms`, `/batches`, `/time-slots`, `/holidays`, `/events`).
4. Implement Collision Detection Service in `timetable.service.ts`:
   - Before executing manual drag-and-drop overrides, verify:
     - Is the teacher already booked in this slot on this date?
     - Is the room already occupied?
     - Is the batch already attending another lecture?

### Step 3: Python ML & Optimization Microservice (`ml-service/`)
1. Create `requirements.txt` with `fastapi`, `uvicorn`, `ortools`, `scikit-learn`, `pandas`, `joblib`.
2. Implement `train_attendance_model.py`:
   - Features: `day_of_week`, `slot_number`, `is_first_slot`, `is_last_slot`, `course_type`, `batch_size`.
   - Train `RandomForestRegressor` and save to `models/attendance_model.joblib`.
3. Implement `scheduler.py` (OR-Tools CP-SAT):
   - Model variables $X_{c, r, d, s} \in \{0, 1\}$.
   - Hard constraints: Teacher overlap, room overlap, batch overlap, room capacity, lab matching, consecutive lecture cap ($\le 3$), lunch break reservation.
   - Objective function: Maximize predicted attendance + Maximize teacher slot preference - Minimize teacher undesirable slot variance.
4. Implement `fairness.py`: Gini coefficient calculation for undesirable slot distribution.
5. Implement `productivity.py`:
   - Formula: $P = 100 \times (0.4 \times A_{\text{rate}} + 0.3 \times E_{\text{poll}} + 0.2 \times L_{\text{quiz}} + 0.1 \times F_{\text{rating}})$.
6. Implement `main.py` exposing FastAPI endpoints:
   - `POST /generate-timetable`
   - `POST /predict-attendance`
   - `POST /productivity-score`
   - `GET /health`

### Step 4: Backend Timetable & ML Dispatcher
1. Wire `timetable.controller.ts` to trigger `POST /generate-timetable` on `http://localhost:8000`.
2. Parse the returned optimal schedule and persist newly generated `Session` records in PostgreSQL within a transaction (`prisma.$transaction`).
3. Expose attendance workflows:
   - Time-limited dynamic QR code signing (HMAC-SHA256).
   - QR scan endpoint for student mobile devices.
   - Bulk roll-call endpoint for teachers.
4. Expose analytics endpoints:
   - `/api/analytics/fairness`: Teacher workload and undesirable slot breakdown.
   - `/api/analytics/attendance-trends`: Slot-by-slot retention.
   - `/api/analytics/productivity`: Composite score breakdown per lecture.

### Step 5: Frontend Client & User Interface (`client/`)
1. Setup Vite React with TypeScript and configure Tailwind CSS with institutional modern color palettes (e.g. Slate, Indigo, Emerald).
2. Implement `AuthContext` to manage authentication tokens, logged-in user profile, and protected route redirection.
3. Build the **Interactive Timetable Grid**:
   - Filter by Batch, Teacher, or Classroom.
   - Distinct color-coded course badges.
   - Desirability indicators (Prime slot vs. End-of-day slot).
   - Drag-and-drop manual reassignment with instant collision feedback.
4. Build the **Attendance Module**:
   - Teacher view: Rotating QR code projector (auto-refreshes every 15 seconds) + quick roll-call checklist.
   - Student view: One-click camera QR scanner check-in.
   - In-class 1-question poll launcher.
5. Build the **Analytics Dashboard** using Recharts:
   - Teacher Fairness Bar Chart (compares undesirable slot counts across faculty).
   - Time-of-day Attendance Drop Curve (visualizing the 8:30 AM and 4:00 PM drop-off).
   - Productivity Breakdown Gauge.

### Step 6: Containerization & DevOps
1. Write multi-stage Dockerfiles for `client/`, `server/`, and `ml-service/`.
2. Write root `docker-compose.yml` linking all 4 containers (`postgres`, `server`, `ml-service`, `client`).
3. Validate that running `docker-compose up --build` launches the entire ecosystem cleanly on default ports without manual intervention.

---

## 4. Verification Checkpoints for AI Agent

Before marking development complete, verify the following test cases:

- [ ] **Auth Flow:** Able to log in as `admin@college.edu`, `turing@college.edu`, and `student1@college.edu`. Role guards properly prevent students from accessing `/api/timetable/generate`.
- [ ] **Hard Constraint Validation:** Attempting to assign two classes to the same teacher in the same slot returns HTTP `409 Conflict` with a clear explanation.
- [ ] **Monthly Holiday Masking:** When generating October 2026 schedule, verify that declared holidays have zero lectures scheduled.
- [ ] **ML Generation Test:** Calling `POST /api/timetable/generate` triggers the CP-SAT solver, successfully returns a schedule with status `OPTIMAL`, and records Gini coefficient $< 0.15$.
- [ ] **Productivity Loop:** Marking a session with 90% attendance, 80% poll score, 85% quiz score, and 4.5/5 feedback calculates a composite score of $\approx 87.5 / 100$.
