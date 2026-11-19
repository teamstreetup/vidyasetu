import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { db, getContentVersion } from '../db.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';

export const examsRouter = Router();

examsRouter.get('/', authenticate, (req: AuthRequest, res) => {
  const rows = db.prepare(`
    SELECT me.*, s.name as subject_name, s.color as subject_color
    FROM mock_exams me
    LEFT JOIN subjects s ON s.id = me.subject_id
    WHERE me.is_published = 1
    ORDER BY me.exam_type ASC, me.created_at DESC
  `).all() as Array<Record<string, unknown>>;

  const myAttempts = db
    .prepare('SELECT exam_id, MAX(accuracy) as best_accuracy, COUNT(*) as attempt_count FROM exam_attempts WHERE student_id = ? GROUP BY exam_id')
    .all(req.user!.id) as Array<{ exam_id: string; best_accuracy: number; attempt_count: number }>;
  const attemptMap = new Map(myAttempts.map((a) => [a.exam_id, a]));

  res.json(
    rows.map((e) => {
      const qIds = JSON.parse(String(e.question_ids_json)) as string[];
      const stat = attemptMap.get(String(e.id));
      return {
        id: String(e.id),
        title: String(e.title),
        description: String(e.description),
        subjectId: e.subject_id ? String(e.subject_id) : null,
        subjectName: e.subject_name ? String(e.subject_name) : 'All Olympiad Subjects',
        subjectColor: e.subject_color ? String(e.subject_color) : '#1e3a5f',
        examType: String(e.exam_type),
        durationMinutes: Number(e.duration_minutes),
        difficulty: String(e.difficulty),
        questionCount: qIds.length,
        questionIds: qIds,
        version: Number(e.version || 1),
        attemptCount: stat?.attempt_count || 0,
        bestAccuracy: stat ? Math.round(stat.best_accuracy) : null,
      };
    })
  );
});

examsRouter.get('/:id/bundle', authenticate, (req, res) => {
  const exam = db.prepare(`
    SELECT me.*, s.name as subject_name, s.color as subject_color
    FROM mock_exams me LEFT JOIN subjects s ON s.id = me.subject_id
    WHERE me.id = ? AND me.is_published = 1
  `).get(String(req.params.id)) as Record<string, unknown> | undefined;

  if (!exam) {
    res.status(404).json({ error: 'Mock exam not found' });
    return;
  }

  const qIds = JSON.parse(String(exam.question_ids_json)) as string[];
  const questions =
    qIds.length > 0
      ? (db
          .prepare(`SELECT q.*, t.title as topic_title, s.name as subject_name FROM questions q LEFT JOIN topics t ON t.id = q.topic_id LEFT JOIN subjects s ON s.id = q.subject_id WHERE q.id IN (${qIds.map(() => '?').join(',')})`)
          .all(...qIds) as Array<Record<string, unknown>>)
      : [];

  const qMap = new Map(questions.map((q) => [String(q.id), q]));
  const orderedQuestions = qIds
    .map((id) => qMap.get(id))
    .filter((q): q is Record<string, unknown> => Boolean(q))
    .map((q) => ({
      id: String(q.id),
      topicId: String(q.topic_id),
      topicTitle: String(q.topic_title || ''),
      subjectId: String(q.subject_id),
      subjectName: String(q.subject_name || ''),
      questionText: String(q.question_text),
      options: JSON.parse(String(q.options_json)) as string[],
      correctIndex: Number(q.correct_index),
      explanation: String(q.explanation),
      difficulty: String(q.difficulty),
      version: Number(q.version || 1),
    }));

  res.json({
    contentVersion: getContentVersion(),
    downloadedAt: new Date().toISOString(),
    exam: {
      id: String(exam.id),
      title: String(exam.title),
      description: String(exam.description),
      subjectId: exam.subject_id ? String(exam.subject_id) : null,
      subjectName: exam.subject_name ? String(exam.subject_name) : 'All Olympiad Subjects',
      subjectColor: exam.subject_color ? String(exam.subject_color) : '#1e3a5f',
      examType: String(exam.exam_type),
      durationMinutes: Number(exam.duration_minutes),
      difficulty: String(exam.difficulty),
      questionCount: orderedQuestions.length,
      questionIds: qIds,
      version: Number(exam.version || 1),
    },
    questions: orderedQuestions,
  });
});

