#!/bin/bash

# Script để generate DATABASE_URL với password đã URL encode

if [ ! -f .env.production ]; then
    echo "❌ File .env.production không tồn tại!"
    exit 1
fi

# Đọc các giá trị
source .env.production

POSTGRES_USER=${POSTGRES_USER:-app}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-change_me_secure_password}
POSTGRES_DB=${POSTGRES_DB:-attendance}

# URL encode password
if command -v python3 &> /dev/null; then
    ENCODED_PASSWORD=$(python3 -c "import urllib.parse; print(urllib.parse.quote('${POSTGRES_PASSWORD}', safe=''))")
elif command -v node &> /dev/null; then
    ENCODED_PASSWORD=$(node -e "console.log(encodeURIComponent('${POSTGRES_PASSWORD}'))")
else
    echo "❌ Cần Python3 hoặc Node.js để encode password"
    exit 1
fi

# Tạo DATABASE_URL
DATABASE_URL="postgresql://${POSTGRES_USER}:${ENCODED_PASSWORD}@db:5432/${POSTGRES_DB}"

echo "✅ DATABASE_URL đã được tạo:"
echo "DATABASE_URL=${DATABASE_URL}"
echo ""
echo "📝 Thêm dòng này vào .env.production:"
echo "DATABASE_URL=${DATABASE_URL}"

