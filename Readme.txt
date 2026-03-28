================================================================================
              HƯỚNG DẪN CHẤM ĐIỂM — HỆ THỐNG ĐIỂM DANH QR CODE
                    SOA-139 / 523H0054 — ĐỒ ÁN CUỐI KỲ
================================================================================

MỤC LỤC
--------
  1. Giới thiệu dự án
  2. Yêu cầu trước khi chạy
  3. Cách 1: Chạy bằng Docker Compose (Khuyến nghị)
  4. Cách 2: Chạy bằng câu lệnh thủ công (Backend + Frontend riêng lẻ)
  5. Các tài khoản đăng nhập mặc định
  6. Thông tin kỹ thuật cần lưu ý khi chấm
  7. Các endpoint chính
  8. Xử lý lỗi thường gặp

================================================================================
1. GIỚI THIỆU DỰ ÁN
================================================================================

Tên dự án : Hệ thống điểm danh sinh viên bằng mã QR Code có xác thực GPS
           và phương thức dự phòng OTP + chụp ảnh
Môn học   : SOA-139 / 523H0054 — Đồ án cuối kỳ
Ngôn ngữ  : TypeScript
Backend   : NestJS (Node.js 20)
Frontend  : React 18 + Vite 5
Database  : PostgreSQL 16 + Prisma ORM
Kiến trúc : Monorepo (npm workspaces)
Chứa 9 Design Patterns: Adapter, Singleton, Factory, Builder+Director,
Prototype, Facade, Strategy, Observer, Decorator

================================================================================
2. YÊU CẦU TRƯỚC KHI CHẠY
================================================================================

  - Node.js >= 18 (khuyến nghị Node.js 20)
  - npm >= 9
  - Docker Desktop (cho Cách 1)
  - PostgreSQL 16 cài sẵn (cho Cách 2)
  - Git

================================================================================
3. CÁCH 1: CHẠY BẰNG DOCKER COMPOSE (Khuyến nghị)
================================================================================

Bước 1: Mở terminal, di chuyển vào thư mục source của dự án:

    cd /Users/iannwendy/Desktop/SOA-139_523H0054_CuoiKyV1/source

    (Thư mục này chứa: package.json, docker-compose.yml, backend/, frontend/)

Bước 2: Chạy Docker Compose:

    docker compose up -d

    Lệnh này sẽ:
      - Khởi tạo cơ sở dữ liệu PostgreSQL (port 5433 trên host)
      - Build và chạy Backend NestJS (port 8080 trên host)
      - Build và chạy Frontend React (port 3000 trên host)
      - Tự động chạy Prisma migrate + seed dữ liệu

    Lưu ý: Lần chạy đầu tiên có thể mất 2-5 phút để tải image và build.

Bước 3: Chờ khoảng 30 giây, kiểm tra trạng thái:

    docker compose ps

    Tất cả dịch vụ (db, backend, frontend) cần có trạng thái "Up".

Bước 4: Truy cập ứng dụng:

    Frontend (giao diện người dùng): http://localhost:3000
    Backend API:                     http://localhost:8080
    Health check:                    http://localhost:8080/health

Dừng ứng dụng:

    docker compose down           # Dừng nhưng giữ lại dữ liệu
    docker compose down -v        # Dừng VÀ xóa dữ liệu database

================================================================================
4. CÁCH 2: CHẠY THỦ CÔNG (Backend + Frontend riêng lẻ)
================================================================================

Yêu cầu: PostgreSQL 16 phải đang chạy trên máy và tạo database.

Bước 1: Tạo database PostgreSQL:

    createdb -U <username> attendance

    Ví dụ (postgres mặc định):
      sudo -u postgres createdb -U postgres attendance
      # Hoặc tạo user riêng:
      sudo -u postgres psql -c "CREATE USER app WITH PASSWORD 'app';"
      sudo -u postgres psql -c "CREATE DATABASE attendance OWNER app;"

Bước 2: Di chuyển vào thư mục source:

    cd /Users/iannwendy/Desktop/SOA-139_523H0054_CuoiKyV1/source

Bước 3: Cài đặt toàn bộ dependency:

    npm run install:all

