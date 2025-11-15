# ⚡ Quick Setup: Domain và HTTPS

## Tóm tắt nhanh

### 1. Cấu hình DNS (Trên access.pavietnam.vn)

Thêm A Record:
- **Host**: `@` (hoặc để trống)
- **Loại**: `A`
- **Giá trị**: `34.177.89.245`
- **TTL**: `3600`

### 2. Trên VPS - Chạy script tự động

```bash
cd ~/SOA_QRAttendance

# Chạy script tự động (cần sudo)
sudo ./setup_nginx_ssl.sh qrattendance.xyz
```

Script sẽ tự động:
- ✅ Cài đặt Nginx
- ✅ Cấu hình reverse proxy
- ✅ Cài đặt Certbot
- ✅ Cài đặt SSL certificate
- ✅ Cấu hình auto-renewal

### 3. Cập nhật Environment Variables

```bash
nano .env.production
```

Cập nhật:
```env
FRONTEND_URL=https://qrattendance.xyz
VITE_API_BASE=https://qrattendance.xyz/api
```

### 4. Restart Services

```bash
# Pull code mới (nếu đã commit backend/src/main.ts)
git pull

# Rebuild backend với CORS mới
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build backend

# Restart frontend
docker compose -f docker-compose.prod.yml --env-file .env.production restart frontend
```

### 5. Kiểm tra

```bash
# Kiểm tra HTTPS
curl -I https://qrattendance.xyz
curl -I https://qrattendance.xyz/api/health
```

## Hoặc làm thủ công

Xem file `CAU_HINH_DOMAIN_HTTPS.md` để biết chi tiết từng bước.

