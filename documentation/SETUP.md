# Development Setup & Installation Guide

This guide provides step-by-step instructions to set up, configure, seed, and run the **College Scheduling & Productivity Intelligence System**.

---

## 1. System Prerequisites

Before starting, ensure your host development environment has the following installed:

| Component | Minimum Version | Verification Command | Notes |
| :--- | :--- | :--- | :--- |
| **Node.js** | `v18.18.0` or higher | `node -v` | Backend server & Vite client |
| **npm** | `v9.0.0` or higher | `npm -v` | Package management |
| **Python** | `3.11.x` | `python --version` | ML service & OR-Tools |
| **PostgreSQL** | `15.x` | `psql --version` | Database engine (or via Docker) |
| **Docker & Compose** | Optional (Recommended) | `docker compose version` | Automated containerization |

> [!NOTE]
> If you are working in an existing XAMPP environment, remember that XAMPP ships with MySQL/MariaDB. This project uses **PostgreSQL 15** for advanced relational and JSON operations. You can run PostgreSQL alongside XAMPP or inside Docker without port conflicts (Postgres uses port `5432`, MySQL uses `3306`).

---

## 2. Environment Variables Configuration

Copy `.env.example` to `.env` in the project root:

```env
# ====================================================
# GLOBAL & DATABASE CONFIGURATION
# ====================================================
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=college_timetable
POSTGRES_PORT=5432
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/college_timetable?schema=public

# ====================================================
# BACKEND SERVER CONFIGURATION (/server)
# ====================================================
PORT=4000
NODE_ENV=development
JWT_ACCESS_SECRET=super_secret_access_token_key_change_in_production_12345
JWT_REFRESH_SECRET=super_secret_refresh_token_key_change_in_production_67890
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
ML_SERVICE_URL=http://localhost:8000
CLIENT_ORIGIN=http://localhost:5173

# ====================================================
# FRONTEND CLIENT CONFIGURATION (/client)
# ====================================================
VITE_API_URL=http://localhost:4000/api

# ====================================================
# ML SERVICE CONFIGURATION (/ml-service)
# ====================================================
ML_PORT=8000
MODEL_PATH=models/attendance_model.joblib
```

---

## 3. Quick Start with Docker Compose (Recommended)

The simplest way to start all services, database, and networking in one command:

```bash
# 1. Clone repository & enter directory
git clone <repository_url>
cd college-timetable

# 2. Prepare environment file
cp .env.example .env

# 3. Build images and start all containers
docker-compose up --build
```

### Accessing Running Services:
- **Web App (Client):** `http://localhost:5173`
- **Backend API:** `http://localhost:4000/api`
- **ML Microservice Docs (Swagger UI):** `http://localhost:8000/docs`
- **PostgreSQL Database:** `localhost:5432`

---

## 4. Manual Local Setup (Step-by-Step)

If developing locally without Docker, follow these instructions to set up each component:

### Step 4.1: Database Setup (PostgreSQL)
1. Ensure your local PostgreSQL service is running on port `5432`.
2. Create the target database:
   ```bash
   psql -U postgres -c "CREATE DATABASE college_timetable;"
   ```

### Step 4.2: Backend Server Setup
```bash
cd server

# 1. Install dependencies
npm install

# 2. Run Prisma migrations to build tables
npx prisma migrate dev --name init

# 3. Seed initial master data (admin, teachers, batches, courses, rooms, slots)
npx prisma db seed

# 4. Start backend in development mode (hot reloading)
npm run dev
```
*The server will start listening at `http://localhost:4000`.*

### Step 4.3: Python ML Service Setup
```bash
cd ml-service

# 1. Create and activate a Python virtual environment
# Windows (PowerShell):
python -m venv venv
.\venv\Scripts\Activate.ps1

# Linux / macOS:
# python3 -m venv venv
# source venv/bin/activate

# 2. Install required Python packages
pip install -r requirements.txt

# 3. Train and serialize the initial attendance prediction model
python train_attendance_model.py

# 4. Start the FastAPI development server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
*The ML service will start listening at `http://localhost:8000` with Swagger docs at `http://localhost:8000/docs`.*

### Step 4.4: Frontend Client Setup
```bash
cd client

# 1. Install frontend packages
npm install

# 2. Launch Vite development server
npm run dev
```
*The React client will launch at `http://localhost:5173`.*

---

## 5. Default Seed Accounts

Upon running `npx prisma db seed`, the following default test accounts are initialized:

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@college.edu` | `AdminPass123!` | Full institutional management, schedule generation, publishing |
| **Teacher** | `turing@college.edu` | `TeacherPass123!` | View personal schedule, launch attendance QR, in-class polls |
| **Teacher** | `hopper@college.edu` | `TeacherPass123!` | View personal schedule, launch attendance QR, in-class polls |
| **Student** | `student1@college.edu` | `StudentPass123!` | View batch schedule, scan QR check-in, submit exit feedback |

---

## 6. Verification & Healthchecks

Test that all components communicate properly:

```bash
# 1. Check Backend Server Health
curl http://localhost:4000/health
# Expected: {"status":"UP","database":"CONNECTED"}

# 2. Check ML Microservice Health
curl http://localhost:8000/health
# Expected: {"status":"UP","solver":"OR-Tools CP-SAT","model_loaded":true}

# 3. Test Attendance Prediction Endpoint
curl -X POST http://localhost:8000/predict-attendance \
  -H "Content-Type: application/json" \
  -d '{"dayOfWeek": 1, "slotNumber": 2, "courseCode": "CS401", "teacherId": "t1", "batchSize": 60}'
# Expected: {"predictedAttendanceRate": 0.88}
```

---

## 7. Troubleshooting Common Setup Issues

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| `P1001: Can't reach database server at localhost:5432` | PostgreSQL is not running or credentials in `.env` are wrong. | Start PostgreSQL service in Windows Services or check `DATABASE_URL` in `.env`. |
| `ModuleNotFoundError: No module named 'ortools'` | OR-Tools not installed in active virtual environment. | Ensure venv is activated (`.\venv\Scripts\Activate.ps1`) and run `pip install ortools`. |
| `CORS Error in Browser Console` | Client origin not allowed in backend CORS configuration. | Ensure `CLIENT_ORIGIN=http://localhost:5173` in `server/.env`. |
| `SolverStatus: INFEASIBLE` during timetable generation | Constraints are too strict (e.g. not enough classrooms or teachers for required weekly hours). | Inspect room capacity and teacher weekly load limits in Admin Settings, or relax consecutive lecture limits. |
