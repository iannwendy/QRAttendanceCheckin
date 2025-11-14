# Tài liệu API - Hệ thống QR Attendance

## Tổng quan
Hệ thống quản lý điểm danh sử dụng QR Code và OTP với xác thực GPS. Backend chạy trên NestJS với Prisma ORM.

**Base URL**: `http://localhost:8080` (hoặc theo cấu hình PORT)

---

## 1. Authentication Module (`/auth`)

### 1.1. Đăng nhập
- **URL**: `POST /auth/login`
- **Public**: Có (không cần JWT)
- **Mô tả**: Đăng nhập vào hệ thống bằng username/email và password
- **Input (Body)**:
  ```json
  {
    "username": "string (optional)",  // "admin" | "lecturer" | MSSV (ví dụ: "523H0001")
    "email": "string (optional)",      // Tương thích với phiên bản cũ
    "password": "string"                // Tối thiểu 6 ký tự (dev: "pass123")
  }
  ```
- **Output**:
  ```json
  {
    "accessToken": "string (JWT token)",
    "user": {
      "id": "string",
      "email": "string",
      "fullName": "string",
      "studentCode": "string | null",
      "role": "STUDENT | LECTURER | ADMIN"
    }
  }
  ```
- **Lỗi có thể xảy ra**:
  - `401 Unauthorized`: Sai mật khẩu hoặc tài khoản không tồn tại

---

### 1.2. Lấy thông tin người dùng hiện tại
- **URL**: `GET /auth/me`
- **Authentication**: JWT Required
- **Mô tả**: Lấy thông tin của người dùng đang đăng nhập
- **Input**: Không có (sử dụng JWT từ header `Authorization: Bearer <token>`)
- **Output**:
  ```json
  {
    "id": "string",
    "email": "string",
    "fullName": "string",
    "studentCode": "string | null",
    "role": "STUDENT | LECTURER | ADMIN"
  }
  ```

---

## 2. Attendance Module (`/attendance`)

### 2.1. Check-in bằng QR Code
- **URL**: `POST /attendance/checkin-qr`
- **Authentication**: JWT Required
- **Role**: STUDENT
- **Mô tả**: Sinh viên check-in bằng cách quét QR code, yêu cầu GPS trong phạm vi cho phép
- **Input (Body)**:
  ```json
  {
    "qrToken": "string",      // JWT token hoặc JSON string từ QR code
    "lat": "number",          // Vĩ độ GPS
    "lng": "number",          // Kinh độ GPS
    "accuracy": "number"      // Độ chính xác GPS (mét)
  }
  ```
- **Output**:
  ```json
  {
    "id": "string",
    "sessionId": "string",
    "studentId": "string",
    "method": "QR_GPS",
    "status": "APPROVED | TOO_FAR",
    "lat": "number",
    "lng": "number",
    "accuracy": "number",
    "otpUsed": null,
    "createdAt": "ISO 8601 datetime",
    "updatedAt": "ISO 8601 datetime"
  }
  ```
- **Lỗi có thể xảy ra**:
  - `400 Bad Request`: QR token không hợp lệ hoặc đã hết hạn, buổi học không tồn tại
  - `401 Unauthorized`: Chưa đăng ký lớp này

---

### 2.2. Check-in bằng OTP và ảnh
- **URL**: `POST /attendance/checkin-otp`
- **Authentication**: JWT Required
- **Role**: STUDENT
- **Mô tả**: Sinh viên check-in bằng OTP và upload ảnh làm bằng chứng (cần giáo viên duyệt)
- **Input (Form Data)**:
  - `file`: File ảnh (multipart/form-data, bắt buộc)
  - `sessionId`: string (ID buổi học hoặc publicCode)
  - `otp`: string (Mã OTP 6 số)
  - `meta`: JSON string
    ```json
    {
      "studentCode": "string",
      "timestamp": "string"
    }
    ```
- **Output**:
  ```json
  {
    "id": "string",
    "sessionId": "string",
    "studentId": "string",
    "method": "OTP_PHOTO",
    "status": "PENDING",
    "lat": null,
    "lng": null,
    "accuracy": null,
    "otpUsed": "string",
    "createdAt": "ISO 8601 datetime",
    "updatedAt": "ISO 8601 datetime"
  }
  ```