Bước 4: Cập nhật file .env ở backend (nếu cần):

    DATABASE_URL=postgresql://app:app@localhost:5432/attendance
    JWT_SECRET=dev_change_me
    FRONTEND_URL=http://localhost:3000
    QR_ROTATE_SECONDS=180
    OTP_STEP_SECONDS=60
    GEOFENCE_RADIUS_M_DEFAULT=100
    UPLOAD_DIR=./uploads

Bước 5: Chạy Prisma migrate và seed:

    cd backend
    npx prisma migrate deploy
    npx prisma db seed

Bước 6: Khởi chạy Backend:

    npm run start:dev

    Backend chạy tại http://localhost:8080

Bước 7: Mở terminal mới, khởi chạy Frontend:

    cd /Users/iannwendy/Desktop/SOA-139_523H0054_CuoiKyV1/source/frontend
    npm run dev

    Frontend chạy tại http://localhost:3000

================================================================================
5. CÁC TÀI KHOẢN ĐĂNG NHẬP MẶC ĐỊNH
================================================================================

  ┌──────────┬──────────────────────────────┬───────────────┬──────────┐
  │  Vai trò │  Email                       │  Mật khẩu     │  Ghi chú │
  ├──────────┼──────────────────────────────┼───────────────┼──────────┤
  │ Admin    │  admin@test.com              │  admin123     │ Tài khoản quản trị hệ thống         │
  │ Lecturer │  lecturer@test.com           │  lecturer123  │ Giảng viên, tạo lớp & phiên điểm danh │
  │ Student  │  student523H0001@test.com    │  pass123      │ Tài khoản sinh viên mẫu (còn 99 tài  │
  │ Student  │  student523H0002@test.com    │  pass123      │ khoản khác: 523H0002 → 523H0100)     │
  │ Student  │  ...                         │  pass123      │ Tất cả cùng mật khẩu: pass123         │
  └──────────┴──────────────────────────────┴───────────────┴──────────┘

  Danh sách sinh viên (tất cả mật khẩu: pass123):
    - student523H0001@test.com  →  student523H0100@test.com
    (Mã sinh viên tương ứng: 523H0001 → 523H0100)

  Dữ liệu seed đã tạo sẵn:
    - 1 lớp học: INT101 — "Service-oriented architecture"
    - 2 phiên điểm danh mẫu (đã gắn lớp INT101, geofence tại TDTU)
    - 100 sinh viên đã đăng ký lớp INT101

================================================================================
6. THÔNG TIN KỸ THUẬT CẦN LƯU Ý KHI CHẤM
================================================================================

6.1 Cấu trúc dự án (monorepo)
    source/
    ├── backend/          # NestJS API
    │   ├── src/
    │   │   ├── attendance/   # Module điểm danh (QR, OTP, approve/reject)
    │   │   ├── auth/         # Module xác thực (JWT, Strategy pattern)
    │   │   ├── classes/      # Module quản lý lớp học
    │   │   ├── sessions/     # Module quản lý phiên điểm danh
    │   │   ├── users/        # Module quản lý người dùng
    │   │   ├── evidence/     # Module upload ảnh điểm danh
    │   │   └── common/       # Shared utilities, decorators, guards
    │   ├── prisma/
    │   │   ├── schema.prisma
    │   │   ├── migrations/   # 7 bảng migrate
    │   │   └── seed.ts       # Script seed dữ liệu
    │   └── uploads/          # Lưu ảnh attendance (Multer + Sharp)
    └── frontend/         # React + Vite
        ├── src/
        │   ├── pages/
        │   │   ├── LoginPage.tsx
        │   │   ├── StudentScanPage.tsx   # Quét QR + GPS
        │   │   ├── StudentOTPPage.tsx     # OTP + chụp ảnh
        │   │   ├── TeacherDashboard.tsx   # Dashboard giảng viên
        │   │   ├── CreateSessionPage.tsx  # Tạo phiên điểm danh
        │   │   ├── SessionDisplayPage.tsx # Màn hình projector
        │   │   └── AdminReports.tsx       # Báo cáo admin
        │   └── store/
        │       ├── api.ts                # Axios instance
        │       └── authStore.ts          # Zustand auth store
        └── .env

