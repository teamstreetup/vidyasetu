import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { db, getContentVersion, getMeta, setMeta } from '../db.js';
import { authenticate, requireRole, type AuthRequest } from '../middleware/auth.js';

export const adminRouter = Router();
adminRouter.use(authenticate, requireRole('admin'));

adminRouter.get('/analytics', (_req, res) => {
  const userCounts = db.prepare('SELECT role, COUNT(*) as count FROM users GROUP BY role').all() as Array<{ role: string; count: number }>;
  const subjectsCount = (db.prepare('SELECT COUNT(*) as c FROM subjects').get() as { c: number }).c;
  const topicsCount = (db.prepare('SELECT COUNT(*) as c FROM topics').get() as { c: number }).c;
  const questionsCount = (db.prepare('SELECT COUNT(*) as c FROM questions').get() as { c: number }).c;
  const examsCount = (db.prepare('SELECT COUNT(*) as c FROM mock_exams').get() as { c: number }).c;
  const attemptsTotal = (db.prepare('SELECT COUNT(*) as c FROM practice_attempts').get() as { c: number }).c;
  const offlineAttempts = (db.prepare('SELECT COUNT(*) as c FROM practice_attempts WHERE offline_recorded = 1').get() as { c: number }).c;
  const examAttemptsTotal = (db.prepare('SELECT COUNT(*) as c FROM exam_attempts').get() as { c: number }).c;
  const syncSuccess = (db.prepare("SELECT COUNT(*) as c FROM sync_logs WHERE status = 'Synced'").get() as { c: number }).c;
  const syncFailed = (db.prepare("SELECT COUNT(*) as c FROM sync_logs WHERE status = 'Failed'").get() as { c: number }).c;

  const subjectDistribution = db.prepare(`
    SELECT s.name, s.color,
      (SELECT COUNT(*) FROM topics t WHERE t.subject_id = s.id) as topics,
      (SELECT COUNT(*) FROM questions q WHERE q.subject_id = s.id) as questions,
      (SELECT COUNT(*) FROM practice_attempts pa WHERE pa.subject_id = s.id) as attempts
    FROM subjects s
  `).all();

  res.json({
    users: {
      students: userCounts.find((u) => u.role === 'student')?.count || 0,
      teachers: userCounts.find((u) => u.role === 'teacher')?.count || 0,
      admins: userCounts.find((u) => u.role === 'admin')?.count || 0,
    },
    content: {
      subjects: subjectsCount,
      topics: topicsCount,
      questions: questionsCount,
      mockExams: examsCount,
      contentVersion: getContentVersion(),
      lastPublishedAt: getMeta('last_published_at', ''),
    },
    engagement: {
      totalPracticeAttempts: attemptsTotal,
      offlinePracticeAttempts: offlineAttempts,
      offlineSharePercent: attemptsTotal > 0 ? Math.round((offlineAttempts / attemptsTotal) * 100) : 0,
      totalExamAttempts: examAttemptsTotal,
      syncSuccess,
      syncFailed,
    },
    subjectDistribution,
  });
});

// User Management
adminRouter.get('/users', (_req, res) => {
  const rows = db
    .prepare('SELECT id, name, email, role, grade, school, village, active, streak_days, last_sync_at, created_at FROM users ORDER BY created_at DESC')
    .all() as Array<Record<string, unknown>>;

  res.json(
    rows.map((u) => ({
      id: String(u.id),
      name: String(u.name),
      email: String(u.email),
      role: String(u.role),
      grade: String(u.grade || ''),
      school: String(u.school || ''),
      village: String(u.village || ''),
      active: Number(u.active) === 1,
      streakDays: Number(u.streak_days || 0),
      lastSyncAt: u.last_sync_at ? String(u.last_sync_at) : null,
      createdAt: String(u.created_at),
    }))
  );
});

adminRouter.post('/users', (req, res) => {
  const { name, email, password = 'password123', role = 'student', grade = 'Class 8', school = 'ZP High School', village = 'Rural Block' } =
    req.body || {};
  if (!name || !email) {
    res.status(400).json({ error: 'Name and email are required' });
    return;
  }
  const normalized = String(email).trim().toLowerCase();
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(normalized);
  if (exists) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }
  const id = `u-${role}-${uuid().slice(0, 8)}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, grade, school, village, active, streak_days, last_active_date, last_sync_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?, ?)
  `).run(id, String(name).trim(), normalized, bcrypt.hashSync(String(password), 8), role, grade, school, village, now.slice(0, 10), now, now);

  res.status(201).json({ id, name, email: normalized, role, grade, school, village, active: true });
});

