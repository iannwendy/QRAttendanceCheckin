# Câu Hỏi Bảo Vệ Đồ Án - Môn SOA

## PHẦN 1: DATABASE VÀ ERD

### Câu 1: Hãy giải thích cấu trúc database của dự án. Tại sao bạn chọn mối quan hệ nhiều-nhiều giữa User và Class thông qua bảng Enrollment?

**Vị trí code:**
- Schema: `backend/prisma/schema.prisma` (dòng 10-48)
- ERD: `docs/erd-relationships.md`

**Trả lời:**
- Một sinh viên có thể đăng ký nhiều lớp học (User → nhiều Enrollment)
- Một lớp học có nhiều sinh viên (Class → nhiều Enrollment)
- Bảng trung gian `Enrollment` lưu cặp `(classId, studentId)` với constraint unique để tránh trùng lặp
- Cascade delete: xóa User hoặc Class sẽ tự động xóa các Enrollment liên quan

**Code tham khảo:**
```prisma
model Enrollment {
  id        String @id @default(cuid())
  classId   String
  studentId String

  class   Class @relation(fields: [classId], references: [id], onDelete: Cascade)
  student User  @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@unique([classId, studentId])
}
```

---

### Câu 2: Tại sao bạn thiết kế mối quan hệ một-một (tùy chọn) giữa Attendance và Evidence? Có thể có nhiều ảnh bằng chứng cho một lần điểm danh không?

**Vị trí code:**
- Schema: `backend/prisma/schema.prisma` (dòng 69-98)

**Trả lời:**
- Mỗi Attendance chỉ có tối đa 1 Evidence (một-một tùy chọn)
- Evidence chỉ tồn tại khi điểm danh bằng OTP_PHOTO (cần ảnh)
- Điểm danh bằng QR_GPS không cần ảnh nên không có Evidence
- Thiết kế này đảm bảo tính nhất quán: mỗi lần điểm danh chỉ cần 1 ảnh xác thực

**Code tham khảo:**
```prisma
model Attendance {
  // ...
  evidence    Evidence?
}

model Evidence {
  id          String   @id @default(cuid())
  attendanceId String  @unique  // ← Ràng buộc unique đảm bảo 1-1
  photoUrl    String
  metaJson    String
  attendance  Attendance @relation(fields: [attendanceId], references: [id], onDelete: Cascade)
}
```

---

### Câu 3: Giải thích các enum AttendanceMethod và AttendanceStatus. Khi nào một attendance có status là TOO_FAR?

**Vị trí code:**
- Schema: `backend/prisma/schema.prisma` (dòng 106-118)
- Logic xử lý: `backend/src/attendance/attendance.service.ts` (dòng 135-164)

**Trả lời:**
- **AttendanceMethod**: QR_GPS (quét QR + GPS), OTP_PHOTO (OTP + ảnh), AUTO_IMPORT (tự động tạo khi tạo session)
- **AttendanceStatus**: NOT_ATTENDED, PENDING (chờ duyệt), APPROVED, REJECTED, TOO_FAR (quá xa vị trí)
- TOO_FAR xảy ra khi sinh viên quét QR nhưng GPS nằm ngoài `geofenceRadius` của session

**Code tham khảo:**
```typescript
// backend/src/attendance/attendance.service.ts:119-164
const distance = haversineDistance(
  checkInDto.lat,
  checkInDto.lng,
  session.latitude,
  session.longitude,
);

if (distance > session.geofenceRadius) {
  // Tạo hoặc cập nhật record với status TOO_FAR
  return this.prisma.attendance.update({
    where: { id: existing.id },
    data: {
      method: AttendanceMethod.QR_GPS,
      status: 'TOO_FAR' as unknown as AttendanceStatus,
      lat: checkInDto.lat,
      lng: checkInDto.lng,
      accuracy: checkInDto.accuracy,
    },
  });
}
```

---

### Câu 4: Tại sao Session có cả `id` (CUID) và `publicCode` (string ngắn)? Mục đích của mỗi loại là gì?

**Vị trí code:**
- Schema: `backend/prisma/schema.prisma` (dòng 50-67)
- Logic sử dụng: `backend/src/sessions/sessions.service.ts` (dòng 149-176, 220-232)

