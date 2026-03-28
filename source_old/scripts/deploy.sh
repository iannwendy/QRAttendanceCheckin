#!/bin/bash

# Script triển khai QR Attendance lên VPS
# Sử dụng: ./deploy.sh

set -e

echo "🚀 Bắt đầu triển khai QR Attendance..."

# Kiểm tra file .env.production
if [ ! -f .env.production ]; then
    echo "❌ File .env.production không tồn tại!"
    echo "📝 Tạo file .env.production từ template..."
    cp env.production.example .env.production
    echo "⚠️  Vui lòng chỉnh sửa .env.production với các giá trị phù hợp trước khi tiếp tục!"
    echo "   Đặc biệt quan trọng: POSTGRES_PASSWORD, JWT_SECRET, FRONTEND_URL, VITE_API_BASE"
    exit 1
fi

# Kiểm tra Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker chưa được cài đặt!"
    echo "📦 Đang cài đặt Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo "✅ Docker đã được cài đặt. Vui lòng logout và login lại, sau đó chạy lại script này."
    exit 1
fi

# Kiểm tra Docker Compose
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose chưa được cài đặt!"
    echo "📦 Đang cài đặt Docker Compose..."
    sudo apt install docker-compose-plugin -y
fi

echo "📦 Đang build và khởi động containers..."
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

echo "⏳ Đợi services khởi động..."
sleep 10

echo "🔍 Kiểm tra trạng thái services..."
docker compose -f docker-compose.prod.yml ps

echo ""
echo "✅ Triển khai hoàn tất!"
echo ""
echo "📊 Xem logs:"
echo "   docker compose -f docker-compose.prod.yml logs -f"
echo ""
echo "🌐 Truy cập ứng dụng:"
echo "   Frontend: http://$(hostname -I | awk '{print $1}')"
echo "   Backend API: http://$(hostname -I | awk '{print $1}'):8080"
echo ""
echo "💡 Lưu ý: Nếu bạn có domain, cập nhật FRONTEND_URL và VITE_API_BASE trong .env.production"

