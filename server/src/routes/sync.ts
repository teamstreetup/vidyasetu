import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { db, getContentVersion, getMeta } from '../db.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';

export const syncRouter = Router();

syncRouter.post('/', authenticate, (req: AuthRequest, res) => {
  const {
    practiceAttempts = [],
    examAttempts = [],
    clientContentVersion = 0,
    deviceInfo = 'VidyaSetu Web PWA',
  } = req.body || {};

  const studentId = req.user!.id;
  const now = new Date().toISOString();

  const insertPractice = db.prepare(`
    INSERT OR IGNORE INTO practice_attempts
      (id, student_id, question_id, topic_id, subject_id, selected_index, is_correct, time_spent_sec, attempted_at, synced_at, offline_recorded)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let syncedAttempts = 0;
  for (const a of practiceAttempts) {
    if (!a || !a.questionId || typeof a.selectedIndex !== 'number') continue;
    const q = db.prepare('SELECT id, topic_id, subject_id, correct_index FROM questions WHERE id = ?').get(String(a.questionId)) as
      | { id: string; topic_id: string; subject_id: string; correct_index: number }
      | undefined;
    if (!q) continue;

    const result = insertPractice.run(
      a.id ? String(a.id) : uuid(),
      studentId,
      q.id,
      q.topic_id,
      q.subject_id,
      a.selectedIndex,
      q.correct_index === a.selectedIndex ? 1 : 0,
      Number(a.timeSpentSec || 20),
      a.attemptedAt ? String(a.attemptedAt) : now,
      now,
      a.offlineRecorded ? 1 : 0
    );
    if (result.changes > 0) syncedAttempts++;
  }

  const insertExam = db.prepare(`
    INSERT OR IGNORE INTO exam_attempts
      (id, exam_id, student_id, answers_json, marked_review_json, score, total_questions, accuracy, time_taken_sec, auto_submitted, started_at, submitted_at, synced_at, offline_recorded)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let syncedExams = 0;
  for (const ea of examAttempts) {
    if (!ea || !ea.examId) continue;
    const exam = db.prepare('SELECT question_ids_json FROM mock_exams WHERE id = ?').get(String(ea.examId)) as
      | { question_ids_json: string }
      | undefined;
    if (!exam) continue;

    const qIds = JSON.parse(exam.question_ids_json) as string[];
    const qRows =
      qIds.length > 0
        ? (db.prepare(`SELECT id, correct_index FROM questions WHERE id IN (${qIds.map(() => '?').join(',')})`).all(...qIds) as Array<{
            id: string;
            correct_index: number;
          }>)
        : [];
    const answers = ea.answers || {};
    let score = 0;
    for (const q of qRows) {
      if (answers[q.id] === q.correct_index) score++;
    }
    const total = qRows.length || Number(ea.totalQuestions || 1);
    const accuracy = Math.round((score / total) * 100);

    const result = insertExam.run(
      ea.id ? String(ea.id) : uuid(),
      String(ea.examId),
      studentId,
      JSON.stringify(answers),
      JSON.stringify(ea.markedReview || []),
      score,
      total,
      accuracy,
      Number(ea.timeTakenSec || 0),
      ea.autoSubmitted ? 1 : 0,
      ea.startedAt ? String(ea.startedAt) : now,
      ea.submittedAt ? String(ea.submittedAt) : now,
      now,
      ea.offlineRecorded ? 1 : 0
    );
    if (result.changes > 0) syncedExams++;
  }

  const serverContentVersion = getContentVersion();

  db.prepare('UPDATE users SET last_sync_at = ?, last_active_date = ? WHERE id = ?').run(now, now.slice(0, 10), studentId);

  db.prepare(`
    INSERT INTO sync_logs (id, user_id, status, attempts_synced, exams_synced, content_version, error_message, device_info, created_at)
    VALUES (?, ?, 'Synced', ?, ?, ?, '', ?, ?)
  `).run(uuid(), studentId, syncedAttempts, syncedExams, serverContentVersion, String(deviceInfo), now);

  res.json({
    status: 'Synced',
    syncedAttempts,
    syncedExams,
    syncedAt: now,
    serverContentVersion,
    updateAvailable: serverContentVersion > Number(clientContentVersion || 0),
    releaseNotes: getMeta('release_notes', ''),
  });
});

syncRouter.get('/history', authenticate, (req: AuthRequest, res) => {
  const rows = db
    .prepare('SELECT * FROM sync_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 20')
    .all(req.user!.id) as Array<Record<string, unknown>>;

  res.json(
    rows.map((r) => ({
      id: String(r.id),
      status: String(r.status),
      attemptsSynced: Number(r.attempts_synced),
      examsSynced: Number(r.exams_synced),
      contentVersion: Number(r.content_version),
      errorMessage: String(r.error_message || ''),
      deviceInfo: String(r.device_info || ''),
      createdAt: String(r.created_at),
    }))
  );
});