- **Lỗi có thể xảy ra**:
  - `400 Bad Request`: File ảnh là bắt buộc, OTP không đúng hoặc đã hết hạn, buổi học không tồn tại
  - `401 Unauthorized`: Chưa đăng ký lớp này

---

### 2.3. Lấy danh sách điểm danh của buổi học
- **URL**: `GET /attendance/session/:id`
- **Authentication**: JWT Required
- **Role**: LECTURER, ADMIN
- **Mô tả**: Lấy tất cả bản ghi điểm danh của một buổi học
- **Input (Path Parameter)**:
  - `id`: string (ID của buổi học)
- **Output**: Array of attendance records
  ```json
  [
    {
      "id": "string",
      "sessionId": "string",
      "studentId": "string",
      "method": "QR_GPS | OTP_PHOTO | AUTO_IMPORT",
      "status": "NOT_ATTENDED | PENDING | APPROVED | REJECTED | TOO_FAR",
      "lat": "number | null",
      "lng": "number | null",
      "accuracy": "number | null",
      "otpUsed": "string | null",
      "createdAt": "ISO 8601 datetime",
      "updatedAt": "ISO 8601 datetime",
      "student": {
        "id": "string",
        "email": "string",
        "fullName": "string",
        "studentCode": "string | null"
      },
      "evidence": {
        "id": "string",
        "attendanceId": "string",
        "photoUrl": "string",
        "metaJson": "string"
      } | null
    }
  ]
  ```
- **Lỗi có thể xảy ra**:
  - `400 Bad Request`: Buổi học không tồn tại

---

### 2.4. Duyệt điểm danh
- **URL**: `PATCH /attendance/:id/approve`
- **Authentication**: JWT Required
- **Role**: LECTURER, ADMIN
- **Mô tả**: Giáo viên/Admin duyệt điểm danh của sinh viên
- **Input (Path Parameter)**:
  - `id`: string (ID của bản ghi điểm danh)
- **Output**:
  ```json
  {
    "id": "string",
    "sessionId": "string",
    "studentId": "string",
    "method": "QR_GPS | OTP_PHOTO | AUTO_IMPORT",
    "status": "APPROVED",
    "lat": "number | null",
    "lng": "number | null",
    "accuracy": "number | null",
    "otpUsed": "string | null",
    "createdAt": "ISO 8601 datetime",
    "updatedAt": "ISO 8601 datetime",
    "student": {
      "id": "string",
      "email": "string",
      "fullName": "string",
      "studentCode": "string | null",
      "role": "STUDENT | LECTURER | ADMIN"
    },
    "evidence": {
      "id": "string",
      "attendanceId": "string",
      "photoUrl": "string",
      "metaJson": "string"
    } | null
  }
  ```

---

### 2.5. Từ chối điểm danh
- **URL**: `PATCH /attendance/:id/reject`
- **Authentication**: JWT Required
- **Role**: LECTURER, ADMIN
- **Mô tả**: Giáo viên/Admin từ chối điểm danh của sinh viên
- **Input (Path Parameter)**:
  - `id`: string (ID của bản ghi điểm danh)
- **Output**: Tương tự như approve, nhưng `status` là `"REJECTED"`

---

### 2.6. Báo cáo điểm danh theo lớp
- **URL**: `GET /attendance/report/class/:classId`
- **Authentication**: JWT Required
- **Role**: LECTURER, ADMIN
- **Mô tả**: Lấy báo cáo điểm danh chi tiết của một lớp học
- **Input (Path Parameter)**:
  - `classId`: string (ID của lớp học)
- **Output**:
  ```json
  {
    "class": {
      "id": "string",
      "code": "string",
      "name": "string"
    },
    "totalSessions": "number",
    "totalStudents": "number",
    "report": [
      {
        "studentId": "string",
        "studentCode": "string",
        "fullName": "string",
        "email": "string",
        "totalSessions": "number",
        "attendedSessions": "number",
        "attendanceRate": "number",  // Phần trăm (0-100)
        "sessionDetails": [
          {
            "sessionId": "string",
            "sessionTitle": "string",
            "sessionDate": "ISO 8601 datetime",
            "status": "NOT_ATTENDED | PENDING | APPROVED | REJECTED | TOO_FAR",
            "method": "QR_GPS | OTP_PHOTO | AUTO_IMPORT | null",
            "checkedInAt": "ISO 8601 datetime | null"
          }
        ]
      }
    ]
  }
  ```
