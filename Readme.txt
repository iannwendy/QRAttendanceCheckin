TRUY CẬP DỰ ÁN
---------------
  Trang web : http://qrattendance.xyz

TÀI KHOẢN ĐĂNG NHẬP
--------------------
  Admin    : admin    / pass123
  Lecturer : lecturer / pass123
  Students : 523H0001 → 523H0100 / pass123

CÁCH CHẠY DỰ ÁN (với Docker)
--------------------------------------
  Bước 1: Clone dự án về máy:
    git clone https://gitlab.duthu.net/523h0054/qrattendance.git
    cd qrattendance/source

  Bước 2: Khởi chạy Docker Compose:
    docker compose up -d

  Bước 3: Chờ ~30 giây, kiểm tra trạng thái:
    docker compose ps

  Bước 4: Truy cập ứng dụng:
    http://localhost:3000

  Dừng ứng dụng:
    docker compose down            # Dừng, giữ lại dữ liệu
    docker compose down -v         # Dừng và xóa database
