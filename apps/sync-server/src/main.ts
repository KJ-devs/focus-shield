import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);

  const corsOrigins = process.env["CORS_ORIGINS"] ?? "http://localhost:1420";
  app.enableCors({
    origin: corsOrigins.split(",").map((origin) => origin.trim()),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = parseInt(process.env["PORT"] ?? "3001", 10);
  await app.listen(port);

  logger.log(`Focus Shield sync server running on port ${port}`);
  logger.log(`CORS enabled for: ${corsOrigins}`);
}

void bootstrap();
