# Giải Thích Về Encode/Decode Trong Hệ Thống

Hệ thống QR Attendance sử dụng **3 loại encode/decode chính**:

---

## 1. JWT (JSON Web Token) Encoding/Decoding

### Mục đích:
- **Authentication JWT**: Xác thực người dùng khi đăng nhập
- **QR Token JWT**: Tạo token chứa thông tin buổi học để nhúng vào QR code

### Vị trí trong code:

#### **1.1. Encode JWT (Tạo token)**

**a) Authentication JWT** - `backend/src/auth/auth.service.ts`:
```typescript
// Dòng 41: Tạo JWT token khi đăng nhập
accessToken: this.jwtService.sign(payload)
```
- **Payload**: `{ sub: userId, email, role }`
- **Mục đích**: Token để xác thực các request API sau khi login

**b) QR Token JWT** - `backend/src/common/utils/qr-token.util.ts`:
```typescript
// Dòng 68-72: Tạo JWT token cho QR code
signQRToken(payload: QRTokenPayload): string {
  return this.jwtService.sign(payload, {
    secret: this.configService.get('JWT_SECRET') || 'dev_change_me',
  });
}
```
- **Payload**: `{ sessionId, nonce, iat, exp, type, ver, publicCode, className, classCode, sessionTitle }`
- **Mục đích**: Token chứa thông tin buổi học để sinh viên quét QR và điểm danh

#### **1.2. Decode JWT (Giải mã token)**

**a) Verify QR Token** - `backend/src/common/utils/qr-token.util.ts`:
```typescript
// Dòng 74-95: Verify và decode JWT token từ QR code
verifyQRToken(token: string): QRTokenPayload | null {
  try {
    // Cách 1: Verify với chữ ký (an toàn nhất)
    const payload = this.jwtService.verify<QRTokenPayload>(token, {
      secret,
      clockTolerance: 5,
    });
    return payload;
  } catch (e) {
    // Cách 2: Fallback - decode không verify chữ ký (chỉ dùng cho demo)
    const decoded = this.jwtService.decode(token) as QRTokenPayload | null;
    return decoded;
  }
}
```

**b) Decode JWT trong Attendance Service** - `backend/src/attendance/attendance.service.ts`:
```typescript
// Dòng 64-87: Decode JWT payload thủ công bằng Base64 (fallback)
const parts = checkInDto.qrToken.split('.');
if (parts.length === 3) {
  const json = Buffer.from(
    parts[1].replace(/-/g, '+').replace(/_/g, '/'),
    'base64',
  ).toString('utf8');
  const decoded = JSON.parse(json);
  // Kiểm tra exp và sessionId
}
```
- **Giải thích**: JWT có 3 phần `header.payload.signature`, phần payload được encode Base64URL
- **Mục đích**: Fallback khi verify JWT thất bại (chỉ dùng cho demo/testing)

**c) Decode JWT trong Frontend** - `frontend/src/pages/StudentAutoCheckin.tsx`:
```typescript
// Dòng 43-60: Extract thông tin từ JWT token trong URL
const extractInfo = (t: string) => {
  try {
    const parts = t.split('.');
    if (parts.length === 3) {
      // Decode Base64URL của payload
      const payload = JSON.parse(
        atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
      );
      return parsePayload(payload);
    }
  } catch (_) {}
  // Fallback: thử parse như JSON thường
  try {
    const obj = JSON.parse(t);
    return parsePayload(obj);
  } catch (_) {}
  return null;
};
```
- **Giải thích**: 
  - `atob()`: JavaScript function để decode Base64
  - `.replace(/-/g, '+').replace(/_/g, '/')`: Chuyển Base64URL về Base64 chuẩn
  - JWT dùng Base64URL (dùng `-` và `_` thay vì `+` và `/`)

---

## 2. Base64 Encoding/Decoding

### Mục đích:
- Decode payload của JWT (vì JWT payload được encode Base64URL)
- Encode ảnh thành Base64 để hiển thị/preview

### Vị trí trong code:

#### **2.1. Base64 Decode cho JWT Payload**

**Backend** - `backend/src/attendance/attendance.service.ts` (dòng 69-72):
```typescript
const json = Buffer.from(
  parts[1].replace(/-/g, '+').replace(/_/g, '/'),
  'base64',
).toString('utf8');
```
- `Buffer.from(..., 'base64')`: Node.js decode Base64
- Chuyển Base64URL về Base64 chuẩn trước khi decode

**Frontend** - `frontend/src/pages/StudentAutoCheckin.tsx` (dòng 48):
```typescript
atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
```
- `atob()`: Browser API để decode Base64 string

#### **2.2. Base64 Encode cho Ảnh**

**Frontend** - `frontend/src/pages/StudentOTPPage.tsx`:
```typescript
// Dòng 111: Encode canvas thành Base64 data URL
const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
setPhoto(dataUrl); // dataUrl có dạng: "data:image/jpeg;base64,/9j/4AAQ..."

// Dòng 132-133: Convert Base64 data URL thành Blob để upload
const response = await fetch(photo); // photo là Base64 data URL
const blob = await response.blob();
```
- **Mục đích**: 
  - Preview ảnh đã chụp trước khi upload
  - Convert Base64 data URL thành Blob để gửi lên server qua FormData