**Trả lời:**
- `id`: CUID dài, dùng cho API nội bộ, đảm bảo unique tuyệt đối
- `publicCode`: Mã ngắn (tối đa 6 ký tự), dễ nhớ, dùng cho sinh viên nhập khi điểm danh OTP
- `publicCode` có unique constraint và được normalize (uppercase) để tránh nhầm lẫn

**Code tham khảo:**
```typescript
// Tìm session theo publicCode hoặc id
if (!session) {
  session = await this.prisma.session.findFirst({
    where: { publicCode: identifier.toUpperCase() } as any,
    // ...
  });
}
```

---

## PHẦN 2: OTP (ONE-TIME PASSWORD)

### Câu 5: Bạn sử dụng thuật toán OTP nào? TOTP hay HOTP? Giải thích cách OTP được generate và verify.

**Vị trí code:**
- Generate OTP: `backend/src/sessions/sessions.service.ts` (dòng 24-25, 280-295)
- Verify OTP: `backend/src/attendance/attendance.service.ts` (dòng 243-251)
- Package: `otplib` (TOTP - Time-based OTP)

**Trả lời:**
- Sử dụng **TOTP (Time-based OTP)** từ thư viện `otplib`
- Mỗi session có một `otpSecret` duy nhất được generate khi tạo session
- OTP rotate mỗi 30 giây (configurable qua `OTP_STEP_SECONDS`)
- Verify với window [1, 1] để chấp nhận OTP hiện tại và trước/sau 1 step

**Code tham khảo:**
```typescript
// Generate secret khi tạo session
// backend/src/sessions/sessions.service.ts:24-25
const otpSecret = authenticator.generateSecret();

// Generate OTP từ secret
// backend/src/sessions/sessions.service.ts:289-292
const stepSeconds = parseInt(this.configService.get('OTP_STEP_SECONDS') || '60') || 60;
authenticator.options = { step: stepSeconds };
const token = authenticator.generate(session.otpSecret);

// Verify OTP
// backend/src/attendance/attendance.service.ts:244-251
const stepSeconds = parseInt(this.configService.get('OTP_STEP_SECONDS') || '30') || 30;
authenticator.options = { step: stepSeconds, window: [1, 1] };
const isValid = authenticator.check(checkInDto.otp, session.otpSecret);
if (!isValid) {
  throw new BadRequestException('OTP không đúng hoặc đã hết hạn');
}
```

---

### Câu 6: Tại sao OTP được lưu trong `Attendance.otpUsed`? Có thể reuse OTP đã dùng không?

**Vị trí code:**
- Schema: `backend/prisma/schema.prisma` (dòng 78)
- Logic lưu: `backend/src/attendance/attendance.service.ts` (dòng 276, 286)

**Trả lời:**
- `otpUsed` lưu OTP đã sử dụng để audit trail (kiểm tra sau)
- TOTP tự động expire sau mỗi time step (30s), nên không cần check reuse trong code
- Nếu cần chống reuse, có thể thêm unique constraint hoặc check trong database

**Code tham khảo:**
```typescript
// Lưu OTP đã dùng
attendance = await this.prisma.attendance.create({
  data: {
    sessionId: session.id,
    studentId,
    method: AttendanceMethod.OTP_PHOTO,
    status: AttendanceStatus.PENDING,
    otpUsed: checkInDto.otp,  // ← Lưu để audit
  },
});
```

---

### Câu 7: OTP được hiển thị ở đâu? Frontend có tự động refresh OTP không?

**Vị trí code:**
- API endpoint: `backend/src/sessions/sessions.controller.ts` (dòng 65-70)
- Frontend: Tìm trong `frontend/src/pages/` (LecturerSessionPage hoặc tương tự)

**Trả lời:**
- API: `GET /sessions/:id/otp` trả về OTP hiện tại
- Frontend (giảng viên) gọi API này định kỳ để hiển thị OTP trên màn hình lớp
- OTP tự động rotate theo time step (30s), frontend cần refresh để lấy OTP mới

