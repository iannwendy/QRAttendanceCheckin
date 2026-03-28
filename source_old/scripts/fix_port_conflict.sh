#!/bin/bash

# Script để fix port conflict giữa Nginx và Docker container

echo "🔧 Đang fix port conflict..."

# Dừng frontend container để giải phóng port 80
echo "⏹️  Dừng frontend container..."
cd ~/SOA_QRAttendance
docker compose -f docker-compose.prod.yml stop frontend

# Pull code mới (nếu chưa có)
echo "📥 Pull code mới..."
git pull

# Rebuild và start với cấu hình mới (frontend trên port 3000)
echo "🔄 Rebuild và start containers..."
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

echo "✅ Hoàn tất!"
echo ""
echo "📝 Bây giờ bạn có thể chạy lại Certbot:"
echo "   sudo certbot --nginx -d qrattendance.xyz -d www.qrattendance.xyz"

