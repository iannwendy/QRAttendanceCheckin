#!/bin/bash

echo "🔍 Kiểm tra Docker installation..."

# Kiểm tra Docker
if command -v docker &> /dev/null; then
    echo "✅ Docker đã được cài đặt!"
    docker --version
else
    echo "❌ Docker chưa được cài đặt"
fi

# Kiểm tra Docker Compose
if docker compose version &> /dev/null 2>&1; then
    echo "✅ Docker Compose đã được cài đặt!"
    docker compose version
else
    echo "❌ Docker Compose chưa được cài đặt"
fi

# Kiểm tra Docker service
if systemctl is-active --quiet docker; then
    echo "✅ Docker service đang chạy"
else
    echo "⚠️  Docker service chưa chạy, đang khởi động..."
    sudo systemctl start docker
    sudo systemctl enable docker
fi

# Kiểm tra quyền user
if groups | grep -q docker; then
    echo "✅ User đã có quyền Docker"
else
    echo "⚠️  User chưa có quyền Docker"
    echo "   Chạy: sudo usermod -aG docker \$USER"
    echo "   Sau đó logout và login lại"
fi

echo ""
echo "🧪 Test Docker:"
docker run hello-world 2>&1 | head -5