---

## 3. URL Encoding (encodeURIComponent)

### Mục đích:
- Encode token/parameters trong URL để tránh ký tự đặc biệt làm hỏng URL
- Đảm bảo token JWT (có thể chứa `+`, `/`, `=`) được truyền an toàn trong URL

### Vị trí trong code:

#### **3.1. Backend - Tạo URL với token**

**`backend/src/sessions/sessions.controller.ts`** (dòng 60):
```typescript
const deepLink = base
  ? `${base}/checkin?token=${encodeURIComponent(token)}`
  : null;
```

#### **3.2. Frontend - Sử dụng token từ URL**

**`frontend/src/pages/SessionDisplayPage.tsx`** (dòng 99):
```typescript
setQrToken(`${base}/checkin?token=${encodeURIComponent(token)}`);
```

**`frontend/src/pages/TeacherSessionPage.tsx`** (dòng 121):
```typescript
setQrToken(`${base}/checkin?token=${encodeURIComponent(token)}`);
```

**`frontend/src/pages/StudentAutoCheckin.tsx`** (dòng 137, 147):
```typescript
navigate(`/student/otp?code=${encodeURIComponent(publicCode)}`);
```

**`frontend/src/pages/LoginPage.tsx`** (dòng 24):
```typescript
navigate(`/checkin?token=${encodeURIComponent(pending)}`);
```

### Giải thích:
- **`encodeURIComponent()`**: JavaScript function encode các ký tự đặc biệt trong URL
- **Ví dụ**: 
  - Token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXNzaW9uSWQiOiIxMjMifQ==`
  - Sau encode: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXNzaW9uSWQiOiIxMjMifQ%3D%3D`
  - `=` được encode thành `%3D`

---

## 4. Tóm Tắt Luồng Encode/Decode

### Luồng QR Code Check-in:

1. **Giảng viên tạo QR code**:
   ```
   Backend: Tạo payload → JWT.sign() → JWT token (Base64URL encoded)
   Frontend: encodeURIComponent(token) → URL: /checkin?token=...
   QR Code: Chứa URL đầy đủ
   ```

2. **Sinh viên quét QR code**:
   ```
   QR Scanner: Đọc URL → Extract token từ query param
   Frontend: decodeURIComponent(token) → JWT token
   Frontend: atob() decode Base64URL payload → JSON payload
   Frontend: Extract sessionId, publicCode, etc.
   ```

3. **Sinh viên gửi check-in**:
   ```
   Frontend: Gửi JWT token (chưa decode) lên backend
   Backend: JWT.verify() hoặc decode thủ công → Payload
   Backend: Validate sessionId, exp, nonce
   Backend: Tạo attendance record
   ```

### Luồng OTP Check-in với Ảnh:

1. **Chụp ảnh**:
   ```
   Canvas: Vẽ ảnh + watermark
   Canvas.toDataURL(): Encode thành Base64 data URL
   Preview: Hiển thị ảnh từ Base64
   ```

2. **Upload ảnh**:
   ```
   fetch(photo): Convert Base64 data URL → Blob
   FormData: Append Blob vào form
   Backend: Nhận file binary (không cần decode Base64)
   ```

---

## 5. Lưu Ý Bảo Mật

### ✅ An toàn:
- JWT được sign với `JWT_SECRET` (verify chữ ký)
- Token có `exp` (expiration time) ngắn (60-180 giây)
- Nonce để chống replay attack
- URL encoding để tránh injection

### ⚠️ Cần cải thiện:
- **Fallback decode không verify** (dòng 64-87 trong `attendance.service.ts`): 
  - Chỉ nên dùng cho demo/testing
  - Production nên bỏ hoặc chỉ dùng khi thực sự cần thiết
  - Có thể bị tấn công nếu attacker tạo JWT giả với payload hợp lệ

---

## 6. Các File Liên Quan

### Backend:
- `backend/src/auth/auth.service.ts` - JWT encoding cho authentication
- `backend/src/common/utils/qr-token.util.ts` - JWT encoding/decoding cho QR token
- `backend/src/attendance/attendance.service.ts` - Decode JWT khi check-in
- `backend/src/sessions/sessions.controller.ts` - URL encoding token

### Frontend:
- `frontend/src/pages/StudentAutoCheckin.tsx` - Decode JWT từ URL
- `frontend/src/pages/StudentOTPPage.tsx` - Base64 encode ảnh
- `frontend/src/pages/SessionDisplayPage.tsx` - URL encoding
- `frontend/src/pages/TeacherSessionPage.tsx` - URL encoding
- `frontend/src/pages/LoginPage.tsx` - URL encoding

### Scripts:
- `scripts/generate_database_url.sh` - URL encode password trong DATABASE_URL
- `scripts/fix_database_url.sh` - URL encode password
- `scripts/helper_env.sh` - Base64 encode để tạo random secrets

