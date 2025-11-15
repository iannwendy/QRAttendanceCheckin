#!/bin/bash

echo "🔐 Tạo password mới cho database..."
echo ""

# Tạo password mới (chỉ chữ, số, không có ký tự đặc biệt)
NEW_PASSWORD=$(openssl rand -base64 16 | tr -d '/+=' | head -c 20)

echo "✅ Password mới: $NEW_PASSWORD"
echo ""
echo "📝 Cập nhật .env.production:"
echo "POSTGRES_PASSWORD=$NEW_PASSWORD"
echo ""
echo "Sau đó restart backend:"
echo "docker compose -f docker-compose.prod.yml restart backend"

