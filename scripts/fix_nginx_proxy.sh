#!/bin/bash

# Script để sửa Nginx config proxy từ port 80 sang port 3000

DOMAIN=${1:-qrattendance.xyz}
CONFIG_FILE="/etc/nginx/sites-available/$DOMAIN"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ File config không tồn tại: $CONFIG_FILE"
    exit 1
fi

echo "🔧 Đang sửa Nginx config..."

# Backup config
sudo cp "$CONFIG_FILE" "${CONFIG_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
echo "✅ Đã backup config"

# Sửa proxy_pass từ port 80 sang port 3000
sudo sed -i 's|proxy_pass http://localhost:80;|proxy_pass http://127.0.0.1:3000;|g' "$CONFIG_FILE"
sudo sed -i 's|proxy_pass http://127.0.0.1:80;|proxy_pass http://127.0.0.1:3000;|g' "$CONFIG_FILE"

echo "✅ Đã sửa proxy_pass từ port 80 sang port 3000"

# Test config
echo "🧪 Đang test Nginx config..."
if sudo nginx -t; then
    echo "✅ Config hợp lệ"
    echo "🔄 Đang reload Nginx..."
    sudo systemctl reload nginx
    echo "✅ Hoàn tất!"
else
    echo "❌ Config không hợp lệ!"
    echo "📝 Khôi phục từ backup..."
    sudo cp "${CONFIG_FILE}.backup."* "$CONFIG_FILE" 2>/dev/null
    exit 1
fi

echo ""
echo "📋 Kiểm tra config đã sửa:"
grep -A 2 "proxy_pass" "$CONFIG_FILE" | head -5