- **Lỗi có thể xảy ra**:
  - `400 Bad Request`: Lớp học không tồn tại

---

### 2.7. Báo cáo điểm danh tất cả lớp
- **URL**: `GET /attendance/report/all`
- **Authentication**: JWT Required
- **Role**: ADMIN
- **Mô tả**: Lấy báo cáo điểm danh của tất cả các lớp học
- **Input**: Không có
- **Output**: Array of class reports
  ```json
  [
    {
      "class": {
        "id": "string",
        "code": "string",
        "name": "string"
      },
      "totalSessions": "number",
      "totalStudents": "number",
      "students": [
        {
          "studentId": "string",
          "studentCode": "string",
          "fullName": "string",
          "email": "string",
          "totalSessions": "number",
          "attendedSessions": "number",
          "attendanceRate": "number"
        }
      ]
    }
  ]
  ```

---

## 3. Sessions Module (`/sessions`)

### 3.1. Tạo buổi học mới
- **URL**: `POST /sessions`
- **Authentication**: JWT Required
- **Role**: LECTURER, ADMIN
- **Mô tả**: Tạo một buổi học mới với QR code và OTP
- **Input (Body)**:
  ```json
  {
    "classId": "string",
    "title": "string",
    "startTime": "ISO 8601 datetime string",
    "endTime": "ISO 8601 datetime string",
    "latitude": "number",
    "longitude": "number",
    "geofenceRadius": "number",  // Bán kính GPS (mét), tối thiểu 10
    "publicCode": "string"        // Mã công khai (tối đa 6 ký tự, chữ và số)
  }
  ```
- **Output**: Session object
  ```json
  {
    "id": "string",
    "classId": "string",
    "title": "string",
    "startTime": "ISO 8601 datetime",
    "endTime": "ISO 8601 datetime",
    "latitude": "number",
    "longitude": "number",
    "geofenceRadius": "number",
    "otpSecret": "string",
    "publicCode": "string",
    "createdAt": "ISO 8601 datetime"
  }
  ```
- **Lưu ý**: Khi tạo buổi học, hệ thống tự động:
  - Import 100 sinh viên (523H0001 - 523H0100) vào lớp nếu chưa có
  - Tạo bản ghi điểm danh NOT_ATTENDED cho tất cả sinh viên
- **Lỗi có thể xảy ra**:
  - `400 Bad Request`: Mã buổi là bắt buộc, mã buổi đã tồn tại

---

### 3.2. Cập nhật buổi học
- **URL**: `PATCH /sessions/:id`
- **Authentication**: JWT Required
- **Role**: LECTURER, ADMIN
- **Mô tả**: Cập nhật thông tin buổi học
- **Input (Path Parameter)**:
  - `id`: string (ID của buổi học)
- **Input (Body)** - Tất cả các trường đều optional:
  ```json
  {
    "classId": "string (optional)",
    "title": "string (optional)",
    "startTime": "ISO 8601 datetime string (optional)",
    "endTime": "ISO 8601 datetime string (optional)",
    "latitude": "number (optional)",
    "longitude": "number (optional)",
    "geofenceRadius": "number (optional)",
    "publicCode": "string (optional)"  // Tối đa 6 ký tự, chữ và số
  }
  ```
- **Output**: Session object đã được cập nhật
- **Lỗi có thể xảy ra**:
  - `404 Not Found`: Buổi học không tồn tại
  - `400 Bad Request`: Mã buổi không được để trống, mã buổi đã tồn tại

---

### 3.3. Lấy thông tin buổi học theo ID
- **URL**: `GET /sessions/:id`
- **Authentication**: JWT Required
- **Mô tả**: Lấy thông tin chi tiết của một buổi học
- **Input (Path Parameter)**:
  - `id`: string (ID của buổi học)
