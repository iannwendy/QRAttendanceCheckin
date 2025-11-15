#!/bin/bash

# Script để rebuild frontend với HTTPS config

echo "🔧 Rebuild frontend với HTTPS config..."
echo ""

# Kiểm tra .env.production
if [ ! -f .env.production ]; then
    echo "❌ File .env.production không tồn tại!"
    exit 1
fi

echo "📋 Kiểm tra config hiện tại:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
grep -E "FRONTEND_URL|VITE_API_BASE" .env.production
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Kiểm tra format
VITE_API_BASE=$(grep "^VITE_API_BASE=" .env.production | cut -d'=' -f2- | tr -d '"' | tr -d "'" | tr -d ' ')

if [[ "$VITE_API_BASE" != "https://qrattendance.xyz/api/" ]]; then
    echo "⚠️  VITE_API_BASE chưa đúng, đang sửa..."
    sed -i 's|^VITE_API_BASE=.*|VITE_API_BASE=https://qrattendance.xyz/api/|' .env.production
    sed -i 's|^FRONTEND_URL=.*|FRONTEND_URL=https://qrattendance.xyz|' .env.production
    echo "✅ Đã sửa config"
    echo ""
    echo "📋 Config sau khi sửa:"
    grep -E "FRONTEND_URL|VITE_API_BASE" .env.production
    echo ""
fi

# Dừng frontend
echo "⏹️  Dừng frontend container..."
docker compose -f docker-compose.prod.yml stop frontend

# Xóa container và image cũ
echo "🗑️  Xóa container và image cũ..."
docker compose -f docker-compose.prod.yml rm -f frontend
docker rmi soa_qrattendance-frontend 2>/dev/null || true

# Build lại với config mới
echo "🔨 Đang build lại frontend với config mới..."
docker compose -f docker-compose.prod.yml --env-file .env.production build --no-cache frontend

# Start frontend
echo "🚀 Đang khởi động frontend..."
docker compose -f docker-compose.prod.yml --env-file .env.production up -d frontend

# Đợi container start
echo "⏳ Đợi container khởi động..."
sleep 5

# Kiểm tra
echo "🔍 Kiểm tra frontend:"
docker ps | grep frontend

echo ""
echo "🧪 Test frontend:"
curl -s http://localhost:3000/health && echo ""

echo ""
echo "✅ Hoàn tất!"
echo ""
echo "🌐 Truy cập: https://qrattendance.xyz"
echo "📝 Lưu ý: Xóa cache trình duyệt (Ctrl+Shift+R hoặc Cmd+Shift+R) để load frontend mới"

