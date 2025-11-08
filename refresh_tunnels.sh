#!/usr/bin/env bash

set -euo pipefail

# This script:
# 1) Stops any existing LocalXpose tunnels for frontend (3000) and backend (8080)
# 2) Starts fresh LocalXpose tunnels and captures the new URLs
# 3) Updates docker-compose.yml:
#      - FRONTEND_URL (backend service) => points to the frontend tunnel URL
#      - VITE_API_BASE (frontend service) => points to the backend tunnel URL
#
# Requirements:
# - loclx installed and on PATH (LocalXpose)
# - macOS (BSD sed). For Linux GNU sed, adjust the `sed -i` args accordingly.

cd "$(dirname "$0")"

# Resolve LocalXpose binary (env override > local file > PATH)
LOCXLX_BIN=${LOCXLX_BIN:-}
if [[ -n "$LOCXLX_BIN" && -x "$LOCXLX_BIN" ]]; then
  :
elif [[ -x ./loclx ]]; then
  LOCXLX_BIN="./loclx"
elif command -v loclx >/dev/null 2>&1; then
  LOCXLX_BIN="loclx"
else
  echo "ERROR: LocalXpose (loclx) not found. Set LOCXLX_BIN to its path, place 'loclx' in this folder, or install it to PATH." >&2
  echo "Download: https://localxpose.io/download and ensure 'loclx' is executable." >&2
  exit 1
fi

echo "Stopping existing LocalXpose tunnels (if any)..."
pkill -f "loclx.*127.0.0.1:3000" >/dev/null 2>&1 || true
pkill -f "loclx.*127.0.0.1:8080" >/dev/null 2>&1 || true
pkill -x loclx >/dev/null 2>&1 || true

echo "Clearing old tunnel logs..."
rm -f frontend_tunnel.log backend_tunnel.log frontend_serveo.log backend_serveo.log frontend_localxpose.log backend_localxpose.log

echo "Starting new LocalXpose tunnels..."
# Frontend (3000)
"$LOCXLX_BIN" tunnel http --to 127.0.0.1:3000 > frontend_localxpose.log 2>&1 &
sleep 2
# Backend (8080)
"$LOCXLX_BIN" tunnel http --to 127.0.0.1:8080 > backend_localxpose.log 2>&1 &
sleep 3

echo "Waiting for LocalXpose URLs..."
FRONTEND_TUNNEL=""
BACKEND_TUNNEL=""
# LocalXpose outputs: "2025/11/07 20:54:49 (http, us) w35mhcucwa.loclx.io => [running]"
# We need to extract the subdomain.loclx.io part and add https://
for i in {1..60}; do
  [[ -f frontend_localxpose.log ]] || { sleep 1; continue; }
  [[ -f backend_localxpose.log ]] || { sleep 1; continue; }
  # Extract subdomain.loclx.io from log lines (format: "... (http, us) w35mhcucwa.loclx.io => [running]")
  FRONTEND_DOMAIN=$(grep -oE '[a-z0-9]+\.loclx\.io' frontend_localxpose.log | head -1 || true)
  BACKEND_DOMAIN=$(grep -oE '[a-z0-9]+\.loclx\.io' backend_localxpose.log | head -1 || true)
  if [[ -n "$FRONTEND_DOMAIN" ]]; then
    FRONTEND_TUNNEL="https://$FRONTEND_DOMAIN"
  fi
  if [[ -n "$BACKEND_DOMAIN" ]]; then
    BACKEND_TUNNEL="https://$BACKEND_DOMAIN"
  fi
  if [[ -n "$FRONTEND_TUNNEL" && -n "$BACKEND_TUNNEL" ]]; then
    break
  fi
  sleep 1
done

if [[ -z "$FRONTEND_TUNNEL" || -z "$BACKEND_TUNNEL" ]]; then
  echo "ERROR: Could not determine new LocalXpose URLs from logs." >&2
  echo "Check loclx is installed and logged in, then re-run this script." >&2
  exit 1
fi

echo "New LocalXpose tunnels detected:"
echo "  FRONTEND: $FRONTEND_TUNNEL"
echo "  BACKEND : $BACKEND_TUNNEL"

compose_file="docker-compose.yml"
if [[ ! -f "$compose_file" ]]; then
  echo "ERROR: $compose_file not found." >&2
  exit 1
fi

echo "Updating $compose_file..."
# Update FRONTEND_URL line
sed -i '' -E "s|^([[:space:]]*FRONTEND_URL:) .*|\1 $FRONTEND_TUNNEL|" "$compose_file"
# Update VITE_API_BASE line
sed -i '' -E "s|^([[:space:]]*VITE_API_BASE:) .*|\1 $BACKEND_TUNNEL|" "$compose_file"

echo "Updated lines:"
grep -nE 'FRONTEND_URL:|VITE_API_BASE:' "$compose_file" || true

echo "Verifying docker-compose.yml updates..."
if ! grep -q "FRONTEND_URL: $FRONTEND_TUNNEL" "$compose_file"; then
  echo "ERROR: FRONTEND_URL was not updated correctly in $compose_file. Skipping Docker restart." >&2
  exit 1
fi
if ! grep -q "VITE_API_BASE: $BACKEND_TUNNEL" "$compose_file"; then
  echo "ERROR: VITE_API_BASE was not updated correctly in $compose_file. Skipping Docker restart." >&2
  exit 1
fi

echo "docker-compose.yml updated successfully. Reloading Docker containers..."
if command -v docker >/dev/null 2>&1; then
  if docker compose version >/dev/null 2>&1; then
    docker compose up -d || true
  else
    docker-compose up -d || true
  fi
else
  echo "Docker not found in PATH; skipping container reload." >&2
  exit 1
fi

echo "All done."


