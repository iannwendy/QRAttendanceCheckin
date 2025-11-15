#!/bin/bash

# Script để fix HTTP redirect sang HTTPS

DOMAIN=${1:-qrattendance.xyz}
CONFIG_FILE="/etc/nginx/sites-available/$DOMAIN"

echo "🔧 Đang sửa HTTP redirect..."

# Backup
sudo cp "$CONFIG_FILE" "${CONFIG_FILE}.backup.$(date +%Y%m%d_%H%M%S)"

# Đọc config hiện tại
CURRENT_CONFIG=$(cat "$CONFIG_FILE")

# Kiểm tra xem HTTP block có đúng không
if echo "$CURRENT_CONFIG" | grep -q "return 404"; then
    echo "⚠️  Tìm thấy 'return 404' trong HTTP block, đang sửa..."
    
    # Tạo config mới với HTTP redirect đúng
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
    echo "✅ Đã sửa HTTP block để redirect đúng"
else
    echo "✅ HTTP block đã đúng"
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
echo "📋 Test HTTP redirect:"
curl -I http://localhost/ 2>/dev/null | head -5

