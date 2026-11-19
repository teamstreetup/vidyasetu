import express from 'express';
import cors from 'cors';
import { initSchema } from './db.js';
import { seedIfEmpty } from './seed.js';
import { authRouter } from './routes/auth.js';
import { contentRouter } from './routes/content.js';
import { practiceRouter } from './routes/practice.js';
import { examsRouter } from './routes/exams.js';
import { syncRouter } from './routes/sync.js';
import { teacherRouter } from './routes/teacher.js';
import { adminRouter } from './routes/admin.js';

initSchema();
seedIfEmpty();

export const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));

const apiRouter = express.Router();

apiRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'VidyaSetu API',
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

export default app;