6.2 Các file cấu hình quan trọng
    - docker-compose.yml          : Định nghĩa 3 service (db, backend, frontend)
    - backend/Dockerfile          : Build backend + entrypoint chạy migrate/seed
    - backend/docker-entrypoint.sh: Script tự động migrate + seed khi container khởi động
    - backend/FIX_ERRORS.md       : Hướng dẫn sửa lỗi TypeScript thường gặp

6.3 Database connection string
    Docker:  postgresql://app:app@db:5432/attendance
    Dev:     postgresql://app:app@localhost:5433/attendance

6.4 Các cổng (port) mặc định
    - PostgreSQL: 5433 (host) / 5432 (container)
    - Backend:    8080
    - Frontend:   3000

6.5 9 Design Patterns được sử dụng
    1. Adapter       → common/utils/qr-token-adapter.ts
    2. Singleton     → common/config/config-manager.ts
    3. Factory       → attendance/factories/attendance-response.factory.ts
    4. Builder+Director → sessions/builders/session.builder.ts
    5. Prototype     → users/prototypes/user.prototype.ts
    6. Facade        → attendance/facades/attendance-checkin.facade.ts
    7. Strategy      → auth/strategies/auth-strategy.ts
    8. Observer      → attendance/observers/attendance-observer.ts
    9. Decorator     → common/decorators/cache-decorator.ts

================================================================================
7. CÁC ENDPOINT CHÍNH
================================================================================

  AUTH
    POST /auth/login                    Đăng nhập
    GET  /auth/me                       Thông tin user hiện tại

  CLASSES
    GET    /classes                     Danh sách lớp (giảng viên)
    POST   /classes                     Tạo lớp mới
    GET    /classes/:id                 Chi tiết lớp
    POST   /classes/:id/enroll          Đăng ký sinh viên vào lớp

  SESSIONS
    GET    /sessions                    Danh sách phiên (giảng viên)
    POST   /sessions                    Tạo phiên điểm danh
    GET    /sessions/:id                Chi tiết phiên
    PATCH  /sessions/:id                Cập nhật phiên
    DELETE /sessions/:id                Xóa phiên
    POST   /sessions/quick              Tạo nhanh phiên (Builder pattern)
    GET    /sessions/:id/qr-token       Lấy QR token (JWT)
    GET    /sessions/:id/otp-secret     Lấy OTP secret (chỉ giảng viên)

  ATTENDANCE
    POST   /attendance/checkin-qr       Điểm danh bằng QR (GPS)
    POST   /attendance/checkin-otp      Điểm danh bằng OTP + ảnh
    GET    /attendance/session/:id       Danh sách điểm danh phiên
    PATCH  /attendance/:id/approve      Phê duyệt (giảng viên)
    PATCH  /attendance/:id/reject       Từ chối (giảng viên)
    GET    /attendance/report/class/:id Báo cáo điểm danh lớp

  USERS
    GET    /users/me                    Thông tin cá nhân
    POST   /users/students/batch        Tạo nhiều sinh viên (Prototype pattern)

  EVIDENCE
    GET    /evidence/:id                Lấy ảnh bằng chứng (watermarked)

  HEALTH
    GET    /health                       Kiểm tra trạng thái server

================================================================================
8. XỬ LÝ LỖI THƯỜNG GẶP
================================================================================

  Lỗi: "Cannot connect to database"
    → Kiểm tra PostgreSQL đã chạy chưa (docker compose ps)
    → Kiểm tra DATABASE_URL trong backend/.env
    → Với Docker: port bên ngoài phải là 5433 (không phải 5432)

  Lỗi: "prisma generate" failed
    → Chạy: cd backend && npx prisma generate

  Lỗi: Frontend không gọi được API
    → Kiểm tra VITE_API_BASE trong frontend/.env phải là http://localhost:8080
    → Kiểm tra CORS trong backend đã cho phép http://localhost:3000

  Lỗi: Seed không chạy
    → Docker: xóa container và chạy lại `docker compose up -d`
    → Thủ công: cd backend && npx prisma db seed

  Lỗi: Module not found (TypeScript)
    → Chạy: cd backend && npm install && npx prisma generate
    → Sau đó: npm run start:dev

  Muốn reset hoàn toàn database (xóa dữ liệu + seed lại):
    docker compose down -v
    docker compose up -d

================================================================================
                    HẾT — CHÚC QUÝ THẦY/CÔ CHẤM ĐIỂM THÀNH CÔNG
================================================================================