adminRouter.patch('/users/:id', (req, res) => {
  const { role, active, name, grade, school, village } = req.body || {};
  db.prepare(`
    UPDATE users SET
      role = COALESCE(?, role),
      active = COALESCE(?, active),
      name = COALESCE(?, name),
      grade = COALESCE(?, grade),
      school = COALESCE(?, school),
      village = COALESCE(?, village)
    WHERE id = ?
  `).run(
    role || null,
    typeof active === 'boolean' ? (active ? 1 : 0) : null,
    name || null,
    grade || null,
    school || null,
    village || null,
    String(req.params.id)
  );
  res.json({ updated: true });
});

adminRouter.delete('/users/:id', (req: AuthRequest, res) => {
  if (String(req.params.id) === req.user!.id) {
    res.status(400).json({ error: 'Cannot delete your own admin account' });
    return;
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(String(req.params.id));
  res.json({ deleted: true });
});

// Subjects CRUD
adminRouter.post('/subjects', (req, res) => {
  const { name, code, description = '', icon = 'book', color = '#2563eb' } = req.body || {};
  if (!name || !code) {
    res.status(400).json({ error: 'Subject name and code are required' });
    return;
  }
  const id = `sub-${uuid().slice(0, 8)}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO subjects (id, name, code, description, icon, color, version, updated_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(id, String(name).trim(), String(code).trim().toUpperCase(), description, icon, color, now, now);
  res.status(201).json({ id, name, code: String(code).trim().toUpperCase(), description, icon, color, version: 1 });
});

adminRouter.put('/subjects/:id', (req, res) => {
  const { name, code, description, color } = req.body || {};
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE subjects SET
      name = COALESCE(?, name),
      code = COALESCE(?, code),
      description = COALESCE(?, description),
      color = COALESCE(?, color),
      version = version + 1,
      updated_at = ?
    WHERE id = ?
  `).run(name || null, code ? String(code).toUpperCase() : null, description ?? null, color || null, now, String(req.params.id));
  res.json({ updated: true });
});

adminRouter.delete('/subjects/:id', (req, res) => {
  db.prepare('DELETE FROM subjects WHERE id = ?').run(String(req.params.id));
  res.json({ deleted: true });
});

// Topics CRUD
adminRouter.post('/topics', (req, res) => {
  const { subjectId, title, chapterNumber = 1, description = '', difficulty = 'Medium', estimatedMinutes = 20 } = req.body || {};
  if (!subjectId || !title) {
    res.status(400).json({ error: 'subjectId and title are required' });
    return;
  }
  const id = `top-${uuid().slice(0, 8)}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO topics (id, subject_id, title, chapter_number, description, difficulty, estimated_minutes, version, is_published, updated_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)
  `).run(id, subjectId, String(title).trim(), Number(chapterNumber), description, difficulty, Number(estimatedMinutes), now, now);
  res.status(201).json({ id, subjectId, title, chapterNumber, description, difficulty, estimatedMinutes });
});

