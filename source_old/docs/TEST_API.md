# 🧪 Hướng dẫn Test API trên Production

## 🌐 Base URL
```
http://34.177.89.245:8080
```

## ✅ Health Check (Kiểm tra API hoạt động)

```bash
# Dùng curl
curl http://34.177.89.245:8080/health

# Hoặc mở trong trình duyệt
http://34.177.89.245:8080/health
```

**Response mong đợi:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-15T..."
}
```

## 🔐 Authentication Endpoints

### 1. Login (Đăng nhập)

**POST** `/auth/login`

```bash
curl -X POST http://34.177.89.245:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "lecturer",
    "password": "your_password"
  }'
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "lecturer",
    "role": "lecturer"
  }
}
```

### 2. Get Current User

**GET** `/auth/me`

```bash
curl http://34.177.89.245:8080/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 📚 Classes Endpoints

### 1. Get All Classes

**GET** `/classes`

```bash
curl http://34.177.89.245:8080/classes \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 2. Create Class

**POST** `/classes`

```bash
curl -X POST http://34.177.89.245:8080/classes \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Lớp học mới",
    "code": "CS101"
  }'
```

## 📅 Sessions Endpoints

### 1. Get All Sessions

**GET** `/sessions`

```bash
curl http://34.177.89.245:8080/sessions \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 2. Create Session

**POST** `/sessions`

```bash
curl -X POST http://34.177.89.245:8080/sessions \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "classId": 1,
    "name": "Buổi học 1",
    "startTime": "2025-11-15T10:00:00Z"
  }'
```

## ✅ Attendance Endpoints

### 1. Get Attendance

**GET** `/attendance?sessionId=1`

```bash
curl "http://34.177.89.245:8080/attendance?sessionId=1" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 2. Mark Attendance

**POST** `/attendance/mark`

```bash
curl -X POST http://34.177.89.245:8080/attendance/mark \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": 1,
    "studentId": 1,
    "status": "attended"
  }'
```

## 🧪 Test với Postman

1. Import collection từ file `QR_Attendance_API.postman_collection.json`
2. Cập nhật base URL thành: `http://34.177.89.245:8080`
3. Chạy request "Login" để lấy token
4. Token sẽ tự động được lưu vào collection variable
5. Test các endpoint khác

## 🌐 Test từ Frontend

Frontend đã được cấu hình để kết nối với backend tại:
- **Frontend URL**: `http://34.177.89.245`
- **Backend API**: `http://34.177.89.245:8080`

## ⚠️ Lưu ý

1. **Firewall**: Đảm bảo đã mở port 8080 trên Google Cloud Firewall
2. **CORS**: Backend đã được cấu hình để cho phép requests từ frontend
3. **Authentication**: Hầu hết endpoints cần JWT token (trừ `/auth/login` và `/health`)
4. **HTTPS**: Hiện tại đang dùng HTTP, nên cân nhắc cài SSL/HTTPS cho production

## 🔍 Debug

Nếu gặp lỗi, kiểm tra:

```bash
# Trên VPS
docker logs qr-attendance-backend --tail 50

# Kiểm tra health
curl http://34.177.89.245:8080/health

# Kiểm tra từ trong VPS
docker exec qr-attendance-backend curl http://localhost:8080/health
```

## 📖 Xem thêm

Xem file `API_DOCUMENTATION.md` để biết chi tiết đầy đủ về tất cả endpoints.

