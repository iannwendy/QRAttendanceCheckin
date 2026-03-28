#!/bin/bash

# Script để fix Nginx config sau khi Certbot deploy SSL

DOMAIN=${1:-qrattendance.xyz}
CONFIG_FILE="/etc/nginx/sites-available/$DOMAIN"

echo "🔍 Kiểm tra Nginx config sau khi Certbot..."

if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ File config không tồn tại: $CONFIG_FILE"
    exit 1
fi

echo "📋 Config hiện tại:"
cat "$CONFIG_FILE"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Đang sửa config..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Backup
sudo cp "$CONFIG_FILE" "${CONFIG_FILE}.backup.$(date +%Y%m%d_%H%M%S)"

# Kiểm tra xem có proxy_pass chưa
if ! grep -q "proxy_pass http://127.0.0.1:3000" "$CONFIG_FILE"; then
    echo "⚠️  Không tìm thấy proxy_pass đúng, đang sửa..."
    
    # Tạo config mới với SSL và proxy đúng
    sudo tee "$CONFIG_FILE" > /dev/null <<EOF
# HTTP server - redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;
    
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    # SSL configuration (Certbot managed)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
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
    echo "✅ Đã tạo lại config với proxy_pass đúng"
else
    echo "✅ Config đã có proxy_pass đúng"
    
    # Chỉ đảm bảo proxy_pass đúng port
    sudo sed -i 's|proxy_pass http://localhost:80;|proxy_pass http://127.0.0.1:3000;|g' "$CONFIG_FILE"
    sudo sed -i 's|proxy_pass http://127.0.0.1:80;|proxy_pass http://127.0.0.1:3000;|g' "$CONFIG_FILE"
    echo "✅ Đã đảm bảo proxy_pass đúng port 3000"
fi

# Test config
echo ""
echo "🧪 Đang test config..."
if sudo nginx -t; then
    echo "✅ Config hợp lệ"
    echo "🔄 Đang reload Nginx..."
    sudo systemctl reload nginx
    echo "✅ Hoàn tất!"
else
    echo "❌ Config không hợp lệ!"
    exit 1
fi

echo ""
echo "📋 Config sau khi sửa:"
grep -A 3 "proxy_pass" "$CONFIG_FILE" | head -10

