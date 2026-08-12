import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import prospectRouter from './routes/prospect';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }));
  app.use(express.json({ limit: '100kb' }));

  app.use(
    rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '900000'),
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? '100'),
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.use('/api', prospectRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}