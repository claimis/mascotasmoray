import { NestFactory } from '@nestjs/core';
import { json } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: 'http://localhost:5173' });
  app.use(json({ limit: '50mb' }));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
