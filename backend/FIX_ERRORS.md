# Hướng dẫn sửa lỗi

Các lỗi TypeScript hiện tại chủ yếu do:
1. Chưa cài đặt dependencies
2. Prisma client chưa được generate

## Các bước để fix:

```bash
cd backend

# 1. Cài đặt dependencies
npm install

# 2. Generate Prisma client (tạo types từ schema)
npm run prisma:generate

# 3. Chạy migrations (nếu chưa có database)
npm run prisma:migrate

# 4. Seed data
npm run prisma:seed
```

Sau khi chạy các lệnh trên, các lỗi TypeScript sẽ biến mất vì:
- Dependencies đã được cài đặt (các modules như @nestjs/common, otplib, etc.)
- Prisma client đã được generate (các properties như `prisma.session`, `prisma.attendance`, etc.)
- Type definitions đã có sẵn (Express.Multer.File, process, etc.)

## Lưu ý:
- Các lỗi về `Cannot find module` sẽ biến mất sau khi `npm install`
- Các lỗi về `Property 'session' does not exist` sẽ biến mất sau khi `prisma generate`
- Các lỗi về `Cannot find name 'process'` sẽ biến mất khi có `@types/node` (đã có trong package.json)