**Code tham khảo:**
```typescript
// backend/src/sessions/sessions.controller.ts:65-70
@Get(':id/otp')
async getOTP(@Param('id') id: string) {
  const otp = await this.sessionsService.getOTP(id);
  return { otp };
}
```

---

## PHẦN 3: UPLOAD ẢNH ĐIỂM DANH

### Câu 8: Ảnh được upload như thế nào? Sử dụng middleware nào để xử lý file upload?

**Vị trí code:**
- Controller: `backend/src/attendance/attendance.controller.ts` (dòng 36-48)
- Multer config: `backend/src/common/config/multer.config.ts` (nếu có)
- Service: `backend/src/evidence/evidence.service.ts`
- Frontend: `frontend/src/pages/StudentOTPPage.tsx` (dòng 121-174)

**Trả lời:**
- Sử dụng `@nestjs/platform-express` với `FileInterceptor` và Multer
- File được lưu vào thư mục `uploads/` trên server
- Frontend gửi FormData với file blob (đã resize nếu > 1200px)
- Backend lưu file và trả về URL `/uploads/{filename}`

**Code tham khảo:**
```typescript
// Controller
@Post('checkin-otp')
@UseInterceptors(FileInterceptor('file', multerOptions))
async checkInOTP(
  @CurrentUser() user: any,
  @Body() checkInDto: CheckInOTPDto,
  @UploadedFile() file?: Express.Multer.File,
) {
  // ...
}

// Service upload
// backend/src/evidence/evidence.service.ts:8-13
async uploadPhoto(file: Express.Multer.File): Promise<string> {
  const filename = file.filename;
  return `/uploads/${filename}`;
}

// Frontend upload
// frontend/src/pages/StudentOTPPage.tsx:158-174
const formData = new FormData();
formData.append('file', finalBlob, 'photo.jpg');
formData.append('sessionId', resolvedSessionId);
formData.append('otp', otp);
formData.append('meta', JSON.stringify({...}));

await api.post('/attendance/checkin-otp', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
```

---

### Câu 9: Watermark được thêm vào ảnh ở đâu - Frontend hay Backend? Giải thích cách implement.

**Vị trí code:**
- Frontend: `frontend/src/pages/StudentOTPPage.tsx` (dòng 86-119)

**Trả lời:**
- Watermark được thêm ở **Frontend** trước khi upload
- Sử dụng HTML5 Canvas API để vẽ watermark lên ảnh
- Watermark chứa: MSSV, mã buổi (publicCode), OTP, timestamp
- Đảm bảo tính toàn vẹn: watermark được tạo ngay khi chụp ảnh, không thể chỉnh sửa sau

**Code tham khảo:**
```typescript
// frontend/src/pages/StudentOTPPage.tsx:86-119
const capturePhoto = () => {
  const canvas = canvasRef.current;
  const ctx = canvas.getContext('2d');
  
  // Vẽ ảnh từ video
  ctx.drawImage(video, 0, 0);
  
  // Vẽ watermark
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, canvas.height - 100, canvas.width, 100);
  
  ctx.fillStyle = 'white';
  ctx.font = 'bold 20px Arial';
  const watermarkText = `${user.studentCode} - ${publicCode} - ${otp} - ${dayjs().format('YYYY-MM-DD HH:mm:ss')}`;
  ctx.fillText(watermarkText, 10, canvas.height - 50);
  
  // Convert to data URL
  const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
  setPhoto(dataUrl);
};
```

---

### Câu 10: Metadata của ảnh (studentCode, timestamp) được lưu ở đâu? Tại sao không chỉ lưu trong Evidence.photoUrl?

**Vị trí code:**
- Schema: `backend/prisma/schema.prisma` (dòng 91-98)
- Logic lưu: `backend/src/attendance/attendance.service.ts` (dòng 292-298)

**Trả lời:**
- Metadata lưu trong `Evidence.metaJson` (JSON string)
- Lý do: Tách biệt data và file, dễ query/search mà không cần parse ảnh
- Metadata gồm: `{studentCode, timestamp}` - có thể mở rộng thêm fields khác

