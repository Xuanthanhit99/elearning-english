import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import express from 'express';
import helmet from 'helmet';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { getAllowedOrigins } from './config/cors.config';
import { RedisIoAdapter } from './realtime/redis-io.adapter';
import { validateProductionEnvironment } from './config/production-env.validation';

const bootstrapLogger = new Logger('Bootstrap');

// A rejection/exception here previously had no app-level handler at all — Node's
// default behavior is to print a raw stack trace and (for uncaughtException) may
// leave the process in an undefined state without ever logging through Nest's
// logger, so it wouldn't reach normal log aggregation. These don't change what
// happens to the process, only that both are always logged before anything else.
process.on('unhandledRejection', (reason) => {
  bootstrapLogger.error(
    `Unhandled promise rejection: ${reason instanceof Error ? (reason.stack ?? reason.message) : String(reason)}`,
  );
});

process.on('uncaughtException', (error) => {
  bootstrapLogger.error(`Uncaught exception: ${error.stack ?? error.message}`);
});

async function bootstrap() {
  validateProductionEnvironment();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Without this, BullMQ workers/DB connections/websocket clients could be
  // killed mid-operation on every container stop/redeploy instead of being
  // given a chance to drain — this wires SIGTERM/SIGINT to Nest's existing
  // onModuleDestroy/beforeApplicationShutdown lifecycle hooks.
  app.enableShutdownHooks();

  const redisIoAdapter = new RedisIoAdapter(app);
  redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  const allowedOrigins = getAllowedOrigins();

  app.enableCors({
    origin: (origin, callback) => {
      // Cho phép health check, curl hoặc server-to-server không có Origin.
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/+$/, '');

      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      console.error('[CORS] Blocked origin:', origin);

      return callback(
        new Error(`Origin ${origin} is not allowed by CORS`),
        false,
      );
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
      'X-Request-Id',
    ],
    exposedHeaders: ['X-Request-Id'],
  });

  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  // HttpExceptionFilter already read `x-request-id` back out to correlate an
  // error response with a client-supplied ID, but nothing ever generated one
  // — most clients don't send this header, so most requests/logs/errors had
  // no correlation ID at all. This assigns one whenever the client didn't
  // supply it, echoes it on the response, and leaves an already-supplied ID
  // untouched (so a caller's own trace ID still wins).
  app.use((req, res, next) => {
    const incoming = req.headers['x-request-id'];
    const requestId =
      typeof incoming === 'string' && incoming.trim() ? incoming : randomUUID();
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
  });

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  const port = Number(process.env.PORT || 3002);

  await app.listen(port, '0.0.0.0');

  bootstrapLogger.log(`Backend is listening on 0.0.0.0:${port}`);
}
bootstrap().catch((error) => {
  bootstrapLogger.error(
    `Bootstrap failed: ${
      error instanceof Error ? (error.stack ?? error.message) : String(error)
    }`,
  );

  process.exit(1);
});
