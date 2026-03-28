#!/bin/bash

# Script để test và fix Nginx config

echo "🔍 Kiểm tra toàn diện..."
echo ""

# 1. Kiểm tra frontend container
echo "📦 Frontend container:"
if docker ps | grep -q qr-attendance-frontend; then
    echo "✅ Đang chạy"
    docker ps | grep frontend
else
    echo "❌ KHÔNG chạy!"
    exit 1
fi
echo ""

# 2. Test frontend trực tiếp
echo "🔌 Test frontend trực tiếp (port 3000):"
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null)
if [ "$FRONTEND_RESPONSE" = "200" ]; then
    echo "✅ Frontend trả về 200 OK"
    curl -s http://localhost:3000/health
else
    echo "❌ Frontend không phản hồi đúng (HTTP $FRONTEND_RESPONSE)"
    echo "📋 Logs frontend:"
    docker logs qr-attendance-frontend --tail 10
fi
echo ""

# 3. Test qua Nginx HTTP
echo "🌐 Test qua Nginx HTTP (port 80):"
HTTP_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ 2>/dev/null)
echo "HTTP Response: $HTTP_RESPONSE"
if [ "$HTTP_RESPONSE" = "301" ] || [ "$HTTP_RESPONSE" = "302" ]; then
    echo "✅ HTTP redirect đến HTTPS (đúng)"
elif [ "$HTTP_RESPONSE" = "404" ]; then
    echo "⚠️  HTTP trả về 404 (có thể do redirect config)"
else
    echo "❌ HTTP trả về $HTTP_RESPONSE (không mong đợi)"
fi
echo ""

# 4. Test qua Nginx HTTPS
echo "🔒 Test qua Nginx HTTPS (port 443):"
HTTPS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -k https://localhost/ 2>/dev/null)
echo "HTTPS Response: $HTTPS_RESPONSE"
if [ "$HTTPS_RESPONSE" = "200" ]; then
    echo "✅ HTTPS trả về 200 OK"
    # Kiểm tra xem có phải là frontend không
    HTTPS_BODY=$(curl -s -k https://localhost/ 2>/dev/null)
    if echo "$HTTPS_BODY" | grep -q "QR Attendance\|React\|index.html"; then
        echo "✅ Đang serve frontend đúng"
    else
        echo "⚠️  Có thể đang serve default Nginx page"
        echo "📋 Response body (first 200 chars):"
        echo "$HTTPS_BODY" | head -c 200
    fi
else
    echo "❌ HTTPS trả về $HTTPS_RESPONSE"
fi
echo ""

# 5. Kiểm tra Nginx config
echo "📝 Kiểm tra Nginx config:"
if grep -q "proxy_pass http://127.0.0.1:3000" /etc/nginx/sites-available/qrattendance.xyz; then
    echo "✅ Config có proxy_pass đúng"
else
    echo "❌ Config KHÔNG có proxy_pass đúng!"
    echo "🔧 Đang sửa..."
    sudo bash ~/SOA_QRAttendance/scripts/fix_nginx_after_certbot.sh qrattendance.xyz
fi
echo ""

# 6. Restart Nginx để đảm bảo
echo "🔄 Restart Nginx..."
sudo systemctl restart nginx
sleep 2
sudo systemctl status nginx --no-pager -l | head -5
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Hoàn tất kiểm tra!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