**Code tham khảo:**
```typescript
// Lưu evidence với metadata
await this.prisma.evidence.create({
  data: {
    attendanceId: attendance.id,
    photoUrl,
    metaJson: JSON.stringify(checkInDto.meta),  // ← Metadata riêng
  },
});
```

---

## PHẦN 4: QUÉT QR CODE

### Câu 11: QR code chứa thông tin gì? Tại sao không chỉ encode sessionId?

**Vị trí code:**
- QR Token Service: `backend/src/common/utils/qr-token.util.ts`
- Generate QR: `backend/src/sessions/sessions.service.ts` (dòng 239-258)

**Trả lời:**
- QR code chứa JWT token với payload: `sessionId`, `nonce`, `exp`, `type`, `publicCode`, `className`, `classCode`, `sessionTitle`
- Lý do: 
  - `nonce`: Chống replay attack (mỗi QR unique)
  - `exp`: Tự động expire sau 60s (rotate)
  - Metadata (className, etc.): Frontend có thể hiển thị ngay mà không cần gọi API

**Code tham khảo:**
```typescript
// backend/src/common/utils/qr-token.util.ts:39-65
generateQRToken(session: QRSessionContext): QRTokenPayload {
  const now = Math.floor(Date.now() / 1000);
  const nonce = `${session.id}-${now}-${Math.random().toString(36).substr(2, 9)}`;
  const exp = now + this.qrRotateSeconds;  // 60s default
  
  const payload: QRTokenPayload = {
    sessionId: session.id,
    nonce,  // ← Chống reuse
    iat: now,
    exp,    // ← Tự động expire
    type: 'ATTEND_TOKEN',
    ver: 1,
    publicCode: session.publicCode ?? null,
    className: session.class?.name ?? null,  // ← Metadata
    classCode: session.class?.code ?? null,
    sessionTitle: session.title ?? null,
  };
  
  return payload;
}
```

---

### Câu 12: QR code rotate như thế nào? Tại sao cần rotate?

**Vị trí code:**
- QR Token Service: `backend/src/common/utils/qr-token.util.ts` (dòng 28-36, 39-66)
- Config: `QR_ROTATE_SECONDS` (mặc định 180s = 3 phút)

**Trả lời:**
- QR code tự động rotate mỗi 60-180 giây (configurable)
- Mỗi lần rotate tạo nonce mới → QR code mới
- Lý do rotate:
  - Chống screenshot và reuse QR code cũ
  - Đảm bảo chỉ sinh viên có mặt mới quét được
  - Nonce được track trong memory để chống reuse

**Code tham khảo:**
```typescript
// backend/src/common/utils/qr-token.util.ts:28-36
constructor(
  private jwtService: JwtService,
  private configService: ConfigService,
) {
  this.qrRotateSeconds =
    parseInt(this.configService.get('QR_ROTATE_SECONDS') || '180') || 180;
}

// Generate với expiration
const exp = now + this.qrRotateSeconds;  // QR expire sau 180s
const nonce = `${session.id}-${now}-${Math.random().toString(36).substr(2, 9)}`;
```

---

### Câu 13: Làm thế nào để verify QR token? Có những lớp bảo mật nào?

**Vị trí code:**
- Verify QR: `backend/src/common/utils/qr-token.util.ts` (dòng 74-96)
- Sử dụng: `backend/src/attendance/attendance.service.ts` (dòng 44-91)

**Trả lời:**
- Verify JWT signature với `JWT_SECRET`
- Check expiration time (`exp`)
- Check nonce đã được sử dụng chưa (nonceMap)
- Fallback: Nếu verify fail, thử decode và check exp manually (cho demo)

**Code tham khảo:**
```typescript
// backend/src/common/utils/qr-token.util.ts:74-96
verifyQRToken(token: string): QRTokenPayload | null {
  const secret = this.configService.get('JWT_SECRET') || 'dev_change_me';
  try {
    // Verify signature + expiration
    const payload = this.jwtService.verify<QRTokenPayload>(token, {
      secret,
      clockTolerance: 5,  // Cho phép lệch 5s
    });
    this.handleNonce(payload);  // ← Check nonce đã dùng chưa
    return payload;
  } catch (e) {
    // Fallback: decode without verify (demo only)
    // ...
  }
}

// Check nonce reuse
private handleNonce(payload: QRTokenPayload) {
  const nonceData = this.nonceMap.get(payload.nonce);
  if (nonceData && nonceData.expiresAt >= Date.now()) {
    this.nonceMap.delete(payload.nonce);  // ← Xóa nonce đã dùng
  }
}
```

