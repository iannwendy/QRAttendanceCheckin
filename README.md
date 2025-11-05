# QR Attendance System

Hệ thống điểm danh QR với xác thực GPS, OTP tại lớp và ảnh chụp có watermark.

## 📋 Mô tả

Hệ thống điểm danh thông minh với 2 phương thức:
1. **QR + GPS** (mặc định): Quét QR code và xác thực vị trí GPS
2. **OTP + Ảnh** (fallback): Nhập OTP và chụp ảnh có watermark

## 🏗️ Kiến trúc

- **Backend**: NestJS + Prisma + PostgreSQL
- **Frontend**: React + Vite + TypeScript
- **Database**: PostgreSQL 16
- **Auth**: JWT với roles (STUDENT, LECTURER, ADMIN)

## 📁 Cấu trúc thư mục

```
/qr-attendance/
  /backend/          # NestJS API
  /frontend/         # React + Vite
  docker-compose.yml
  README.md
```

## 🚀 Hướng dẫn chạy dự án

### Yêu cầu

- Node.js 20+
- Docker & Docker Compose
- npm hoặc yarn

### Bước 1: Khởi động Database

```bash
docker compose up -d db
```

### Bước 2: Setup Backend

```bash
cd backend

# Cài đặt dependencies
npm install

# Tạo file .env từ .env.example
cp .env.example .env

# Generate Prisma client
npm run prisma:generate

# Chạy migrations
npm run prisma:migrate

# Seed data (tạo 100 sinh viên, admin, lecturer, lớp học)
npm run prisma:seed

# Chạy backend (port 8080)
npm run start:dev
```

### Bước 3: Setup Frontend

Mở terminal mới:

```bash
cd frontend

# Cài đặt dependencies
npm install

# Tạo file .env từ .env.example
cp .env.example .env

# Chạy frontend (port 3000)
npm run dev
```

### Bước 4: Test trên điện thoại (Tùy chọn)

Để test trên điện thoại, bạn cần tạo tunnel HTTPS:

#### Sử dụng Cloudflare Tunnel:

```bash
# Cài đặt cloudflared (nếu chưa có)
# macOS: brew install cloudflared
# hoặc download từ https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/

# Tạo tunnel cho frontend
cloudflared tunnel --url http://localhost:3000

# Mở terminal mới, tạo tunnel cho backend
cloudflared tunnel --url http://localhost:8080
```

Sau đó cập nhật `frontend/.env`:
```
VITE_API_BASE=<tunnel-url-backend>
```

Và truy cập frontend qua tunnel URL trên điện thoại.

#### Hoặc sử dụng ngrok:

```bash
# Cài đặt ngrok: https://ngrok.com/download

# Tạo tunnel cho frontend
ngrok http 3000

# Terminal mới, tạo tunnel cho backend
ngrok http 8080
```

## 👤 Tài khoản mặc định

Sau khi chạy seed:

### Admin
- Email: `admin@test.com`
- Password: `admin123`

### Giảng viên
- Email: `lecturer@test.com`
- Password: `lecturer123`

### Sinh viên (100 tài khoản)
- Email: `student523H0001@test.com` đến `student523H0100@test.com`
- Password: `pass123`
- MSSV: `523H0001` đến `523H0100`

## 📱 Chức năng

### Sinh viên

1. **Đăng nhập**: `/login`
2. **Quét QR điểm danh**: `/student/scan`
   - Tự động lấy GPS
   - Quét QR code từ màn hình lớp
   - Nếu không có GPS → gợi ý chuyển sang OTP
3. **Điểm danh bằng OTP + Ảnh**: `/student/otp`
   - Nhập Session ID và OTP
   - Chụp ảnh với watermark (MSSV, Session ID, OTP, timestamp)
   - Upload và chờ duyệt

### Giảng viên

1. **Quản lý buổi học**: `/teacher/session/:id`
   - Xem QR code động (đổi mỗi 60s)
   - Xem OTP hiện tại (đổi mỗi 30s)
   - Xem danh sách điểm danh
   - Xem ảnh minh chứng (nếu có)

## 🔧 API Endpoints

### Auth
- `POST /auth/login` - Đăng nhập
- `GET /auth/me` - Lấy thông tin user hiện tại

### Classes
- `POST /classes` - Tạo lớp (lecturer/admin)
- `GET /classes/:id` - Chi tiết lớp
- `POST /classes/:id/enroll` - Gán sinh viên vào lớp

### Sessions
- `POST /sessions` - Tạo buổi học (lecturer)
- `GET /sessions/:id` - Chi tiết buổi học
- `GET /sessions/:id/qr` - Lấy QR payload (lecturer)
- `GET /sessions/:id/otp` - Lấy OTP hiện tại (lecturer)

### Attendance
- `POST /attendance/checkin-qr` - Điểm danh bằng QR + GPS (student)
- `POST /attendance/checkin-otp` - Điểm danh bằng OTP + Ảnh (student)
- `GET /attendance/session/:id` - Danh sách điểm danh (lecturer)

## 🔒 Bảo mật

- JWT authentication với Bearer token
- Role-based access control (RBAC)
- QR token có TTL 60s và nonce chống replay
- TOTP với tolerance ±1 step
- GPS geofence validation
- Ảnh có watermark chống gian lận

## 📝 Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://app:app@db:5432/attendance
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

## 🐳 Docker Compose

Chạy toàn bộ hệ thống với Docker:

```bash
docker compose up -d
```

Services:
- `db`: PostgreSQL (port 5432)
- `backend`: NestJS API (port 8080)
- `frontend`: React app (port 3000)

## 📚 Scripts

### Backend
```bash
npm run start:dev      # Chạy dev mode
npm run prisma:generate # Generate Prisma client
npm run prisma:migrate  # Chạy migrations
npm run prisma:seed    # Seed data
```

### Frontend
```bash
npm run dev     # Chạy dev server
npm run build   # Build production
npm run preview # Preview production build
```

## 🐛 Troubleshooting

### Lỗi database connection
- Đảm bảo Docker container `db` đang chạy: `docker ps`
- Kiểm tra `DATABASE_URL` trong `.env`

### Lỗi camera không hoạt động
- Trên điện thoại, cần HTTPS (dùng tunnel)
- Cho phép quyền camera trong trình duyệt

### Lỗi GPS không hoạt động
- Cho phép quyền vị trí trong trình duyệt
- Hoặc sử dụng chế độ OTP + Ảnh

### Lỗi CORS
- Kiểm tra `FRONTEND_URL` trong backend `.env`
- Đảm bảo frontend URL khớp với URL thực tế

## 📄 License

MIT

## 👥 Tác giả

Senior Full-Stack Engineer

---

**Lưu ý**: Đây là phiên bản development. Để deploy production, cần:
- Đổi `JWT_SECRET` thành giá trị bảo mật
- Cấu hình HTTPS
- Sử dụng cloud storage cho ảnh (S3, R2, etc.)
- Setup monitoring và logging
- Cấu hình rate limiting

