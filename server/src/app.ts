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

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'VidyaSetu API',
    runtime: process.env.VERCEL ? 'vercel-serverless' : 'node-server',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRouter);
app.use('/api/content', contentRouter);
app.use('/api/practice', practiceRouter);
app.use('/api/exams', examsRouter);
app.use('/api/sync', syncRouter);
app.use('/api/teacher', teacherRouter);
app.use('/api/admin', adminRouter);

export default app;