adminRouter.put('/topics/:id', (req, res) => {
  const { title, chapterNumber, description, difficulty, estimatedMinutes, isPublished } = req.body || {};
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE topics SET
      title = COALESCE(?, title),
      chapter_number = COALESCE(?, chapter_number),
      description = COALESCE(?, description),
      difficulty = COALESCE(?, difficulty),
      estimated_minutes = COALESCE(?, estimated_minutes),
      is_published = COALESCE(?, is_published),
      version = version + 1,
      updated_at = ?
    WHERE id = ?
  `).run(
    title || null,
    chapterNumber !== undefined ? Number(chapterNumber) : null,
    description ?? null,
    difficulty || null,
    estimatedMinutes !== undefined ? Number(estimatedMinutes) : null,
    typeof isPublished === 'boolean' ? (isPublished ? 1 : 0) : null,
    now,
    String(req.params.id)
  );
  res.json({ updated: true });
});

adminRouter.delete('/topics/:id', (req, res) => {
  db.prepare('DELETE FROM topics WHERE id = ?').run(String(req.params.id));
  res.json({ deleted: true });
});

// Question Bank CRUD
adminRouter.get('/questions', (req, res) => {
  const { subjectId, topicId, difficulty } = req.query;
  const conditions: string[] = [];
  const params: string[] = [];
  if (subjectId) {
    conditions.push('q.subject_id = ?');
    params.push(String(subjectId));
  }
  if (topicId) {
    conditions.push('q.topic_id = ?');
    params.push(String(topicId));
  }
  if (difficulty && difficulty !== 'All') {
    conditions.push('q.difficulty = ?');
    params.push(String(difficulty));
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db
    .prepare(`
      SELECT q.*, t.title as topic_title, s.name as subject_name
      FROM questions q
      LEFT JOIN topics t ON t.id = q.topic_id
      LEFT JOIN subjects s ON s.id = q.subject_id
      ${where}
      ORDER BY q.updated_at DESC
    `)
    .all(...params) as Array<Record<string, unknown>>;

  res.json(
    rows.map((q) => ({
      id: String(q.id),
      topicId: String(q.topic_id),
      topicTitle: String(q.topic_title || ''),
      subjectId: String(q.subject_id),
      subjectName: String(q.subject_name || ''),
      questionText: String(q.question_text),
      options: JSON.parse(String(q.options_json)),
      correctIndex: Number(q.correct_index),
      explanation: String(q.explanation),
      difficulty: String(q.difficulty),
      tags: String(q.tags || ''),
      version: Number(q.version || 1),
      isPublished: Number(q.is_published) === 1,
      updatedAt: String(q.updated_at),
    }))
  );
});

adminRouter.post('/questions', (req, res) => {
  const { topicId, subjectId, questionText, options, correctIndex, explanation, difficulty = 'Medium', tags = '' } = req.body || {};
  if (!topicId || !subjectId || !questionText || !Array.isArray(options) || options.length !== 4) {
    res.status(400).json({ error: 'topicId, subjectId, questionText, and 4 options are required' });
    return;
  }
  const id = `q-${uuid().slice(0, 8)}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO questions (id, topic_id, subject_id, question_text, options_json, correct_index, explanation, difficulty, tags, version, is_published, updated_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)
  `).run(id, topicId, subjectId, String(questionText).trim(), JSON.stringify(options), Number(correctIndex), String(explanation || ''), difficulty, tags, now, now);

  res.status(201).json({ id, version: 1 });
});

adminRouter.put('/questions/:id', (req, res) => {
  const { topicId, subjectId, questionText, options, correctIndex, explanation, difficulty, tags, isPublished } = req.body || {};
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE questions SET
      topic_id = COALESCE(?, topic_id),
      subject_id = COALESCE(?, subject_id),
      question_text = COALESCE(?, question_text),
      options_json = COALESCE(?, options_json),
      correct_index = COALESCE(?, correct_index),
      explanation = COALESCE(?, explanation),
      difficulty = COALESCE(?, difficulty),
      tags = COALESCE(?, tags),
      is_published = COALESCE(?, is_published),
      version = version + 1,
      updated_at = ?
    WHERE id = ?
  `).run(
    topicId || null,
    subjectId || null,
    questionText || null,
    Array.isArray(options) ? JSON.stringify(options) : null,
    correctIndex !== undefined ? Number(correctIndex) : null,
    explanation ?? null,
    difficulty || null,
    tags ?? null,
    typeof isPublished === 'boolean' ? (isPublished ? 1 : 0) : null,
    now,
    String(req.params.id)
  );
  res.json({ updated: true });
});

adminRouter.delete('/questions/:id', (req, res) => {
  db.prepare('DELETE FROM questions WHERE id = ?').run(String(req.params.id));
  res.json({ deleted: true });
});

// Mock Exams CRUD
adminRouter.get('/exams', (_req, res) => {
  const rows = db.prepare(`
    SELECT me.*, s.name as subject_name,
      (SELECT COUNT(*) FROM exam_attempts ea WHERE ea.exam_id = me.id) as attempt_count
    FROM mock_exams me LEFT JOIN subjects s ON s.id = me.subject_id
    ORDER BY me.created_at DESC
  `).all() as Array<Record<string, unknown>>;

  res.json(
    rows.map((e) => ({
      id: String(e.id),
      title: String(e.title),
      description: String(e.description),
      subjectId: e.subject_id ? String(e.subject_id) : null,
      subjectName: e.subject_name ? String(e.subject_name) : 'All Subjects',
      examType: String(e.exam_type),
      durationMinutes: Number(e.duration_minutes),
      difficulty: String(e.difficulty),
      questionIds: JSON.parse(String(e.question_ids_json)),
      isPublished: Number(e.is_published) === 1,
      version: Number(e.version || 1),
      attemptCount: Number(e.attempt_count || 0),
      updatedAt: String(e.updated_at),
    }))
  );
});

