#!/bin/bash

# Script để kiểm tra và sửa .env.production

echo "🔍 Kiểm tra .env.production..."
echo ""

if [ ! -f .env.production ]; then
    echo "❌ File .env.production không tồn tại!"
    exit 1
fi

echo "📋 Nội dung hiện tại:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
grep -E "FRONTEND_URL|VITE_API_BASE" .env.production
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Kiểm tra format
WRONG_FORMAT=false

if grep -q "VITE_API_BASE=.*VITE_API_BASE" .env.production; then
    echo "❌ Tìm thấy format sai: VITE_API_BASE chứa chính nó"
    WRONG_FORMAT=true
fi

if grep -q "^VITE_API_BASE=https://qrattendance.xyz/api/\$" .env.production || grep -q "^VITE_API_BASE=https://qrattendance.xyz/api/ " .env.production; then
    echo "✅ Format có vẻ đúng"
else
    echo "⚠️  Kiểm tra format VITE_API_BASE..."
    VITE_VALUE=$(grep "^VITE_API_BASE=" .env.production | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    echo "Giá trị hiện tại: '$VITE_VALUE'"
    
    if [[ "$VITE_VALUE" == *"VITE_API_BASE"* ]]; then
        echo "❌ Format sai: chứa 'VITE_API_BASE' trong giá trị"
        WRONG_FORMAT=true
    fi
fi

if [ "$WRONG_FORMAT" = true ]; then
    echo ""
    echo "🔧 Đang sửa format..."
    
    # Backup
    cp .env.production .env.production.backup.$(date +%Y%m%d_%H%M%S)
    
    # Sửa VITE_API_BASE
    sed -i 's|^VITE_API_BASE=.*|VITE_API_BASE=https://qrattendance.xyz/api/|' .env.production
    
    # Sửa FRONTEND_URL
    sed -i 's|^FRONTEND_URL=.*|FRONTEND_URL=https://qrattendance.xyz|' .env.production
    
    echo "✅ Đã sửa format"
    echo ""
    echo "📋 Nội dung sau khi sửa:"
    grep -E "FRONTEND_URL|VITE_API_BASE" .env.production
fi

echo ""
echo "💡 Lưu ý: Sau khi sửa, cần rebuild frontend:"
echo "   docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build frontend"

