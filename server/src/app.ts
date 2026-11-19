import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import { initDatabase } from './db.js';
import { seedIfEmpty } from './seed.js';
import { authRouter } from './routes/auth.js';
import { contentRouter } from './routes/content.js';
import { practiceRouter } from './routes/practice.js';
import { examsRouter } from './routes/exams.js';
import { syncRouter } from './routes/sync.js';
import { teacherRouter } from './routes/teacher.js';
import { adminRouter } from './routes/admin.js';

export const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Ensure pure-JS SQLite (sql.js) is initialized & seeded before any route runs
app.use(async (_req: Request, _res: Response, next: NextFunction) => {
  try {
    await initDatabase(seedIfEmpty);
    next();
  } catch (err) {
    next(err);
  }
});

const apiRouter = express.Router();

apiRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'VidyaSetu API',
    engine: 'sql.js',
    runtime: process.env.VERCEL ? 'vercel-serverless' : 'node-server',
    timestamp: new Date().toISOString(),
  });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/content', contentRouter);
apiRouter.use('/practice', practiceRouter);
apiRouter.use('/exams', examsRouter);
apiRouter.use('/sync', syncRouter);
apiRouter.use('/teacher', teacherRouter);
apiRouter.use('/admin', adminRouter);

app.use('/api', apiRouter);
if (process.env.VERCEL) {
  app.use('/', apiRouter);
}

// Global JSON error handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : 'Internal server error';
  console.error('[VidyaSetu API Error]', err);
  res.status(500).json({ error: message });
});

export default app;
