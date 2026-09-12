import { NestFactory } from '@nestjs/core';
import { json } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const allowedOrigins = (process.env.FRONTEND_URL ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim());
  app.enableCors({ origin: allowedOrigins });
  app.use(json({ limit: '50mb' }));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
