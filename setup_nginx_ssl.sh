#!/bin/bash

# Script tự động cài đặt Nginx và SSL cho domain

set -e

DOMAIN=${1:-qrattendance.xyz}
VPS_IP=${2:-34.177.89.245}

echo "🌐 Cài đặt Nginx và SSL cho domain: $DOMAIN"
echo ""

# Kiểm tra quyền root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Vui lòng chạy với sudo"
    exit 1
fi

# Bước 1: Cài đặt Nginx
echo "📦 Đang cài đặt Nginx..."
apt update
apt install -y nginx

# Bước 2: Tạo cấu hình Nginx
echo "📝 Đang tạo cấu hình Nginx..."
cat > /etc/nginx/sites-available/$DOMAIN <<EOF
# Frontend
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8080/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Handle /api without trailing slash
    location = /api {
        return 301 /api/;
    }
}
EOF

# Enable site
echo "🔗 Đang enable site..."
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test cấu hình
echo "🧪 Đang test cấu hình Nginx..."
nginx -t

# Start và enable Nginx
echo "🚀 Đang khởi động Nginx..."
systemctl start nginx
systemctl enable nginx

# Kiểm tra status
systemctl status nginx --no-pager -l | head -5

echo "✅ Nginx đã được cài đặt và cấu hình"
echo ""

# Bước 3: Cài đặt Certbot
echo "🔒 Đang cài đặt Certbot..."
apt install -y certbot python3-certbot-nginx

# Bước 4: Cài đặt SSL
echo "📜 Đang cài đặt SSL certificate..."
echo "⚠️  Bạn sẽ được hỏi email và có thể chọn redirect HTTP -> HTTPS"
certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect

echo ""
echo "✅ Hoàn tất!"
echo ""
echo "🌐 Domain: https://$DOMAIN"
echo "🔒 SSL đã được cài đặt và tự động renew"
echo ""
echo "📝 Bước tiếp theo:"
echo "   1. Cập nhật .env.production với FRONTEND_URL=https://$DOMAIN"
echo "   2. Restart containers: docker compose restart"

