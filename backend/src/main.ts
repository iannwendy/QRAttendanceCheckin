import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS
  const allowedOrigins = [
    'http://localhost:3000', // For local development
  ];

  const frontendUrl = process.env.FRONTEND_URL;
  if (frontendUrl) {
    allowedOrigins.push(frontendUrl);
    // Also allow HTTPS version if FRONTEND_URL is HTTP
    if (frontendUrl.startsWith('http://')) {
      allowedOrigins.push(frontendUrl.replace('http://', 'https://'));
    }
    // Also allow HTTP version if FRONTEND_URL is HTTPS (for development)
    if (frontendUrl.startsWith('https://')) {
      allowedOrigins.push(frontendUrl.replace('https://', 'http://'));
    }
  }

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // Allow localhost
      if (
        origin.startsWith('http://localhost:') ||
        origin.startsWith('https://localhost:')
      ) {
        return callback(null, true);
      }

      // Allow all serveo.net subdomains
      if (origin.includes('.serveo.net')) {
        return callback(null, true);
      }

      // Allow all LocalXpose (loclx.io) subdomains
      if (origin.includes('.loclx.io')) {
        return callback(null, true);
      }

      // Check if origin exactly matches or is in allowed list
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 8080;
  await app.listen(port);
  console.log(`🚀 Backend running on http://localhost:${port}`);
}
bootstrap();