adminRouter.post('/exams', (req: AuthRequest, res) => {
  const { title, description = '', subjectId = null, examType = 'Subject Test', durationMinutes = 15, difficulty = 'Medium', questionIds = [], isPublished = true } =
    req.body || {};
  if (!title || !Array.isArray(questionIds) || questionIds.length === 0) {
    res.status(400).json({ error: 'Exam title and at least one question are required' });
    return;
  }
  const id = `exam-${uuid().slice(0, 8)}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO mock_exams (id, title, description, subject_id, exam_type, duration_minutes, difficulty, question_ids_json, is_published, version, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
  `).run(
    id,
    String(title).trim(),
    description,
    subjectId || null,
    examType,
    Number(durationMinutes),
    difficulty,
    JSON.stringify(questionIds),
    isPublished ? 1 : 0,
    req.user!.id,
    now,
    now
  );
  res.status(201).json({ id, title });
});

adminRouter.put('/exams/:id', (req, res) => {
  const { title, description, durationMinutes, difficulty, questionIds, isPublished } = req.body || {};
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE mock_exams SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      duration_minutes = COALESCE(?, duration_minutes),
      difficulty = COALESCE(?, difficulty),
      question_ids_json = COALESCE(?, question_ids_json),
      is_published = COALESCE(?, is_published),
      version = version + 1,
      updated_at = ?
    WHERE id = ?
  `).run(
    title || null,
    description ?? null,
    durationMinutes !== undefined ? Number(durationMinutes) : null,
    difficulty || null,
    Array.isArray(questionIds) ? JSON.stringify(questionIds) : null,
    typeof isPublished === 'boolean' ? (isPublished ? 1 : 0) : null,
    now,
    String(req.params.id)
  );
  res.json({ updated: true });
});

adminRouter.delete('/exams/:id', (req, res) => {
  db.prepare('DELETE FROM mock_exams WHERE id = ?').run(String(req.params.id));
  res.json({ deleted: true });
});

// Content Publishing & Versioning
adminRouter.get('/publishing', (_req, res) => {
  const recentQuestions = db
    .prepare('SELECT id, question_text, difficulty, version, updated_at FROM questions ORDER BY updated_at DESC LIMIT 10')
    .all();
  res.json({
    contentVersion: getContentVersion(),
    lastPublishedAt: getMeta('last_published_at', ''),
    releaseNotes: getMeta('release_notes', ''),
    recentUpdatedQuestions: recentQuestions,
  });
});

adminRouter.post('/publishing/publish', (req, res) => {
  const { releaseNotes = 'Updated question bank and explanations.' } = req.body || {};
  const nextVersion = getContentVersion() + 1;
  const now = new Date().toISOString();
  setMeta('content_version', String(nextVersion));
  setMeta('last_published_at', now);
  setMeta('release_notes', String(releaseNotes));
  res.json({ contentVersion: nextVersion, lastPublishedAt: now, releaseNotes });
});

// Synchronization Monitoring
adminRouter.get('/sync-logs', (_req, res) => {
  const logs = db.prepare(`
    SELECT sl.*, u.name as user_name, u.email as user_email, u.role as user_role, u.village
    FROM sync_logs sl JOIN users u ON u.id = sl.user_id
    ORDER BY sl.created_at DESC
    LIMIT 50
  `).all() as Array<Record<string, unknown>>;

  const studentSyncSummary = db.prepare(`
    SELECT id, name, email, grade, village, last_sync_at
    FROM users WHERE role = 'student'
    ORDER BY last_sync_at DESC
  `).all() as Array<Record<string, unknown>>;

  res.json({
    logs: logs.map((l) => ({
      id: String(l.id),
      userId: String(l.user_id),
      userName: String(l.user_name),
      userEmail: String(l.user_email),
      village: String(l.village || ''),
      status: String(l.status),
      attemptsSynced: Number(l.attempts_synced),
      examsSynced: Number(l.exams_synced),
      contentVersion: Number(l.content_version),
      errorMessage: String(l.error_message || ''),
      deviceInfo: String(l.device_info || ''),
      createdAt: String(l.created_at),
    })),
    studentSyncSummary: studentSyncSummary.map((s) => ({
      id: String(s.id),
      name: String(s.name),
      email: String(s.email),
      grade: String(s.grade),
      village: String(s.village),
      lastSyncAt: s.last_sync_at ? String(s.last_sync_at) : null,
    })),
  });
});
