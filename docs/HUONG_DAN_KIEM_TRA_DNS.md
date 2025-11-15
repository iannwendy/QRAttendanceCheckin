# 🔍 Hướng dẫn Kiểm tra và Sửa DNS

## Vấn đề: ERR_NAME_NOT_RESOLVED

Lỗi này xảy ra khi DNS chưa được cấu hình đúng hoặc chưa propagate.

## Bước 1: Kiểm tra DNS Records trên access.pavietnam.vn

1. Đăng nhập vào **access.pavietnam.vn**
2. Vào **Quản Lý Cấu Hình Tên Miền** > **DNS**
3. Kiểm tra có A record cho `qrattendance.xyz`:

### A Record cần có:

| Host | Loại | Giá trị | TTL |
|------|------|---------|-----|
| `@` hoặc để trống | `A` | `34.177.89.245` | `3600` |

### Nếu chưa có, thêm mới:

1. Click **"Thêm bản ghi"** hoặc **"Add record"**
2. Điền:
   - **Host**: `@` hoặc để trống
   - **Loại**: `A`
   - **Giá trị**: `34.177.89.245`
   - **TTL**: `3600`
3. Click **"Lưu cấu hình"** hoặc **"Save"**

## Bước 2: Kiểm tra DNS từ VPS

```bash
# Trên VPS
nslookup qrattendance.xyz
# hoặc
dig qrattendance.xyz

# Kết quả mong đợi: 34.177.89.245
```

## Bước 3: Kiểm tra DNS từ máy local

```bash
# macOS/Linux
nslookup qrattendance.xyz
dig qrattendance.xyz

# Hoặc dùng Google DNS
nslookup qrattendance.xyz 8.8.8.8
dig @8.8.8.8 qrattendance.xyz
```

## Bước 4: Đợi DNS Propagate

DNS có thể mất **5-30 phút** (hoặc lâu hơn) để propagate toàn cầu.

### Kiểm tra từ nhiều DNS servers:

```bash
# Google DNS
dig @8.8.8.8 qrattendance.xyz

# Cloudflare DNS
dig @1.1.1.1 qrattendance.xyz

# OpenDNS
dig @208.67.222.222 qrattendance.xyz
```

## Bước 5: Flush DNS Cache (nếu cần)

### macOS:
```bash
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
```

### Windows:
```cmd
ipconfig /flushdns
```

### Linux:
```bash
sudo systemd-resolve --flush-caches
# hoặc
sudo service network-manager restart
```

## Tạm thời: Dùng IP để test

Nếu DNS chưa propagate nhưng cần test ngay, có thể tạm thời dùng IP:

### Trên VPS, sửa `.env.production`:

```bash
nano .env.production
```

Sửa:
```env
FRONTEND_URL=https://34.177.89.245
VITE_API_BASE=https://34.177.89.245/api/
```

Sau đó rebuild:
```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build frontend
```

### Truy cập bằng IP:
- Frontend: `https://34.177.89.245`
- Backend API: `https://34.177.89.245/api/health`

**Lưu ý**: SSL certificate sẽ báo warning vì certificate được cấp cho domain, không phải IP.

## Troubleshooting

### DNS vẫn không resolve sau 30 phút:

1. **Kiểm tra lại DNS records** trên access.pavietnam.vn
2. **Kiểm tra TTL** - nếu TTL cao, có thể mất thời gian lâu hơn
3. **Liên hệ nhà cung cấp DNS** để kiểm tra
4. **Thử dùng DNS khác** (Google DNS, Cloudflare DNS)

### DNS resolve nhưng website không load:

1. Kiểm tra firewall đã mở port 80 và 443 chưa
2. Kiểm tra Nginx đang chạy: `sudo systemctl status nginx`
3. Kiểm tra containers: `docker ps`

## Kiểm tra nhanh

```bash
# Từ máy local
curl -I https://qrattendance.xyz

# Nếu DNS chưa resolve, sẽ báo lỗi
# Nếu DNS đã resolve, sẽ trả về HTTP headers
```

