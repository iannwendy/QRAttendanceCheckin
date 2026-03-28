#!/bin/bash

echo "🔍 Kiểm tra Backend API..."
echo ""

# Kiểm tra container backend
echo "📦 Container Backend:"
docker ps --filter "name=qr-attendance-backend" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

# Kiểm tra backend có đang chạy không
if docker ps | grep -q qr-attendance-backend; then
    echo "✅ Container backend đang chạy"
else
    echo "❌ Container backend KHÔNG chạy!"
    echo "Kiểm tra logs:"
    docker logs qr-attendance-backend --tail 20
    exit 1
fi

# Kiểm tra port 8080 trong container
echo ""
echo "🔌 Kiểm tra port 8080 trong container:"
docker exec qr-attendance-backend netstat -tlnp 2>/dev/null | grep 8080 || docker exec qr-attendance-backend ss -tlnp 2>/dev/null | grep 8080 || echo "⚠️  Không thể kiểm tra port (cần quyền root)"
echo ""

# Kiểm tra từ bên trong container
echo "🏥 Health check từ trong container:"
docker exec qr-attendance-backend wget -q -O- http://localhost:8080/health 2>/dev/null && echo "✅ Backend hoạt động từ trong container" || echo "❌ Backend không phản hồi từ trong container"
echo ""

# Kiểm tra từ host
echo "🌐 Health check từ host:"
curl -s http://localhost:8080/health && echo "✅ Backend hoạt động từ host" || echo "❌ Backend không phản hồi từ host"
echo ""

# Kiểm tra từ bên ngoài (nếu có internet)
VPS_IP=$(curl -s ifconfig.me 2>/dev/null || echo "34.177.89.245")
echo "🌍 Health check từ bên ngoài (http://$VPS_IP:8080/health):"
curl -s --max-time 5 http://$VPS_IP:8080/health && echo "✅ Backend có thể truy cập từ bên ngoài" || echo "❌ Backend KHÔNG thể truy cập từ bên ngoài (có thể do firewall)"
echo ""

# Kiểm tra logs
echo "📋 Logs backend (10 dòng cuối):"
docker logs qr-attendance-backend --tail 10
echo ""

# Kiểm tra firewall
echo "🔥 Kiểm tra firewall (nếu có quyền):"
if command -v ufw &> /dev/null; then
    sudo ufw status | grep 8080 || echo "⚠️  UFW không thấy rule cho port 8080"
elif command -v iptables &> /dev/null; then
    sudo iptables -L -n | grep 8080 || echo "⚠️  iptables không thấy rule cho port 8080"
else
    echo "ℹ️  Không tìm thấy firewall tool (có thể dùng Google Cloud Firewall)"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💡 Gợi ý:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Nếu backend không chạy: docker compose -f docker-compose.prod.yml restart backend"
echo "2. Nếu backend chạy nhưng không truy cập được từ ngoài: Mở firewall port 8080 trên Google Cloud"
echo "3. Xem logs chi tiết: docker logs qr-attendance-backend -f"
echo ""

