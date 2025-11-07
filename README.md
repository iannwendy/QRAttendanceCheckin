# QR Attendance System

An end-to-end attendance platform with QR-based check-in, GPS verification, OTP fallback, and watermarked photo evidence.

## Overview

The system supports two check-in methods:
1. QR Code + GPS (default)
2. OTP + Photo (fallback)

This repository contains both the backend API and the frontend web app, along with Docker configuration for local development.

## Architecture

- Backend: NestJS, Prisma ORM, PostgreSQL
- Frontend: React, Vite, TypeScript
- Database: PostgreSQL 16
- Authentication: JWT with roles (STUDENT, LECTURER, ADMIN)

## Directory Structure

```
/SOA_QRAttendance
  /backend            # NestJS API
  /frontend           # React + Vite app
  docker-compose.yml
  README.md
```

## Getting Started

### Prerequisites

- Node.js 20+
- Docker and Docker Compose
- npm (or yarn/pnpm)

### Option A: Run everything with Docker

```bash
docker compose up -d
```

Services:
- db: PostgreSQL exposed on host port 5433 (container 5432)
- backend: NestJS API on port 8080
- frontend: React app on port 3000

### Option B: Run locally (manual)

#### 1) Database

```bash
docker compose up -d db

# Local DB connection (host):
# postgresql://app:app@localhost:5433/attendance
```

#### 2) Backend setup

```bash
cd backend
npm install

# Create .env with values (see Environment section below)
cat > .env << 'EOF'
DATABASE_URL=postgresql://app:app@localhost:5433/attendance
JWT_SECRET=dev_change_me
FRONTEND_URL=http://localhost:3000
QR_ROTATE_SECONDS=60
OTP_STEP_SECONDS=30
GEOFENCE_RADIUS_M_DEFAULT=100
UPLOAD_DIR=./uploads
EOF

npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed   # seeds admin, lecturer, classes, 100 students
npm run start:dev     # runs on http://localhost:8080
```

#### 3) Frontend setup

```bash
cd frontend
npm install

# Create .env (see Environment section below)
npm run dev           # runs on http://localhost:3000
```

## Default Accounts (from seed)

- Admin: `admin`, password `pass123`
- Lecturer: `lecturer`, password `pass123`
- Students (100):
  - MSSV: `523H0001` to `523H0100`
  - Password: `pass123`

## Key Features

- Student
  - Login `/login`
  - QR check-in `/student/scan` (auto GPS prompt and validation)
  - OTP + Photo check-in `/student/otp` (watermark includes student code, session id, OTP, timestamp)

- Lecturer
  - Session management `/teacher/session/:id`
  - Rotating QR (every 60s) and OTP (every 30s)
  - Attendance list and photo evidence review

## API Overview (high-level)

- Auth
  - `POST /auth/login`
  - `GET /auth/me`

- Classes
  - `POST /classes`
  - `GET /classes/:id`
  - `POST /classes/:id/enroll`

- Sessions
  - `POST /sessions`
  - `GET /sessions/:id`
  - `GET /sessions/:id/qr`
  - `GET /sessions/:id/otp`

- Attendance
  - `POST /attendance/checkin-qr`
  - `POST /attendance/checkin-otp`
  - `GET /attendance/session/:id`

## Security Notes

- JWT authentication (Bearer token)
- Role-based access control (RBAC)
- QR token with 60s TTL and anti-replay nonce
- TOTP with ±1 step tolerance
- GPS geofencing
- Watermarked photo evidence

## Environment Variables

### Backend (.env)
```
# If backend runs in Docker (together with db service):
# DATABASE_URL=postgresql://app:app@db:5432/attendance

# If backend runs locally and only db is in Docker:
# DATABASE_URL=postgresql://app:app@localhost:5433/attendance

JWT_SECRET=dev_change_me
FRONTEND_URL=http://localhost:3000
QR_ROTATE_SECONDS=60
OTP_STEP_SECONDS=30
GEOFENCE_RADIUS_M_DEFAULT=100
UPLOAD_DIR=./uploads
```

### Frontend (.env)
```
VITE_API_BASE=http://localhost:8080
VITE_QR_ROTATE_SECONDS=60
VITE_OTP_STEP_SECONDS=30
```

## Development Scripts

### Backend
```bash
npm run start:dev
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### Frontend
```bash
npm run dev
npm run build
npm run preview
```

## Troubleshooting

- Database connection issues
  - Ensure `db` container is running: `docker ps`
  - If backend runs locally, use host port `5433` in `DATABASE_URL`
  - If backend runs in Docker, use `db:5432` in `DATABASE_URL`

- Camera access in mobile browsers
  - Requires HTTPS on phones; consider a tunnel (Cloudflare Tunnel or ngrok)
  - Grant camera permissions

- GPS issues
  - Grant location permissions
  - Use OTP + Photo fallback if GPS is unavailable

- CORS errors
  - Check `FRONTEND_URL` in backend `.env`
  - Ensure it matches the actual frontend origin

## License

MIT

## Production Checklist

- Use a strong `JWT_SECRET`
- Enforce HTTPS
- Store uploads in cloud storage (e.g., S3/R2)
- Add monitoring and logging
- Configure rate limiting

## Database ERD

![ERD](docs/erd.png)

Fallback (Mermaid):

```mermaid
%% See editable source at docs/erd.mmd
erDiagram
    USER {
        id string
        email string
        passwordHash string
        fullName string
        studentCode string
        role string
        createdAt date
        updatedAt date
    }

    CLASSROOM {
        id string
        code string
        name string
        createdAt date
    }

    ENROLLMENT {
        id string
        classId string
        studentId string
    }

    SESSION_REC {
        id string
        classId string
        title string
        startTime date
        endTime date
        latitude float
        longitude float
        geofenceRadius int
        otpSecret string
        createdAt date
    }

    ATTENDANCE_REC {
        id string
        sessionId string
        studentId string
        method string
        status string
        lat float
        lng float
        accuracy float
        otpUsed string
        createdAt date
        updatedAt date
    }

    EVIDENCE_REC {
        id string
        attendanceId string
        photoUrl string
        metaJson string
    }

    USER ||--o{ ENROLLMENT : "enrolls"
    CLASSROOM ||--o{ ENROLLMENT : "has"

    CLASSROOM ||--o{ SESSION_REC : "has"

    SESSION_REC ||--o{ ATTENDANCE_REC : "has"
    USER ||--o{ ATTENDANCE_REC : "has"

    ATTENDANCE_REC ||--o| EVIDENCE_REC : "evidence"
```

