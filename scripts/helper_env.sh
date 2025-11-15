#!/bin/bash

# Script helper để tạo các giá trị cho .env.production

echo "🔧 Helper để tạo giá trị cho .env.production"
echo ""

# Lấy IP của VPS
VPS_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ifconfig.co 2>/dev/null || echo "YOUR_VPS_IP")

echo "📌 IP của VPS: $VPS_IP"
echo ""

# Tạo JWT_SECRET ngẫu nhiên
if command -v openssl &> /dev/null; then
    JWT_SECRET=$(openssl rand -base64 32 | tr -d '\n')
    echo "🔑 JWT_SECRET được tạo:"
    echo "$JWT_SECRET"
    echo ""
else
    echo "⚠️  openssl không có sẵn, bạn cần tạo JWT_SECRET thủ công (ít nhất 32 ký tự)"
    JWT_SECRET="your_jwt_secret_here_min_32_chars"
fi

# Tạo POSTGRES_PASSWORD ngẫu nhiên
if command -v openssl &> /dev/null; then
    DB_PASSWORD=$(openssl rand -base64 16 | tr -d '\n' | tr -d '/')
    echo "🗄️  POSTGRES_PASSWORD được tạo:"
    echo "$DB_PASSWORD"
    echo ""
else
    echo "⚠️  openssl không có sẵn, bạn cần tạo POSTGRES_PASSWORD thủ công"
    DB_PASSWORD="change_me_secure_password_here"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Các giá trị bạn cần copy vào .env.production:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "POSTGRES_PASSWORD=$DB_PASSWORD"
echo "JWT_SECRET=$JWT_SECRET"
echo "FRONTEND_URL=http://$VPS_IP"
echo "VITE_API_BASE=http://$VPS_IP:8080"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 Cách sử dụng:"
echo "   1. Copy các giá trị trên"
echo "   2. Mở file .env.production: nano .env.production"
echo "   3. Thay thế các giá trị tương ứng"
echo ""

