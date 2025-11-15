# Hướng dẫn Triển khai lên VPS (Google Cloud)

## Yêu cầu
- VPS đã được tạo trên Google Cloud
- Đã SSH vào VPS thành công
- Domain name (tùy chọn, có thể dùng IP)

## Bước 1: Cài đặt Docker và Docker Compose trên VPS

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Cài đặt Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Thêm user vào docker group (để không cần sudo)
sudo usermod -aG docker $USER

# Cài đặt Docker Compose
sudo apt install docker-compose-plugin -y

# Khởi động lại session hoặc logout/login lại để áp dụng group changes
# Hoặc chạy: newgrp docker

# Kiểm tra cài đặt
docker --version
docker compose version
```

## Bước 2: Upload code lên VPS

### Cách 1: Sử dụng Git (Khuyên dùng)
```bash
# Trên VPS
cd ~
git clone https://github.com/iannwendy/QRAttendanceCheckin SOA_QRAttendance
cd SOA_QRAttendance
```

### Cách 2: Sử dụng SCP (từ máy local)
```bash
# Từ máy local của bạn
scp -r /Users/iannwendy/Desktop/SOA_QRAttendance iannwendii@your-vps-ip:~/
```

## Bước 3: Cấu hình Environment Variables

```bash
# Trên VPS
cd ~/SOA_QRAttendance

# Copy file example
cp env.production.example .env.production

# Cài đặt nano editor (nếu chưa có)
sudo apt update && sudo apt install -y nano

# Chỉnh sửa file .env.production
nano .env.production
```

**Lưu ý:** Nếu không muốn cài nano, có thể dùng `vi` hoặc `vim`:
```bash
vi .env.production
# Hoặc
vim .env.production
```

**Quan trọng:** Cập nhật các giá trị sau:
- `POSTGRES_PASSWORD`: Mật khẩu mạnh cho database
- `JWT_SECRET`: Secret key mạnh (ít nhất 32 ký tự)
- `FRONTEND_URL`: URL công khai của frontend (ví dụ: `http://your-ip` hoặc `http://your-domain.com`)
- `VITE_API_BASE`: URL công khai của backend API (ví dụ: `http://your-ip:8080` hoặc `http://api.your-domain.com`)

## Bước 4: Cấu hình Firewall (Google Cloud)

Mở các port cần thiết trên Google Cloud Console:

1. Vào **VPC network** > **Firewall rules**
2. Tạo rules mới:
   - **Port 80** (HTTP) - cho frontend
   - **Port 8080** (Backend API) - nếu cần truy cập trực tiếp
   - **Port 22** (SSH) - đã có sẵn

Hoặc dùng gcloud CLI:
```bash
# Mở port 80 (HTTP)
gcloud compute firewall-rules create allow-http \
    --allow tcp:80 \
    --source-ranges 0.0.0.0/0 \
    --description "Allow HTTP traffic"

# Mở port 8080 (Backend API)
gcloud compute firewall-rules create allow-backend \
    --allow tcp:8080 \
    --source-ranges 0.0.0.0/0 \
    --description "Allow Backend API"
```

## Bước 5: Build và Chạy với Docker Compose

```bash
# Trên VPS
cd ~/SOA_QRAttendance

# Build và start tất cả services
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# Xem logs
docker compose -f docker-compose.prod.yml logs -f

# Kiểm tra status
docker compose -f docker-compose.prod.yml ps
```

## Bước 6: Kiểm tra

```bash
# Kiểm tra containers đang chạy
docker ps

# Kiểm tra frontend
curl http://localhost/health

# Kiểm tra backend
curl http://localhost:8080/health

# Xem logs nếu có lỗi
docker compose -f docker-compose.prod.yml logs backend
docker compose -f docker-compose.prod.yml logs frontend
docker compose -f docker-compose.prod.yml logs db
```

## Bước 7: Truy cập ứng dụng

- **Frontend**: `http://your-vps-ip` hoặc `http://your-domain.com`
- **Backend API**: `http://your-vps-ip:8080` hoặc `http://your-domain.com:8080`

## Các lệnh quản lý thường dùng

```bash
# Dừng tất cả services
docker compose -f docker-compose.prod.yml down

# Dừng và xóa volumes (⚠️ Xóa dữ liệu)
docker compose -f docker-compose.prod.yml down -v

# Restart một service
docker compose -f docker-compose.prod.yml restart backend

# Xem logs real-time
docker compose -f docker-compose.prod.yml logs -f backend

# Rebuild và restart
docker compose -f docker-compose.prod.yml up -d --build

# Backup database
docker exec qr-attendance-db pg_dump -U app attendance > backup.sql

# Restore database
docker exec -i qr-attendance-db psql -U app attendance < backup.sql
```

## Cấu hình Auto-restart khi reboot

Docker Compose với `restart: unless-stopped` đã tự động restart khi VPS reboot. Để đảm bảo:

```bash
# Kiểm tra Docker service tự động start
sudo systemctl enable docker
sudo systemctl status docker
```

## Cấu hình Domain với Nginx Reverse Proxy (Tùy chọn)

Nếu bạn muốn dùng domain và HTTPS:

1. Cài đặt Nginx trên host:
```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

2. Tạo file config `/etc/nginx/sites-available/qr-attendance`:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

3. Enable và cài SSL:
```bash
sudo ln -s /etc/nginx/sites-available/qr-attendance /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d your-domain.com
```

## Troubleshooting

### Lỗi kết nối database
```bash
# Kiểm tra database logs
docker compose -f docker-compose.prod.yml logs db

# Kiểm tra kết nối
docker exec -it qr-attendance-db psql -U app -d attendance
```

### Lỗi CORS
- Đảm bảo `FRONTEND_URL` trong `.env.production` đúng với URL công khai
- Kiểm tra `main.ts` trong backend có cho phép origin đó

### Lỗi build frontend
```bash
# Xóa cache và rebuild
docker compose -f docker-compose.prod.yml down
docker system prune -a
docker compose -f docker-compose.prod.yml up -d --build
```

### Kiểm tra disk space
```bash
df -h
docker system df
```

## Bảo mật Production

1. **Đổi mật khẩu mặc định**: Đảm bảo `POSTGRES_PASSWORD` và `JWT_SECRET` mạnh
2. **Firewall**: Chỉ mở port cần thiết
3. **SSL/HTTPS**: Sử dụng Let's Encrypt với Certbot
4. **Backup**: Thiết lập backup database định kỳ
5. **Monitoring**: Cài đặt monitoring tools (tùy chọn)

## Backup và Restore

### Backup database
```bash
# Tạo backup
docker exec qr-attendance-db pg_dump -U app attendance > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup uploads
tar -czf uploads_backup_$(date +%Y%m%d_%H%M%S).tar.gz backend/uploads/
```

### Restore database
```bash
# Restore từ backup
docker exec -i qr-attendance-db psql -U app attendance < backup.sql
```

