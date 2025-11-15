#!/bin/bash

# Script để start Nginx service

echo "🚀 Đang khởi động Nginx..."

# Start Nginx
sudo systemctl start nginx

# Enable auto-start on boot
sudo systemctl enable nginx

# Kiểm tra status
echo ""
echo "📊 Nginx status:"
sudo systemctl status nginx --no-pager -l | head -10

echo ""
echo "✅ Hoàn tất!"

