# Hướng dẫn Import Postman Collection

## Cách Import Collection vào Postman

### Bước 1: Mở Postman
- Mở ứng dụng Postman (Desktop hoặc Web)

### Bước 2: Import Collection
1. Click vào nút **Import** ở góc trên bên trái
2. Chọn tab **File**
3. Chọn file `QR_Attendance_API.postman_collection.json`
4. Click **Import**

### Bước 3: Cấu hình Variables
Collection đã có sẵn các biến môi trường:
- `baseUrl`: `http://localhost:8080` (có thể thay đổi theo môi trường)
- `accessToken`: Tự động được lưu sau khi login thành công
- `userId`: Tự động được lưu sau khi login
- `userRole`: Tự động được lưu sau khi login

**Để thay đổi baseUrl:**
1. Click vào collection "QR Attendance API"
2. Chọn tab **Variables**
3. Sửa giá trị `baseUrl` nếu cần (ví dụ: `https://your-domain.com`)

## Cách sử dụng

### 1. Đăng nhập
1. Mở request **Authentication > Login**
2. Sửa body nếu cần:
   - `username`: "admin" | "lecturer" | MSSV (ví dụ: "523H0001")
   - `password`: "pass123"
3. Click **Send**
4. Token sẽ tự động được lưu vào collection variable `accessToken`

### 2. Sử dụng các API khác
- Tất cả các request khác đã tự động sử dụng `{{accessToken}}` trong header Authorization
- Chỉ cần điền các tham số cần thiết (như ID, body, etc.)

### 3. Test các API theo thứ tự
1. **Login** → Lấy token
2. **Get All Classes** → Xem danh sách lớp
3. **Create Class** → Tạo lớp mới (nếu cần)
4. **Create Session** → Tạo buổi học
5. **Get QR Token** → Lấy QR token để test check-in
6. **Check-in by QR Code** → Test check-in với QR
7. **Get Session Attendances** → Xem danh sách điểm danh

## Các Folder trong Collection

1. **Authentication**: Đăng nhập và lấy thông tin user
2. **Classes**: Quản lý lớp học
3. **Sessions**: Quản lý buổi học
4. **Attendance**: Quản lý điểm danh
5. **Static Files**: Truy cập file upload

## Lưu ý

- **Check-in by OTP and Photo**: Cần chọn file ảnh trong form-data
- **Check-in by QR Code**: Cần lấy QR token từ `GET /sessions/:id/qr` trước
- Một số API yêu cầu role cụ thể (STUDENT, LECTURER, ADMIN)
- Token có thời hạn 7 ngày, nếu hết hạn cần login lại

## Troubleshooting

### Lỗi 401 Unauthorized
- Kiểm tra token đã được lưu chưa (sau khi login)
- Thử login lại để lấy token mới

### Lỗi 403 Forbidden
- Kiểm tra role của user có đủ quyền không
- Một số API chỉ dành cho ADMIN hoặc LECTURER

### Lỗi CORS
- Đảm bảo backend đang chạy
- Kiểm tra CORS settings trong backend