---

### Câu 14: Khi quét QR, hệ thống kiểm tra GPS như thế nào? Sử dụng công thức nào để tính khoảng cách?

**Vị trí code:**
- Geography util: `backend/src/common/utils/geography.util.ts`
- Logic check GPS: `backend/src/attendance/attendance.service.ts` (dòng 118-164)

**Trả lời:**
- Sử dụng công thức **Haversine** để tính khoảng cách giữa 2 điểm GPS
- So sánh với `geofenceRadius` (mét) của session
- Nếu > radius → status = TOO_FAR
- Nếu ≤ radius → status = APPROVED

**Code tham khảo:**
```typescript
// backend/src/common/utils/geography.util.ts:4-27
export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6371000; // Bán kính Trái Đất (mét)
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;  // Khoảng cách (mét)
}

// Sử dụng trong check-in
const distance = haversineDistance(
  checkInDto.lat, checkInDto.lng,
  session.latitude, session.longitude,
);

if (distance > session.geofenceRadius) {
  // TOO_FAR
}
```

---

## PHẦN 5: CÁC KỸ THUẬT LIÊN QUAN

### Câu 15: Tại sao khi tạo Session, hệ thống tự động tạo 100 bản ghi Attendance với status NOT_ATTENDED?

**Vị trí code:**
- Logic auto-import: `backend/src/sessions/sessions.service.ts` (dòng 53-115)

**Trả lời:**
- Tự động tạo placeholder cho 100 sinh viên (523H0001 - 523H0100)
- Method = AUTO_IMPORT, Status = NOT_ATTENDED
- Lý do: 
  - Dễ query danh sách điểm danh (không cần LEFT JOIN)
  - Có sẵn record để update khi sinh viên check-in
  - Giảng viên thấy ngay ai chưa điểm danh

**Code tham khảo:**
```typescript
// backend/src/sessions/sessions.service.ts:105-115
const attendanceData = allUsers.map((u) => ({
  sessionId: session.id,
  studentId: u.id,
  method: 'AUTO_IMPORT' as unknown as AttendanceMethod,
  status: 'NOT_ATTENDED' as unknown as AttendanceStatus,
}));
await this.prisma.attendance.createMany({
  data: attendanceData,
  skipDuplicates: true,
});
```

---

### Câu 16: Ràng buộc unique `(sessionId, studentId)` trong Attendance có ý nghĩa gì?

**Vị trí code:**
- Schema: `backend/prisma/schema.prisma` (dòng 86)
- Logic xử lý: `backend/src/attendance/attendance.service.ts` (dòng 127-134, 254-261)

**Trả lời:**
- Đảm bảo mỗi sinh viên chỉ có **1 bản ghi điểm danh** cho mỗi buổi học
- Khi check-in lại, hệ thống **update** record cũ thay vì tạo mới
- Tránh duplicate data và logic phức tạp

**Code tham khảo:**
```prisma
// Schema
model Attendance {
  // ...
  @@unique([sessionId, studentId])  // ← Ràng buộc unique
}

// Logic xử lý
const existing = await this.prisma.attendance.findUnique({
  where: {
    sessionId_studentId: { sessionId, studentId },
  },
});

if (existing) {
  // Update record cũ
  return this.prisma.attendance.update({...});
} else {
  // Tạo mới
  return this.prisma.attendance.create({...});
}
```

---

### Câu 17: Cascade delete được thiết kế như thế nào? Ví dụ xóa một Session sẽ xóa những gì?

**Vị trí code:**
- Schema: `backend/prisma/schema.prisma` (các relation với `onDelete: Cascade`)
- ERD: `docs/erd-relationships.md` (dòng 48-51)