- **Output**:
  ```json
  {
    "id": "string",
    "classId": "string",
    "title": "string",
    "startTime": "ISO 8601 datetime",
    "endTime": "ISO 8601 datetime",
    "latitude": "number",
    "longitude": "number",
    "geofenceRadius": "number",
    "otpSecret": "string",
    "publicCode": "string",
    "createdAt": "ISO 8601 datetime",
    "class": {
      "id": "string",
      "code": "string",
      "name": "string",
      "createdAt": "ISO 8601 datetime"
    },
    "attendances": [
      {
        "id": "string",
        "sessionId": "string",
        "studentId": "string",
        "method": "QR_GPS | OTP_PHOTO | AUTO_IMPORT",
        "status": "NOT_ATTENDED | PENDING | APPROVED | REJECTED | TOO_FAR",
        "lat": "number | null",
        "lng": "number | null",
        "accuracy": "number | null",
        "otpUsed": "string | null",
        "createdAt": "ISO 8601 datetime",
        "updatedAt": "ISO 8601 datetime",
        "student": {
          "id": "string",
          "email": "string",
          "fullName": "string",
          "studentCode": "string | null"
        },
        "evidence": {
          "id": "string",
          "attendanceId": "string",
          "photoUrl": "string",
          "metaJson": "string"
        } | null
      }
    ]
  }
  ```
- **Lỗi có thể xảy ra**:
  - `404 Not Found`: Buổi học không tồn tại

---

### 3.4. Lấy thông tin buổi học theo mã công khai
- **URL**: `GET /sessions/code/:code`
- **Authentication**: JWT Required
- **Mô tả**: Lấy thông tin buổi học bằng mã công khai (publicCode)
- **Input (Path Parameter)**:
  - `code`: string (Mã công khai của buổi học)
- **Output**: Tương tự như `GET /sessions/:id`
- **Lỗi có thể xảy ra**:
  - `404 Not Found`: Buổi học không tồn tại

---

### 3.5. Lấy QR Token cho buổi học
- **URL**: `GET /sessions/:id/qr`
- **Authentication**: JWT Required
- **Role**: LECTURER, ADMIN
- **Mô tả**: Lấy QR token (JWT) để tạo QR code cho buổi học
- **Input (Path Parameter)**:
  - `id`: string (ID của buổi học)
- **Output**:
  ```json
  {
    "token": "string (JWT token)",
    "payload": {
      "sessionId": "string",
      "classCode": "string",
      "className": "string",
      "nonce": "string",
      "exp": "number (Unix timestamp)"
    },
    "deepLink": "string | null"  // URL để mở trực tiếp trang check-in
  }
  ```
- **Lỗi có thể xảy ra**:
  - `404 Not Found`: Buổi học không tồn tại

---

### 3.6. Lấy mã OTP hiện tại
- **URL**: `GET /sessions/:id/otp`
- **Authentication**: JWT Required
- **Role**: LECTURER, ADMIN
- **Mô tả**: Lấy mã OTP hiện tại (TOTP) cho buổi học
- **Input (Path Parameter)**:
  - `id`: string (ID của buổi học)
- **Output**:
  ```json
  {
    "otp": "string (6 chữ số)"
  }
  ```
- **Lỗi có thể xảy ra**:
  - `404 Not Found`: Buổi học không tồn tại
- **Lưu ý**: OTP thay đổi theo chu kỳ (mặc định 30-60 giây tùy cấu hình)

---

### 3.7. Xóa buổi học theo ID
- **URL**: `DELETE /sessions/:id`
- **Authentication**: JWT Required
- **Role**: LECTURER, ADMIN
- **Mô tả**: Xóa một buổi học
- **Input (Path Parameter)**:
  - `id`: string (ID của buổi học)
- **Output**:
  ```json
  {
    "success": true
  }
  ```
- **Lỗi có thể xảy ra**:
  - `404 Not Found`: Buổi học không tồn tại

---

### 3.8. Xóa buổi học theo mã công khai
- **URL**: `DELETE /sessions/code/:code`
- **Authentication**: JWT Required
- **Role**: LECTURER, ADMIN
- **Mô tả**: Xóa một buổi học bằng mã công khai
- **Input (Path Parameter)**:
  - `code`: string (Mã công khai của buổi học)
