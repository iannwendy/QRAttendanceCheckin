# 📝 Hướng dẫn Sửa file .env.production

## Các giá trị BẮT BUỘC phải thay đổi:

### 1. POSTGRES_PASSWORD
**Dòng:** `POSTGRES_PASSWORD=change_me_secure_password_here`

**Thay bằng:** Mật khẩu mạnh cho database (ít nhất 16 ký tự)
```env
POSTGRES_PASSWORD=MySecurePassword123!@#
```

**Ví dụ mật khẩu mạnh:**
- `AttendanceDB2024!Secure`
- `QR@Checkin#2024$Strong`
- `MyApp123!@#SecurePass`

### 2. JWT_SECRET
**Dòng:** `JWT_SECRET=change_me_jwt_secret_here_min_32_chars`

**Thay bằng:** Secret key mạnh (ít nhất 32 ký tự)
```env
JWT_SECRET=my_super_secret_jwt_key_2024_very_long_and_secure_min_32_chars
```

**Cách tạo JWT_SECRET nhanh:**
```bash
# Trên VPS, chạy lệnh này để tạo secret ngẫu nhiên:
openssl rand -base64 32
```

### 3. FRONTEND_URL
**Dòng:** `FRONTEND_URL=http://your-domain.com`

**Thay bằng:** URL công khai của frontend

**Nếu dùng IP:**
```env
FRONTEND_URL=http://YOUR_VPS_IP
```

**Nếu có domain:**
```env
FRONTEND_URL=http://your-domain.com
```

**Cách lấy IP của VPS:**
```bash
curl ifconfig.me
```

### 4. VITE_API_BASE
**Dòng:** `VITE_API_BASE=http://your-domain.com:8080`

**Thay bằng:** URL công khai của backend API

**Nếu dùng IP:**
```env
VITE_API_BASE=http://YOUR_VPS_IP:8080
```

**Nếu có domain:**
```env
VITE_API_BASE=http://your-domain.com:8080
# hoặc nếu backend ở subdomain:
VITE_API_BASE=http://api.your-domain.com
```

## Các giá trị có thể giữ nguyên (hoặc tùy chỉnh):

- `POSTGRES_USER=app` - Có thể giữ nguyên
- `POSTGRES_DB=attendance` - Có thể giữ nguyên
- `BACKEND_PORT=8080` - Có thể giữ nguyên
- `FRONTEND_PORT=80` - Có thể giữ nguyên
- `QR_ROTATE_SECONDS=180` - Tùy chỉnh nếu cần
- `OTP_STEP_SECONDS=60` - Tùy chỉnh nếu cần
- `GEOFENCE_RADIUS_M_DEFAULT=100` - Tùy chỉnh nếu cần

## Cách sửa trong nano:

1. **Di chuyển:** Dùng phím mũi tên để di chuyển đến dòng cần sửa
2. **Xóa:** Xóa phần placeholder (ví dụ: `change_me_secure_password_here`)
3. **Gõ:** Gõ giá trị mới
4. **Lưu:** `Ctrl+O` (chữ O, không phải số 0)
5. **Xác nhận:** Nhấn Enter
6. **Thoát:** `Ctrl+X`

## Ví dụ file .env.production hoàn chỉnh:

```env
# Database Configuration
POSTGRES_USER=app
POSTGRES_PASSWORD=AttendanceDB2024!Secure
POSTGRES_DB=attendance

# Backend Configuration
BACKEND_PORT=8080
JWT_SECRET=my_super_secret_jwt_key_2024_very_long_and_secure_min_32_chars
FRONTEND_URL=http://34.123.45.67
QR_ROTATE_SECONDS=180
OTP_STEP_SECONDS=60
GEOFENCE_RADIUS_M_DEFAULT=100

# Frontend Configuration
FRONTEND_PORT=80
VITE_API_BASE=http://34.123.45.67:8080
```

**Lưu ý:** Thay `34.123.45.67` bằng IP thực tế của VPS bạn!

