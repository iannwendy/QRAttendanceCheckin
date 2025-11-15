#!/bin/bash

# Script để tạo file .env.production từ template
# Sử dụng: ./setup_env.sh

set -e

echo "🔧 Thiết lập file .env.production..."

# Kiểm tra file template
if [ ! -f env.production.example ]; then
    echo "❌ File env.production.example không tồn tại!"
    exit 1
fi

# Copy template
cp env.production.example .env.production

echo "✅ Đã tạo file .env.production từ template"
echo ""
echo "📝 Bây giờ bạn cần chỉnh sửa file .env.production"
echo ""
echo "Các cách chỉnh sửa:"
echo ""
echo "1. Cài nano và chỉnh sửa:"
echo "   sudo apt update && sudo apt install -y nano"
echo "   nano .env.production"
echo ""
echo "2. Dùng vi (có sẵn):"
echo "   vi .env.production"
echo "   (Nhấn 'i' để vào insert mode, ESC để thoát, ':wq' để save)"
echo ""
echo "3. Dùng echo để set từng biến:"
echo "   echo 'POSTGRES_PASSWORD=your_password' >> .env.production"
echo ""
echo "⚠️  QUAN TRỌNG: Cần cập nhật các giá trị sau:"
echo "   - POSTGRES_PASSWORD"
echo "   - JWT_SECRET"
echo "   - FRONTEND_URL"
echo "   - VITE_API_BASE"
echo ""

