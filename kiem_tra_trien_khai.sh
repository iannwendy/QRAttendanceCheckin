#!/bin/bash

echo "🔍 Kiểm tra triển khai QR Attendance..."
echo ""

# Kiểm tra containers
echo "📦 Containers đang chạy:"
docker ps --filter "name=qr-attendance" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

# Kiểm tra health
echo "🏥 Health checks:"
echo -n "Frontend: "
curl -s http://localhost/health 2>/dev/null && echo "✅" || echo "❌"

echo -n "Backend: "
curl -s http://localhost:8080/health 2>/dev/null && echo "✅" || echo "❌"
echo ""

# Kiểm tra logs (5 dòng cuối)
echo "📋 Logs gần đây:"
echo ""
echo "=== Backend ==="
docker logs qr-attendance-backend --tail 5 2>&1
echo ""
echo "=== Frontend ==="
docker logs qr-attendance-frontend --tail 5 2>&1
echo ""
echo "=== Database ==="
docker logs qr-attendance-db --tail 3 2>&1
echo ""

# Thông tin truy cập
VPS_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ifconfig.co 2>/dev/null || echo "YOUR_VPS_IP")

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Thông tin truy cập:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Frontend: http://$VPS_IP"
echo "Backend API: http://$VPS_IP:8080"
echo "Health Check: http://$VPS_IP:8080/health"
echo ""
echo "💡 Lưu ý: Đảm bảo đã mở firewall cho port 80 và 8080 trên Google Cloud"
echo ""

