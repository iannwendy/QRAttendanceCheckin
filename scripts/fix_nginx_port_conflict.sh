#!/bin/bash

# Script để fix conflict port 80 giữa các Nginx processes

echo "🔍 Đang kiểm tra các Nginx processes..."

# Tìm tất cả Nginx processes
NGINX_PIDS=$(ps aux | grep nginx | grep -v grep | awk '{print $2}')

if [ -z "$NGINX_PIDS" ]; then
    echo "✅ Không có Nginx process nào đang chạy"
    exit 0
fi

echo "📋 Các Nginx processes đang chạy:"
ps aux | grep nginx | grep -v grep

echo ""
echo "🔍 Kiểm tra port 80:"
sudo ss -tlnp | grep :80 || echo "Port 80 không bị chiếm"

echo ""
read -p "Bạn có muốn kill tất cả Nginx processes và restart? (y/n): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🛑 Đang dừng tất cả Nginx processes..."
    
    # Stop systemd nginx service
    sudo systemctl stop nginx 2>/dev/null || true
    
    # Kill tất cả nginx processes
    for pid in $NGINX_PIDS; do
        echo "Killing process $pid"
        sudo kill -9 $pid 2>/dev/null || true
    done
    
    sleep 2
    
    echo "✅ Đã dừng tất cả Nginx processes"
    echo ""
    echo "🚀 Đang khởi động lại Nginx service..."
    sudo systemctl start nginx
    sudo systemctl status nginx --no-pager -l | head -10
else
    echo "❌ Đã hủy"
    exit 1
fi

