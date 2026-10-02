# Project Development Phases & Implementation Roadmap

This document outlines the systematic, phased implementation strategy for the **College Scheduling & Productivity Intelligence System**. Each phase defines clear goals, technical tasks, verifiable deliverables, and exit criteria.

---

## Roadmap Overview

```mermaid
gantt
    title College Timetable & Productivity System Implementation Roadmap
    dateFormat  YYYY-MM-DD
    section Foundation
    Phase 0: Discovery & Planning       :active, p0, 2026-10-05, 7d
    Phase 1: Project Setup & Core Monorepo : p1, after p0, 7d
    section Core Development
    Phase 2: Core Data Models & CRUD    : p2, after p1, 14d
    Phase 3: Timetable Engine (Manual + Rule) : p3, after p2, 14d
    section Intelligence
    Phase 4: ML Service & CP-SAT Engine : p4, after p3, 21d
    Phase 5: Attendance & Productivity Loop : p5, after p4, 14d
    section Polish & Production
    Phase 6: Analytics, Reports & Dashboards: p6, after p5, 7d
    Phase 7: Testing, Hardening & Deployment: p7, after p6, 7d
```

---

## Phase 0: Discovery & Planning (1 Week)
**Goals:** Define institutional rules, constraint catalog, success metrics, and stakeholders.

### Tasks
- **Stakeholder Interviews:**
  - Academic Deans: Semester calendar, credit hours, credit-to-contact hour ratios.
  - Department Heads (HODs): Room specialization (Computer Labs, Science Labs, Lecture Halls), cross-department shared electives.
  - Faculty Representatives: Grievance analysis on undesirable time slots (early morning 8:30 AM vs. late afternoon 3:45 PM), consecutive lecture tolerance, rest gaps.
  - Student Representatives: Travel constraints, fatigue factors, lunch break policies.
- **Constraint Catalog Specification:** Formulate initial categorization of Hard Constraints (inviolable) vs. Soft Constraints (optimizable preferences).
- **Metric Definitions:** Formalize the formula for **Effective Contact Hours** and **Productivity Score**.
- **Tech Stack Baseline:** Finalize versions (Node 18+, Python 3.11, PostgreSQL 15, Vite React 18).

**Deliverables:**
- Approved Institutional Constraint Catalog document.
- Mathematical definitions for Fairness Index and Productivity Scoring.
- User persona specifications for `ADMIN`, `TEACHER`, and `STUDENT`.

---

## Phase 1: Project Setup & Foundation (1 Week)
**Goals:** Monorepo architecture, Docker containerization, CI, base services, and authentication.

### Tasks
- **Repository Scaffolding:**
  - `/client`: Vite + React + TypeScript + Tailwind CSS + Lucide Icons + shadcn/ui.
  - `/server`: Node.js + Express + TypeScript + Prisma ORM.
  - `/ml-service`: Python 3.11 + FastAPI + Uvicorn + Pydantic.
  - Root configuration: `docker-compose.yml`, `.env.example`, `.gitignore`.
- **Database Initialization:**
  - Spin up PostgreSQL 15 Alpine in Docker.
  - Initialize Prisma with client generator and basic healthcheck.
- **Authentication Framework:**
  - User model with bcrypt password hashing.
  - JWT Access Token (15 min expiration) and Refresh Token (7 days) flow.
  - Authentication middleware (`authenticateToken`, `requireRole(['ADMIN', 'TEACHER'])`).
- **Healthcheck Endpoints:**
  - `GET /health` on Server (checks DB connectivity).
  - `GET /health` on ML Service (checks Python environment and solver availability).

**Deliverables:**
- Running `docker-compose up --build` with all services healthy.
- Working authentication endpoints (`/api/auth/register`, `/api/auth/login`, `/api/auth/refresh`).
- Basic frontend landing page with working login/logout forms and JWT storage.

---

## Phase 2: Core Data Models & CRUD (2 Weeks)
**Goals:** Implement complete Prisma schema, REST APIs, and administrative resource management.

