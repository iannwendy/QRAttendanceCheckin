#!/bin/bash

# Script để tạo DATABASE_URL với password đã được URL encode

if [ ! -f .env.production ]; then
    echo "❌ File .env.production không tồn tại!"
    exit 1
fi

# Đọc các giá trị từ .env.production
source .env.production

# URL encode password
# Sử dụng Python hoặc node để encode
if command -v python3 &> /dev/null; then
    ENCODED_PASSWORD=$(python3 -c "import urllib.parse; print(urllib.parse.quote('${POSTGRES_PASSWORD}', safe=''))")
elif command -v node &> /dev/null; then
    ENCODED_PASSWORD=$(node -e "console.log(encodeURIComponent('${POSTGRES_PASSWORD}'))")
else
    echo "❌ Cần Python3 hoặc Node.js để encode password"
    exit 1
fi

# Tạo DATABASE_URL
DATABASE_URL="postgresql://${POSTGRES_USER:-app}:${ENCODED_PASSWORD}@db:5432/${POSTGRES_DB:-attendance}"

echo "🔧 DATABASE_URL đã được encode:"
echo "DATABASE_URL=${DATABASE_URL}"
echo ""
echo "📝 Thêm dòng này vào .env.production hoặc docker-compose.prod.yml"

