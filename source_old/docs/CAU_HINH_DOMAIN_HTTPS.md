# 🌐 Hướng dẫn Cấu hình Domain và HTTPS

## Bước 1: Cấu hình DNS

### Trên trang quản lý DNS (access.pavietnam.vn)

Thêm các bản ghi DNS sau:

#### 1. A Record cho domain chính (Frontend)
- **Host**: `@` hoặc để trống
- **Loại**: `A`
- **Giá trị**: `34.177.89.245`
- **TTL**: `3600`

#### 2. A Record cho subdomain API (Backend) - Tùy chọn
- **Host**: `api` hoặc `backend`
- **Loại**: `A`
- **Giá trị**: `34.177.89.245`
- **TTL**: `3600`

**Lưu ý**: Nếu muốn dùng cùng domain với port, có thể bỏ qua bước này và dùng `qrattendance.xyz:8080` cho backend.

### Sau khi thêm DNS records

Đợi 5-10 phút để DNS propagate, sau đó kiểm tra:

```bash
# Kiểm tra DNS đã trỏ đúng chưa
nslookup qrattendance.xyz
# hoặc
dig qrattendance.xyz

# Kết quả mong đợi: 34.177.89.245
```

## Bước 2: Cài đặt Nginx trên VPS

Trên VPS, chạy:

```bash
# Update system
sudo apt update

# Cài đặt Nginx
sudo apt install -y nginx

# Khởi động Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Kiểm tra status
sudo systemctl status nginx
```

## Bước 3: Cấu hình Nginx Reverse Proxy

Tạo file cấu hình cho domain:

```bash
sudo nano /etc/nginx/sites-available/qrattendance.xyz
```

Nội dung file:

```nginx
# Frontend - Port 80
server {
    listen 80;
    server_name qrattendance.xyz www.qrattendance.xyz;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Backend API - Port 8080 (nếu muốn dùng subdomain)
server {
    listen 80;
    server_name api.qrattendance.xyz;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers (nếu cần)
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;
    }
}
```

**Hoặc nếu muốn dùng cùng domain với path `/api`:**

```nginx
server {
    listen 80;
    server_name qrattendance.xyz www.qrattendance.xyz;

    # Frontend
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8080/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Handle /api without trailing slash
    location = /api {
        return 301 /api/;
    }
}
```

Enable site:

```bash
# Tạo symbolic link
sudo ln -s /etc/nginx/sites-available/qrattendance.xyz /etc/nginx/sites-enabled/

# Xóa default site (nếu có)
sudo rm /etc/nginx/sites-enabled/default

# Test cấu hình
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## Bước 4: Cài đặt Certbot (Let's Encrypt SSL)

```bash
# Cài đặt Certbot
sudo apt install -y certbot python3-certbot-nginx

# Cài đặt SSL cho domain
sudo certbot --nginx -d qrattendance.xyz -d www.qrattendance.xyz

# Nếu có subdomain API
sudo certbot --nginx -d api.qrattendance.xyz
```

Trong quá trình cài đặt:
- Nhập email của bạn
- Chọn `Y` để redirect HTTP sang HTTPS
- Certbot sẽ tự động cấu hình Nginx với SSL

## Bước 5: Auto-renewal SSL

Certbot tự động tạo cron job để renew SSL. Kiểm tra:

```bash
# Kiểm tra auto-renewal
sudo certbot renew --dry-run

# Xem cron job
sudo systemctl status certbot.timer
```

## Bước 6: Cập nhật Environment Variables

Cập nhật file `.env.production` trên VPS:

```bash
cd ~/SOA_QRAttendance
nano .env.production
```

Cập nhật:

```env
# Thay đổi từ IP sang domain
FRONTEND_URL=https://qrattendance.xyz
VITE_API_BASE=https://qrattendance.xyz/api
# hoặc nếu dùng subdomain:
# VITE_API_BASE=https://api.qrattendance.xyz
```

## Bước 7: Cập nhật Backend CORS

Backend cần cho phép domain mới. Kiểm tra file `backend/src/main.ts` đã có logic cho phép domain từ `FRONTEND_URL` chưa.

## Bước 8: Restart Services

```bash
cd ~/SOA_QRAttendance

# Restart với cấu hình mới
docker compose -f docker-compose.prod.yml --env-file .env.production restart backend frontend

# Hoặc rebuild nếu cần
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

## Bước 9: Kiểm tra

### Kiểm tra HTTPS

```bash
# Frontend
curl -I https://qrattendance.xyz

# Backend
curl -I https://qrattendance.xyz/api/health
# hoặc
curl -I https://api.qrattendance.xyz/health
```

### Kiểm tra trong trình duyệt

- Frontend: `https://qrattendance.xyz`
- Backend API: `https://qrattendance.xyz/api/health` hoặc `https://api.qrattendance.xyz/health`

## Cấu hình Nginx nâng cao (Tùy chọn)

### Tối ưu hiệu năng

Thêm vào server block:

```nginx
# Gzip compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;

# Cache static files
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Security Headers

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

## Troubleshooting

### Lỗi: "502 Bad Gateway"

```bash
# Kiểm tra containers có chạy không
docker ps

# Kiểm tra Nginx logs
sudo tail -f /var/log/nginx/error.log

# Kiểm tra backend có chạy không
curl http://localhost:8080/health
```

### Lỗi: "SSL certificate problem"

```bash
# Kiểm tra certificate
sudo certbot certificates

# Renew certificate
sudo certbot renew
```

### Lỗi: "DNS not resolved"

```bash
# Kiểm tra DNS
nslookup qrattendance.xyz
dig qrattendance.xyz

# Đợi thêm thời gian nếu DNS chưa propagate
```

## Lưu ý

1. **DNS Propagation**: Có thể mất 5-30 phút để DNS propagate hoàn toàn
2. **Firewall**: Đảm bảo port 80 và 443 đã mở trên Google Cloud Firewall
3. **Backend Port**: Nếu dùng path `/api`, backend sẽ nhận requests không có prefix `/api`
4. **CORS**: Đảm bảo backend cho phép origin `https://qrattendance.xyz`

## Hoàn tất! 🎉

Sau khi hoàn tất, bạn sẽ có:
- ✅ Domain: `https://qrattendance.xyz`
- ✅ HTTPS với SSL certificate tự động renew
- ✅ Frontend và Backend đều có HTTPS
- ✅ Production-ready setup