### Tasks
- **Prisma Schema Expansion:**
  - Implement full entity suite: `User`, `Teacher`, `Student`, `Batch`, `Department`, `Course`, `Room`, `TimeSlot`, `AcademicCalendar`, `Holiday`, `Event`, `Constraint`.
  - Add foreign key relationships, cascade behaviors, and indexes.
- **Backend CRUD Services & Controllers:**
  - Build endpoints for Teachers, Batches, Courses, Rooms, TimeSlots, Holidays, and Events.
  - Implement input validation via Zod schemas.
  - Implement bulk import capabilities (CSV parser for student batches and course allocations).
- **Admin Management Portal (Frontend):**
  - Implement data tables with search, filtering, pagination, and modal dialogs.
  - Resource forms with client-side validation (`react-hook-form` + `@hookform/resolvers/zod`).
  - Calendar View for declared Holidays and Institutional Events.
- **Database Seeding:**
  - Create `prisma/seed.ts` populating 1 Admin, 8 Teachers, 4 Batches (80 students), 12 Courses, 8 Rooms, 35 Weekly TimeSlots, sample holidays, and sample campus events.

**Deliverables:**
- Complete database migration executed via `npx prisma migrate dev --name init`.
- Seed script executes cleanly (`npx prisma db seed`).
- Admin UI allows managing all physical and academic resources without database access.

---

## Phase 3: Timetable Engine – Manual + Basic Auto (2 Weeks)
**Goals:** Manual timetable editing, interactive calendar grid, and simple rule-based auto-generation.

### Tasks
- **Timetable Grid Component (Frontend):**
  - Interactive grid displaying Days (Mon–Sat) vs. Time Slots (P1–P7).
  - Dynamic filter by Batch, Teacher, or Classroom.
  - Visual indicators for Room type (Lab vs. Lecture Hall) and slot desirability.
- **Manual Drag-and-Drop & Override Engine:**
  - Enable admins to move or assign lectures between slots using HTML5 Drag-and-Drop or `@hello-pangea/dnd`.
  - Immediate client-side validation checking for hard collisions:
    - Teacher double-booking.
    - Room double-booking.
    - Batch overlapping classes.
- **Monthly Calendar Generator:**
  - Logic to extrapolate a recurring weekly template across all calendar dates of a given month.
  - Automatically mask dates falling on `Holiday` or `Event` records (marking sessions as `CANCELLED_HOLIDAY` or `BLOCKED_EVENT`).
- **Schedule Persistence & Publishing Workflow:**
  - Store schedules with statuses: `DRAFT`, `PUBLISHED`, `ARCHIVED`.
  - Version control for monthly schedules.

**Deliverables:**
- Admin can construct and edit a weekly schedule grid using drag-and-drop.
- Conflict detection warns user immediately if a teacher or room is double-booked.
- Monthly preview accurately suppresses classes on gazetted holidays and university events.

---

## Phase 4: ML Service & Optimization (3 Weeks)
**Goals:** Advanced combinatorial optimization, attendance prediction, and teacher fairness balancing.

### Tasks
- **OR-Tools CP-SAT Scheduling Engine (`ml-service/scheduler.py`):**
  - Formulate decision variable $X_{c, t, b, r, s} \in \{0, 1\}$.
  - Encode Hard Constraints:
    - No teacher overlaps: $\sum_{c, b, r} X \le 1, \quad \forall t, s$.
    - No room overlaps: $\sum_{c, t, b} X \le 1, \quad \forall r, s$.
    - No batch overlaps: $\sum_{c, t, r} X \le 1, \quad \forall b, s$.
    - Room capacity requirement: $\text{Capacity}(r) \ge \text{Size}(b)$.
    - Room type requirement: Course Type matches Room Type (Lab courses in Lab rooms).
    - Maximum consecutive lectures per teacher $\le 3$.
    - Mandatory institution-wide lunch break slot.
  - Encode Soft Constraints & Objective Function:
    - Maximize teacher preferred slots.
    - Maximize predicted attendance (via ML prediction score).
    - Minimize variance of undesirable slots assigned across faculty.
    - Minimize gaps in student batch daily schedules.
- **Attendance Prediction Model (`ml-service/predictor.py`):**
  - Feature engineering: `day_of_week`, `slot_number`, `course_level`, `is_lab`, `teacher_id`, `batch_size`.
  - Train Random Forest Regressor using `scikit-learn`.
  - Serialize model with `joblib` into `ml-service/models/attendance_model.joblib`.