**Trả lời:**
- Xóa Session → xóa tất cả Attendance liên quan → xóa Evidence của các Attendance đó
- Xóa Class → xóa Session → xóa Attendance → xóa Evidence
- Xóa User → xóa Enrollment, Attendance → xóa Evidence
- Đảm bảo data integrity, không có orphan records

**Code tham khảo:**
```prisma
model Session {
  // ...
  attendances Attendance[]
  class       Class @relation(fields: [classId], references: [id], onDelete: Cascade)
}

model Attendance {
  // ...
  session     Session @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  evidence    Evidence?
}

model Evidence {
  // ...
  attendance  Attendance @relation(fields: [attendanceId], references: [id], onDelete: Cascade)
}
```

---

### Câu 18: Hệ thống xử lý trường hợp sinh viên điểm danh nhiều lần như thế nào?

**Vị trí code:**
- Logic check existing: `backend/src/attendance/attendance.service.ts` (dòng 127-194, 254-289)

**Trả lời:**
- Check existing record bằng unique constraint `(sessionId, studentId)`
- Nếu đã APPROVED → giữ nguyên, không update
- Nếu chưa APPROVED (PENDING, TOO_FAR, NOT_ATTENDED) → update với thông tin mới
- Đảm bảo sinh viên có thể thử lại nếu lần đầu fail

**Code tham khảo:**
```typescript
// QR check-in
if (existing) {
  if (existing.status === 'APPROVED') {
    return existing;  // ← Giữ nguyên nếu đã approved
  }
  // Update nếu chưa approved
  return this.prisma.attendance.update({...});
}

// OTP check-in
if (existing && existing.status === AttendanceStatus.APPROVED) {
  return existing;  // ← Không cho update nếu đã approved
}
// Update hoặc create mới
```

---

### Câu 19: JWT được sử dụng ở đâu trong hệ thống? Có những loại JWT nào?

**Vị trí code:**
- Auth JWT: `backend/src/auth/` (strategies, service)
- QR Token JWT: `backend/src/common/utils/qr-token.util.ts`

**Trả lời:**
- **Auth JWT**: Dùng cho authentication (login), chứa userId, role, exp
- **QR Token JWT**: Dùng cho QR code, chứa sessionId, nonce, metadata, exp ngắn (60-180s)
- Cả 2 đều dùng cùng `JWT_SECRET` nhưng payload khác nhau

**Code tham khảo:**
```typescript
// QR Token JWT
signQRToken(payload: QRTokenPayload): string {
  return this.jwtService.sign(payload, {
    secret: this.configService.get('JWT_SECRET'),
  });
}

// Auth JWT (trong auth.service.ts)
// Tương tự nhưng payload khác (userId, role, ...)
```

---

### Câu 20: Frontend làm thế nào để quét QR code? Sử dụng thư viện nào?

**Vị trí code:**
- Frontend QR scanner: Tìm trong `frontend/src/pages/StudentQRPage.tsx` (nếu có)

**Trả lời:**
- Sử dụng thư viện như `html5-qrcode` hoặc `react-qr-reader`
- Hoặc dùng Web API `getUserMedia` để truy cập camera
- Sau khi quét được QR token, gọi API `POST /attendance/checkin-qr` với GPS coordinates

**Lưu ý:** Cần HTTPS để truy cập camera trên mobile browser.

---

## TỔNG KẾT

### Các điểm mạnh của thiết kế:
1. ✅ Database normalization tốt, ràng buộc đầy đủ
2. ✅ Bảo mật: JWT, nonce, OTP rotation, GPS verification
3. ✅ Watermark ở frontend đảm bảo tính toàn vẹn
4. ✅ Cascade delete đảm bảo data integrity
5. ✅ Unique constraints tránh duplicate

### Các điểm cần cải thiện (có thể hỏi):
1. ⚠️ Nonce được lưu trong memory → mất khi restart server
2. ⚠️ File upload chưa có validation kích thước/format
3. ⚠️ Chưa có rate limiting cho API
4. ⚠️ Chưa có logging/audit trail đầy đủ
5. ⚠️ GPS accuracy chưa được validate (có thể fake)

---

**Chúc các em bảo vệ đồ án thành công! 🎓**

