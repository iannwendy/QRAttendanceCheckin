#!/bin/bash

# Script để fix lỗi 502 Bad Gateway

echo "🔍 Kiểm tra lỗi 502 Bad Gateway..."
echo ""

# Kiểm tra frontend container
echo "📦 Kiểm tra frontend container:"
if docker ps | grep -q qr-attendance-frontend; then
    echo "✅ Frontend container đang chạy"
    docker ps | grep qr-attendance-frontend
else
    echo "❌ Frontend container KHÔNG chạy!"
    echo "🔄 Đang khởi động..."
    cd ~/SOA_QRAttendance
    docker compose -f docker-compose.prod.yml --env-file .env.production up -d frontend
fi
echo ""

# Kiểm tra frontend có lắng nghe trên port 3000 không
echo "🔌 Kiểm tra port 3000:"
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Frontend đang lắng nghe trên port 3000"
else
    echo "❌ Frontend KHÔNG lắng nghe trên port 3000"
    echo "📋 Logs frontend:"
    docker logs qr-attendance-frontend --tail 20
fi
echo ""

# Kiểm tra Nginx config
echo "📝 Kiểm tra Nginx config:"
if [ -f /etc/nginx/sites-available/qrattendance.xyz ]; then
    echo "✅ File config tồn tại"
    echo "🔍 Kiểm tra proxy_pass:"
    grep -A 2 "proxy_pass" /etc/nginx/sites-available/qrattendance.xyz | head -5
else
    echo "❌ File config không tồn tại!"
fi
echo ""

# Kiểm tra Nginx logs
echo "📋 Nginx error logs:"
sudo tail -10 /var/log/nginx/error.log
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💡 Các bước fix:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Đảm bảo frontend container chạy: docker ps | grep frontend"
echo "2. Kiểm tra frontend logs: docker logs qr-attendance-frontend"
echo "3. Kiểm tra Nginx config: sudo nginx -t"
echo "4. Restart Nginx: sudo systemctl restart nginx"
echo ""

