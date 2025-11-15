#!/bin/bash

# Script cài SSL chỉ cho domain chính (không có www)

DOMAIN=${1:-qrattendance.xyz}

echo "🔒 Đang cài SSL cho domain: $DOMAIN (không có www)"
echo ""

sudo certbot --nginx -d $DOMAIN

echo ""
echo "✅ Hoàn tất!"
echo "🌐 Domain: https://$DOMAIN"