- **Output**:
  ```json
  {
    "success": true
  }
  ```
- **Lỗi có thể xảy ra**:
  - `404 Not Found`: Buổi học không tồn tại

---

## 4. Classes Module (`/classes`)

### 4.1. Lấy danh sách tất cả lớp học
- **URL**: `GET /classes`
- **Authentication**: JWT Required
- **Role**: LECTURER, ADMIN
- **Mô tả**: Lấy danh sách tất cả các lớp học
- **Input**: Không có
- **Output**: Array of classes
  ```json
  [
    {
      "id": "string",
      "code": "string",
      "name": "string",
      "createdAt": "ISO 8601 datetime",
      "sessions": [
        {
          "id": "string",
          "publicCode": "string",
          "title": "string",
          "startTime": "ISO 8601 datetime",
          "endTime": "ISO 8601 datetime"
        }
      ],
      "_count": {
        "students": "number"
      }
    }
  ]
  ```

---

### 4.2. Tạo lớp học mới
- **URL**: `POST /classes`
- **Authentication**: JWT Required
- **Role**: LECTURER, ADMIN
- **Mô tả**: Tạo một lớp học mới
- **Input (Body)**:
  ```json
  {
    "code": "string",  // Mã lớp (unique)
    "name": "string"   // Tên lớp
  }
  ```
- **Output**:
  ```json
  {
    "id": "string",
    "code": "string",
    "name": "string",
    "createdAt": "ISO 8601 datetime"
  }
  ```

---

### 4.3. Lấy thông tin lớp học theo ID
- **URL**: `GET /classes/:id`
- **Authentication**: JWT Required
- **Mô tả**: Lấy thông tin chi tiết của một lớp học
- **Input (Path Parameter)**:
  - `id`: string (ID của lớp học)
- **Output**:
  ```json
  {
    "id": "string",
    "code": "string",
    "name": "string",
    "createdAt": "ISO 8601 datetime",
    "students": [
      {
        "id": "string",
        "classId": "string",
        "studentId": "string",
        "student": {
          "id": "string",
          "email": "string",
          "fullName": "string",
          "studentCode": "string | null"
        }
      }
    ],
    "sessions": [
      {
        "id": "string",
        "classId": "string",
        "title": "string",
        "startTime": "ISO 8601 datetime",
        "endTime": "ISO 8601 datetime",
        "latitude": "number",
        "longitude": "number",
        "geofenceRadius": "number",
        "otpSecret": "string",
        "publicCode": "string",
        "createdAt": "ISO 8601 datetime"
      }
    ]
  }
  ```
- **Lỗi có thể xảy ra**:
  - `404 Not Found`: Lớp không tồn tại

---

### 4.4. Đăng ký sinh viên vào lớp
- **URL**: `POST /classes/:id/enroll`
- **Authentication**: JWT Required
- **Role**: LECTURER, ADMIN
- **Mô tả**: Đăng ký sinh viên vào lớp học bằng mã sinh viên hoặc user ID
- **Input (Path Parameter)**:
  - `id`: string (ID của lớp học)
- **Input (Body)**:
  ```json
  {
    "studentCodes": ["string"] (optional),  // Array of student codes (MSSV)
    "userIds": ["string"] (optional)        // Array of user IDs
  }
  ```
- **Output**: Array of enrollment records
  ```json
  [
    {
      "id": "string",
      "classId": "string",
      "studentId": "string"
    }
  ]
  ```
- **Lỗi có thể xảy ra**:
  - `404 Not Found`: Lớp không tồn tại
  - `400 Bad Request`: Sinh viên với MSSV không tồn tại
- **Lưu ý**: Nếu sinh viên đã đăng ký, sẽ bỏ qua (không tạo duplicate)

---

## 5. Static Files

### 5.1. Truy cập file upload
- **URL**: `GET /uploads/:filename`
- **Public**: Có (không cần JWT)
- **Mô tả**: Truy cập các file ảnh đã upload (bằng chứng điểm danh)
- **Input (Path Parameter)**:
  - `filename`: string (Tên file, ví dụ: `7d5aac68a5aa1e1feafcffa7ecda561a.jpg`)
- **Output**: File ảnh (image/jpeg, image/png, etc.)

