# 🚀 Hướng dẫn khởi động nhanh

## ✅ Đã cài đặt xong

- ✅ Backend dependencies (npm install)
- ✅ Frontend dependencies (npm install)
- ✅ Prisma Client (đã generate)
- ✅ Environment files (.env)
- ✅ Uploads directory

## 📋 Các bước tiếp theo (theo thứ tự)

### Bước 1: Khởi động Docker Database

```bash
# Mở Docker Desktop, sau đó:
docker compose up -d db

# Đợi vài giây để database khởi động
sleep 5
```

### Bước 2: Chạy Migrations và Seed

```bash
cd backend

# Chạy migrations (tạo database schema)
npx prisma migrate dev --name init

# Seed data (tạo 100 sinh viên, admin, lecturer)
npx prisma db seed
```

### Bước 3: Khởi động Backend

```bash
# Trong thư mục backend
npm run start:dev
```

Backend sẽ chạy tại: **http://localhost:8080**

### Bước 4: Khởi động Frontend (Terminal mới)

```bash
cd frontend
npm run dev
```

Frontend sẽ chạy tại: **http://localhost:3000**

## 🎯 Test hệ thống

1. Mở trình duyệt: http://localhost:3000
2. Đăng nhập với:
   - **Admin**: `admin@test.com` / `admin123`
   - **Lecturer**: `lecturer@test.com` / `lecturer123`
   - **Student**: `student523H0001@test.com` / `pass123`

## 📱 Test trên điện thoại (Tùy chọn)

Để test trên điện thoại, cần tunnel HTTPS:

```bash
# Terminal 1 - Frontend tunnel
cloudflared tunnel --url http://localhost:3000

# Terminal 2 - Backend tunnel  
cloudflared tunnel --url http://localhost:8080
```

Cập nhật `frontend/.env`:
```
VITE_API_BASE=<tunnel-url-backend>
```

## 🔧 Troubleshooting

### Lỗi "Cannot connect to Docker daemon"
- Mở Docker Desktop và đợi nó khởi động hoàn toàn

### Lỗi "Database connection failed"
- Kiểm tra Docker container đang chạy: `docker ps`
- Kiểm tra DATABASE_URL trong `backend/.env`

### Lỗi Prisma "schema not found"
- Chạy: `npx prisma generate` trong thư mục backend

### Lỗi "Port already in use"
- Đổi port trong .env hoặc dừng process đang dùng port đó

