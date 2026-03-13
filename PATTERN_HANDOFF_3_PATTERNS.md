# Pattern Handoff - 3 Patterns Completed

Tai lieu nay tong hop cac thay doi da lam cho 3 pattern:
- Strategy (Auth)
- Observer (Attendance)
- Decorator (Cache)

Muc tieu: nguoi tiep theo vao lam cac pattern con lai co the nam duoc trang thai hien tai nhanh.

## 1) Strategy Pattern (Auth)

### Muc tieu
Thay logic if/else phan loai dang nhap bang context + concrete strategies.

### File lien quan
- backend/src/auth/strategies/auth-strategy.ts
- backend/src/auth/auth.service.ts
- backend/src/auth/auth.module.ts

### Trang thai hien tai
- Da co AuthStrategy interface + 3 strategy:
  - AdminAuthStrategy
  - LecturerAuthStrategy
  - StudentAuthStrategy
- Da co AuthStrategyContext de chon strategy theo username.
- AuthService.login da goi AuthStrategyContext.authenticate(username).
- AuthModule da register provider cho context + 3 strategy.

### Hanh vi dang nhap hien tai
- Password phai dung pass123.
- Username hop le:
  - admin
  - lecturer
  - MSSV format 523Hxxxx
- Sai 1 dieu kien thi 401.

### Luu y
- Strategy da duoc wiring vao runtime (khong con la file demo don le).

## 2) Observer Pattern (Attendance)

### Muc tieu
Khi attendance status thay doi thi notify cho observers (logging, analytics).

### File lien quan
- backend/src/attendance/observers/attendance-observer.ts
- backend/src/attendance/attendance.module.ts
- backend/src/attendance/attendance.service.ts

### Trang thai hien tai
- Da co AttendanceSubject + AttendanceLoggingObserver + AttendanceAnalyticsObserver.
- AttendanceModule da register providers observer + subject.
- AttendanceService da inject subject/observers va attach trong constructor.
- Da goi subject.notify(...) sau cac diem thay doi status:
  - checkInQR (TOO_FAR/APPROVED create-update)
  - checkInOTP (PENDING)
  - approveAttendance
  - rejectAttendance

### Hanh vi runtime
- Observer loi khong lam fail request (subject.notify da co try/catch theo observer).
- Co console log cho approved/rejected/pending + analytics dem so luong.

### Luu y
- oldStatus cho approve/reject hien dang de null (khong query status cu).

## 3) Decorator Pattern (Cache)

### Muc tieu
Ap dung cache vao cac method read-heavy ma khong doi business logic goc.

### File lien quan
- backend/src/common/decorators/cache-decorator.ts
- backend/src/classes/classes.service.ts
- backend/src/attendance/attendance.service.ts

### Trang thai hien tai
- Da co InMemoryCacheStore dang singleton + global cache store.
- Decorator da doi ten thanh @Cached(...).
- Da them helper:
  - invalidateCache(pattern)
  - clearAllCache()
- Da ap @Cached vao:
  - ClassesService.findAll (300s)
  - ClassesService.findOne (300s)
  - AttendanceService.getClassAttendanceReport (120s)
  - AttendanceService.getAllClassesAttendanceReport (60s)
  - AttendanceService.getAttendanceAnalyticsOverview (60s)
- Da them invalidation sau cac write operation:
  - Classes: create, enrollStudents, remove
  - Attendance: checkInQR, checkInOTP, approveAttendance, rejectAttendance

### Luu y
- Invalidation dang dung regex string pattern. Voi id chua ky tu dac biet thi on, nhung neu mo rong thi nen escape regex input.
- Muc tieu hoc tap: in-memory la phu hop.

## Build and Runtime Verification

### Da verify
- Docker build backend pass sau cac refactor.
- Backend da chay va health 200 tren /health.

### Lenh check nhanh
- Build backend:
  - docker compose build backend
- Run db + backend:
  - docker compose up -d db backend
- Health:
  - curl http://localhost:8080/health

## API Test Collections da tao
- AUTH_API_TEST.postman_collection.json
- ATTENDANCE_API_TEST.postman_collection.json

Trong collection attendance da bo sung request lay QR token va OTP tu sessions API de test check-in nhanh.

## Van de da gap va da xu ly
- Loi TS2307 do sai relative import path (da sua).
- docker-entrypoint.sh bi CRLF gay loi /bin/sh set option (da doi sang LF).

## Goi y cho nguoi tiep theo (patterns con lai)
1. Kiem tra pattern co wiring vao runtime hay moi dung o file minh hoa.
2. Neu co them wrapper/decorator/facade, uu tien khong doi API contract.
3. Moi thay doi business write can xem co invalidation/notify lien quan khong.
4. Luon build backend bang Docker sau khi sua de tranh phu thuoc local toolchain.

## Scope note
Tai lieu nay chi tong hop 3 pattern da lam trong dot nay:
- Strategy
- Observer
- Decorator (Cache)