- **Fairness Balancer (`ml-service/fairness.py`):**
  - Compute Gini coefficient and variance of undesirable slots ($D(s) \le 2.0$) per teacher.
- **Server Integration:**
  - Implement Node.js proxy service calling `POST /generate-timetable` on FastAPI.
  - Asynchronous background job handling or loading state with timeout guards.
- **Frontend Generation Modal:**
  - Admin button: "Run ML Schedule Optimization".
  - Parameter modal: Weight sliders for Fairness vs. Preference vs. Attendance.
  - Visual summary of generation results: Solved status, Execution time, Fairness score, Total predicted attendance.

**Deliverables:**
- Fully optimized timetable generated by ML service in < 15 seconds.
- Attendance predictor trained and serialized ($R^2 > 0.75$).
- Fairness metrics displayed on admin timetable view.

---

## Phase 5: Attendance, Engagement, Productivity (2 Weeks)
**Goals:** Track lecture execution, in-class engagement, and multi-source productivity scoring.

### Tasks
- **Attendance Marking (Manual + Dynamic QR):**
  - Time-rotating QR code generator (refreshes every 15 seconds).
  - Student QR scanning view with geo/time verification.
  - Fallback manual bulk-marking interface for teachers.
- **Engagement Capture (Polls, Quizzes):**
  - Teacher view to launch quick 1-question check-in polls or comprehension quizzes.
  - Student mobile-friendly view to submit poll answers in real time.
- **Feedback Forms:**
  - 30-second exit ticket modal for students: 1-5 star rating + feedback tags.
- **Productivity Scoring Endpoint & Storage:**
  - Automated calculation of lecture productivity:
    $$\text{Productivity} = 0.4 \times A_{\text{rate}} + 0.3 \times E_{\text{score}} + 0.2 \times L_{\text{quiz}} + 0.1 \times F_{\text{rating}}$$
  - Store score records in `ProductivityScore` table linked to `Session`.
- **Teacher & Student Views:**
  - Session details view showing attendance breakdown and engagement metrics.

**Deliverables:**
- Complete feedback loop; productivity scores per session.
- Functional attendance marking flow (both QR code and manual roll call).
- Engagement poll creation and response aggregation.

---

## Phase 6: Analytics & Dashboards (1 Week)
**Goals:** Visualize institutional trends and generate actionable reports.

### Tasks
- **Dashboards for Admin, Teacher, Student:**
  - Admin: Institutional attendance heatmap, faculty fairness distribution, room utilization.
  - Teacher: Personal workload summary, attendance trends, productivity feedback.
  - Student: Subject-wise attendance percentages with minimum attendance warnings (< 75%).
- **Interactive Recharts Visualizations:**
  - Attendance drop-off by time slot.
  - Undesirable slot distribution bar charts.
  - Lecture productivity curves.
- **Export Reports:**
  - Export monthly timetables to PDF and CSV.
  - Print-ready formatted calendar views.

**Deliverables:**
- Interactive analytics dashboards across all three roles.
- PDF and CSV export operational for departmental timetables.

---

## Phase 7: Polish, Testing, Deployment (1 Week)
**Goals:** Security hardening, end-to-end testing, and production containerization.

### Tasks
- **Unit & Integration Tests:**
  - Supertest/Jest for API endpoints.
  - Solver unit tests with edge-case constraints (tight room constraints, teacher absence).
  - Vitest for frontend components.
- **Error Handling & Logging:**
  - Standardized JSON error response handler across all endpoints.
  - Request logging with Morgan and Winston.
- **Performance Tuning:**
  - Database compound indexing on `Session(date, roomId, teacherId, batchId)`.
  - Client query caching with TanStack Query.
- **Deployment Scripts & Docker:**
  - Production multi-stage Dockerfiles.
  - Nginx reverse-proxy configuration with SSL termination.
  - Automated database backup script.
- **Documentation Finalization:**
  - Verify all markdown guides, API references, and user guides.

**Deliverables:**
- Deployable app with automated tests and production documentation.