FROM node:20-bullseye-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Generate Prisma client and build NestJS to production dist
RUN npx prisma generate && npm run build

EXPOSE 8080

# Entrypoint runs migrate + seed then starts the server
RUN chmod +x docker-entrypoint.sh
CMD ["sh", "./docker-entrypoint.sh"]

