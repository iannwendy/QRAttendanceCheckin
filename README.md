# QR Attendance System

Hệ thống điểm danh bằng QR code với GPS, OTP fallback và ảnh có watermark.

## Kiến trúc

- **Backend**: NestJS, Prisma ORM, PostgreSQL
- **Frontend**: React, Vite, TypeScript
- **Database**: PostgreSQL 16
- **Authentication**: JWT với roles (STUDENT, LECTURER, ADMIN)

## Cài đặt

### Prerequisites

- Node.js 20+
- Docker và Docker Compose
- LocalXpose (cho tunnel)

### Khởi động với Docker

```bash
docker compose up -d
```

Services:
- `db`: PostgreSQL (port 5433 trên host)
- `backend`: NestJS API (port 8080)
- `frontend`: React app (port 3000)

### Thiết lập Tunnel (cho mobile testing)

Script `refresh_tunnels.sh` tự động tạo LocalXpose tunnels và cập nhật `docker-compose.yml`:

```bash
./refresh_tunnels.sh
```

Script này sẽ:
1. Dừng các tunnel cũ
2. Tạo tunnel mới cho frontend (port 3000) và backend (port 8080)
3. Tự động cập nhật `FRONTEND_URL` và `VITE_API_BASE` trong `docker-compose.yml`
4. Reload Docker containers

**Lưu ý**: Cần cài đặt LocalXpose và đăng nhập trước khi chạy script.

## Tài khoản mặc định

- **Admin**: `admin` / `pass123`
- **Lecturer**: `lecturer` / `pass123`
- **Students**: `523H0001` đến `523H0100` / `pass123`

## Tính năng chính

### Sinh viên
- Đăng nhập và quét QR để điểm danh (tự động kiểm tra GPS)
- Điểm danh bằng OTP + ảnh (fallback khi không có GPS)
- Ảnh có watermark: MSSV, mã buổi, OTP, timestamp

### Giảng viên
- Quản lý lớp học và buổi học
- Tạo buổi học với mã công khai (publicCode) dễ nhớ
- QR code tự động rotate mỗi 60s, OTP mỗi 30s
- Xem danh sách điểm danh và ảnh bằng chứng
- Sửa và xóa buổi học

## API chính

- `POST /auth/login` - Đăng nhập
- `POST /sessions` - Tạo buổi học
- `GET /sessions/code/:code` - Lấy buổi học theo publicCode
- `GET /sessions/:id/qr` - Lấy QR token
- `GET /sessions/:id/otp` - Lấy OTP
- `POST /attendance/checkin-qr` - Điểm danh bằng QR
- `POST /attendance/checkin-otp` - Điểm danh bằng OTP

## Database ERD

![ERD](docs/erd.png)

Xem chi tiết tại [docs/erd-relationships.md](docs/erd-relationships.md)

## Troubleshooting

- **Database**: Kiểm tra container `db` đang chạy: `docker ps`
- **Tunnel**: Đảm bảo LocalXpose đã đăng nhập và chạy `./refresh_tunnels.sh`
- **GPS/Camera**: Cần HTTPS (dùng tunnel) và cấp quyền trên mobile browser

## License

MIT
