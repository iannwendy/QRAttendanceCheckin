#!/bin/sh
set -e

echo "Running Prisma migrate deploy..."
npx prisma migrate deploy || echo "migrate deploy failed or no migrations to apply"

echo "Seeding database (idempotent)..."
npx prisma db seed || echo "seed failed (might already be seeded)"

echo "Starting NestJS..."
node dist/src/main.js