examsRouter.post('/attempts', authenticate, (req: AuthRequest, res) => {
  const { id, examId, answers = {}, markedReview = [], timeTakenSec = 0, autoSubmitted = false, startedAt, submittedAt, offlineRecorded = false } = req.body || {};
  const studentId = req.user!.id;

  const exam = db.prepare('SELECT * FROM mock_exams WHERE id = ?').get(String(examId)) as Record<string, unknown> | undefined;
  if (!exam) {
    res.status(404).json({ error: 'Exam not found' });
    return;
  }

  const qIds = JSON.parse(String(exam.question_ids_json)) as string[];
  const qRows =
    qIds.length > 0
      ? (db.prepare(`SELECT id, correct_index FROM questions WHERE id IN (${qIds.map(() => '?').join(',')})`).all(...qIds) as Array<{
          id: string;
          correct_index: number;
        }>)
      : [];

  let score = 0;
  for (const q of qRows) {
    if (answers[q.id] === q.correct_index) score++;
  }
  const totalQuestions = qRows.length || 1;
  const accuracy = Math.round((score / totalQuestions) * 100);
  const now = new Date().toISOString();
  const attemptId = id ? String(id) : uuid();

  db.prepare(`
    INSERT OR IGNORE INTO exam_attempts
      (id, exam_id, student_id, answers_json, marked_review_json, score, total_questions, accuracy, time_taken_sec, auto_submitted, started_at, submitted_at, synced_at, offline_recorded)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    attemptId,
    String(examId),
    studentId,
    JSON.stringify(answers),
    JSON.stringify(markedReview),
    score,
    totalQuestions,
    accuracy,
    Number(timeTakenSec),
    autoSubmitted ? 1 : 0,
    startedAt ? String(startedAt) : now,
    submittedAt ? String(submittedAt) : now,
    now,
    offlineRecorded ? 1 : 0
  );

  db.prepare('UPDATE users SET last_sync_at = ?, last_active_date = ? WHERE id = ?').run(now, now.slice(0, 10), studentId);

  res.status(201).json({
    id: attemptId,
    examId: String(examId),
    score,
    totalQuestions,
    accuracy,
    timeTakenSec: Number(timeTakenSec),
    autoSubmitted: Boolean(autoSubmitted),
    submittedAt: submittedAt || now,
    syncedAt: now,
  });
});

examsRouter.get('/my-attempts', authenticate, (req: AuthRequest, res) => {
  const rows = db.prepare(`
    SELECT ea.*, me.title as exam_title, me.exam_type, me.duration_minutes, me.question_ids_json
    FROM exam_attempts ea
    JOIN mock_exams me ON me.id = ea.exam_id
    WHERE ea.student_id = ?
    ORDER BY ea.submitted_at DESC
  `).all(req.user!.id) as Array<Record<string, unknown>>;

  res.json(
    rows.map((r) => ({
      id: String(r.id),
      examId: String(r.exam_id),
      examTitle: String(r.exam_title),
      examType: String(r.exam_type),
      durationMinutes: Number(r.duration_minutes),
      answers: JSON.parse(String(r.answers_json)),
      markedReview: JSON.parse(String(r.marked_review_json || '[]')),
      score: Number(r.score),
      totalQuestions: Number(r.total_questions),
      accuracy: Number(r.accuracy),
      timeTakenSec: Number(r.time_taken_sec),
      autoSubmitted: Number(r.auto_submitted) === 1,
      offlineRecorded: Number(r.offline_recorded) === 1,
      startedAt: String(r.started_at),
      submittedAt: String(r.submitted_at),
      syncedAt: String(r.synced_at),
    }))
  );
});
