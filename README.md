# QR Attendance System

A QR-based attendance system with GPS verification, OTP fallback, and watermarked photos.

![Demo](docs/demo.png)

## Architecture

- **Backend**: NestJS, Prisma ORM, PostgreSQL
- **Frontend**: React, Vite, TypeScript
- **Database**: PostgreSQL 16
- **Authentication**: JWT with roles (STUDENT, LECTURER, ADMIN)

## Setup

### Prerequisites

- Node.js 20+
- Docker and Docker Compose

### Start with Docker

```bash
docker compose up -d
```

Services:
- `db`: PostgreSQL (port 5433 on host)
- `backend`: NestJS API (port 8080)
- `frontend`: React app (port 3000)

### Production deployment (VPS / domain)

1. Copy the sample production config:
   ```bash
   cp env.production.ready .env.production
   ```
2. Edit `.env.production` with your own secure values:
   - `POSTGRES_*`, `JWT_SECRET`: change to strong secrets, known only internally
   - `FRONTEND_URL=https://qrattendance.xyz` (or your official domain)
   - `VITE_API_BASE=https://qrattendance.xyz/api` (or your public backend endpoint)
3. Start the production stack:
   ```bash
   docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
   ```
4. Verify after deployment:
   - Frontend: `curl -I https://qrattendance.xyz`
   - Backend health: `curl -I https://qrattendance.xyz/api/health`
5. If you use a reverse proxy/Nginx, see `docs/CAU_HINH_DOMAIN_HTTPS.md` for enabling HTTPS on your domain.

Services (docker-compose.prod.yml):
- `db`: PostgreSQL (port 5432)
- `backend`: NestJS API (port `${BACKEND_PORT:-8080}`)
- `frontend`: React build (port 3000 → 80 inside container, usually proxied via Nginx)

## Default accounts

- **Admin**: `admin` / `pass123`
- **Lecturer**: `lecturer` / `pass123`
- **Students**: `523H0001` to `523H0100` / `pass123`

## Main features

### Students
- Log in and scan QR to check in (GPS automatically validated)
- Check in via OTP + photo (fallback when GPS is unavailable)
- Photos include watermark: student ID, session code, OTP, timestamp

### Lecturers
- Manage classes and sessions
- Create sessions with human-friendly public codes (`publicCode`)
- Auto-rotating QR every 60s, OTP every 30s
- View attendance list and evidence photos
- Edit and delete sessions

## Core APIs

- `POST /auth/login` - Login
- `POST /sessions` - Create a session
- `GET /sessions/code/:code` - Get a session by `publicCode`
- `GET /sessions/:id/qr` - Get QR token
- `GET /sessions/:id/otp` - Get OTP
- `POST /attendance/checkin-qr` - Check in via QR
- `POST /attendance/checkin-otp` - Check in via OTP

## Database ERD

![ERD](docs/erd.png)

See more details in [docs/erd-relationships.md](docs/erd-relationships.md)

## Troubleshooting

- **Database**: Ensure `db` container is running: `docker ps`
- **Domain/HTTPS**: Make sure DNS for `qrattendance.xyz` (or your domain) points to the correct IP and SSL certificates are valid
- **GPS/Camera**: Requires HTTPS (domain with SSL) and appropriate permissions on mobile browsers

## License

MIT 
<!-- Đây là comment, sẽ KHÔNG hiển thị -->
<!-- Đây là comment, sẽ KHÔNG hiển thị -->
<!-- Đây là comment, sẽ KHÔNG hiển thị -->