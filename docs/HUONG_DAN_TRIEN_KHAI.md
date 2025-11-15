# 🚀 Hướng dẫn Triển khai lên VPS Google Cloud

## Bước 1: Cài đặt Docker trên VPS

SSH vào VPS và chạy:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Cài đặt Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Thêm user vào docker group
sudo usermod -aG docker $USER

# Cài đặt Docker Compose
sudo apt install docker-compose-plugin -y

# Logout và login lại, hoặc chạy:
newgrp docker

# Kiểm tra
docker --version
docker compose version
```

## Bước 2: Upload code lên VPS

### Cách 1: Dùng Git (Khuyên dùng)
```bash
cd ~
git clone https://github.com/iannwendy/QRAttendanceCheckin SOA_QRAttendance
cd SOA_QRAttendance
```

### Cách 2: Dùng SCP (từ máy local)
```bash
# Từ máy local
scp -r /Users/iannwendy/Desktop/SOA_QRAttendance iannwendii@your-vps-ip:~/
```

## Bước 3: Cấu hình Environment

```bash
cd ~/SOA_QRAttendance

# Copy file template
cp env.production.example .env.production

# Cài đặt nano editor (nếu chưa có)
sudo apt update && sudo apt install -y nano

# Chỉnh sửa file
nano .env.production
```

**Lưu ý:** Nếu không muốn cài nano, có thể dùng `vi`:
```bash
vi .env.production
# Trong vi: nhấn 'i' để vào insert mode, ESC để thoát, ':wq' để save và quit
```

**QUAN TRỌNG - Cập nhật các giá trị sau:**

```env
# Đổi mật khẩu database (mạnh, ít nhất 16 ký tự)
POSTGRES_PASSWORD=your_secure_password_here

# Đổi JWT secret (mạnh, ít nhất 32 ký tự)
JWT_SECRET=your_jwt_secret_here_min_32_chars

# URL công khai của frontend (thay bằng IP hoặc domain của bạn)
FRONTEND_URL=http://YOUR_VPS_IP
# hoặc nếu có domain:
# FRONTEND_URL=http://your-domain.com

# URL công khai của backend API
VITE_API_BASE=http://YOUR_VPS_IP:8080
# hoặc nếu có domain:
# VITE_API_BASE=http://your-domain.com:8080
```

## Bước 4: Mở Firewall trên Google Cloud

Vào **Google Cloud Console** > **VPC network** > **Firewall rules**:

1. Tạo rule mới cho **Port 80** (HTTP):
   - Name: `allow-http`
   - Direction: Ingress
   - Action: Allow
   - Targets: All instances
   - Source IP ranges: `0.0.0.0/0`
   - Protocols and ports: TCP: `80`

2. Tạo rule mới cho **Port 8080** (Backend):
   - Name: `allow-backend`
   - Direction: Ingress
   - Action: Allow
   - Targets: All instances
   - Source IP ranges: `0.0.0.0/0`
   - Protocols and ports: TCP: `8080`

Hoặc dùng gcloud CLI:
```bash
gcloud compute firewall-rules create allow-http \
    --allow tcp:80 \
    --source-ranges 0.0.0.0/0

gcloud compute firewall-rules create allow-backend \
    --allow tcp:8080 \
    --source-ranges 0.0.0.0/0
```

## Bước 5: Triển khai

### Cách 1: Dùng script tự động (Dễ nhất)
```bash
cd ~/SOA_QRAttendance
./deploy.sh
```

### Cách 2: Dùng Docker Compose thủ công
```bash
cd ~/SOA_QRAttendance

# Build và start
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# Xem logs
docker compose -f docker-compose.prod.yml logs -f
```

## Bước 6: Kiểm tra

```bash
# Kiểm tra containers
docker ps

# Kiểm tra frontend
curl http://localhost/health

# Kiểm tra backend
curl http://localhost:8080/health

# Xem logs nếu có lỗi
docker compose -f docker-compose.prod.yml logs
```

## Bước 7: Truy cập ứng dụng

- **Frontend**: `http://YOUR_VPS_IP`
- **Backend API**: `http://YOUR_VPS_IP:8080`

Thay `YOUR_VPS_IP` bằng IP thực tế của VPS (xem trong Google Cloud Console).

## Các lệnh quản lý

```bash
# Dừng tất cả
docker compose -f docker-compose.prod.yml down

# Restart
docker compose -f docker-compose.prod.yml restart

# Xem logs
docker compose -f docker-compose.prod.yml logs -f backend

# Rebuild
docker compose -f docker-compose.prod.yml up -d --build

# Backup database
docker exec qr-attendance-db pg_dump -U app attendance > backup.sql
```

## Tự động restart khi reboot

Docker Compose đã được cấu hình `restart: unless-stopped`, containers sẽ tự động khởi động lại khi VPS reboot.

Đảm bảo Docker service tự động start:
```bash
sudo systemctl enable docker
```

## Troubleshooting

### Lỗi "Permission denied"
```bash
# Thêm user vào docker group
sudo usermod -aG docker $USER
newgrp docker
```

### Lỗi kết nối database
```bash
# Kiểm tra logs
docker compose -f docker-compose.prod.yml logs db

# Kiểm tra kết nối
docker exec -it qr-attendance-db psql -U app -d attendance
```

### Lỗi CORS
- Kiểm tra `FRONTEND_URL` trong `.env.production` đúng với URL công khai
- Đảm bảo backend cho phép origin đó

### Không truy cập được từ bên ngoài
- Kiểm tra firewall rules trên Google Cloud
- Kiểm tra IP của VPS: `curl ifconfig.me`
- Kiểm tra containers đang chạy: `docker ps`

## Bảo mật

1. ✅ Đổi tất cả mật khẩu mặc định
2. ✅ Sử dụng mật khẩu mạnh (16+ ký tự)
3. ✅ JWT_SECRET mạnh (32+ ký tự)
4. ⚠️ Cân nhắc cài SSL/HTTPS nếu có domain
5. ⚠️ Thiết lập backup định kỳ

## Hỗ trợ

Xem file `DEPLOYMENT.md` để biết thêm chi tiết và các tùy chọn nâng cao.

