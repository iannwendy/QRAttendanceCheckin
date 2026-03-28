#!/bin/bash

# Script để kiểm tra DNS resolution

DOMAIN=${1:-qrattendance.xyz}

echo "🔍 Kiểm tra DNS cho domain: $DOMAIN"
echo ""

# Kiểm tra từ VPS
echo "📡 Kiểm tra từ VPS:"
if command -v host &> /dev/null; then
    host $DOMAIN
elif command -v getent &> /dev/null; then
    getent hosts $DOMAIN
elif command -v ping &> /dev/null; then
    echo "⚠️  Không có công cụ DNS, đang cài đặt..."
    sudo apt update && sudo apt install -y dnsutils
    host $DOMAIN
else
    echo "❌ Không có công cụ DNS. Cài đặt: sudo apt install -y dnsutils"
fi
echo ""

# Kiểm tra từ public DNS (nếu có dig)
echo "🌐 Kiểm tra từ Google DNS (8.8.8.8):"
if command -v dig &> /dev/null; then
    dig @8.8.8.8 $DOMAIN +short
elif command -v host &> /dev/null; then
    host $DOMAIN 8.8.8.8
else
    echo "⚠️  Cài đặt dnsutils để kiểm tra: sudo apt install -y dnsutils"
fi
echo ""

# Kiểm tra từ Cloudflare DNS (1.1.1.1)
echo "🌐 Kiểm tra từ Cloudflare DNS (1.1.1.1):"
if command -v dig &> /dev/null; then
    dig @1.1.1.1 $DOMAIN +short
elif command -v host &> /dev/null; then
    host $DOMAIN 1.1.1.1
fi
echo ""

# Test kết nối
echo "🔌 Test kết nối HTTPS:"
if curl -s -o /dev/null -w "%{http_code}" --max-time 5 https://$DOMAIN > /dev/null 2>&1; then
    echo "✅ HTTPS hoạt động"
    curl -I https://$DOMAIN 2>/dev/null | head -3
else
    echo "❌ HTTPS không kết nối được"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💡 Lưu ý:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Nếu DNS chưa resolve, đợi thêm 10-30 phút"
echo "2. Kiểm tra DNS records trên access.pavietnam.vn"
echo "3. Thử flush DNS cache trên máy local:"
echo "   - macOS: sudo dscacheutil -flushcache"
echo "   - Windows: ipconfig /flushdns"
echo ""

