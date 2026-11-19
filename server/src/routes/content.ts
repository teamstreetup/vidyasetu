import { Router } from 'express';
import { db, getContentVersion, getMeta } from '../db.js';
import { authenticate } from '../middleware/auth.js';

export const contentRouter = Router();

function formatQuestion(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    topicId: String(row.topic_id),
    subjectId: String(row.subject_id),
    questionText: String(row.question_text),
    options: JSON.parse(String(row.options_json)) as string[],
    correctIndex: Number(row.correct_index),
    explanation: String(row.explanation),
    difficulty: String(row.difficulty) as 'Easy' | 'Medium' | 'Hard',
    tags: String(row.tags || ''),
    version: Number(row.version || 1),
    updatedAt: String(row.updated_at),
  };
}

contentRouter.get('/version', authenticate, (_req, res) => {
  res.json({
    contentVersion: getContentVersion(),
    lastPublishedAt: getMeta('last_published_at', new Date().toISOString()),
    releaseNotes: getMeta('release_notes', 'Standard Olympiad pack'),
  });
});

contentRouter.get('/subjects', authenticate, (_req, res) => {
  const rows = db.prepare(`
    SELECT s.*,
      (SELECT COUNT(*) FROM topics t WHERE t.subject_id = s.id AND t.is_published = 1) as topic_count,
      (SELECT COUNT(*) FROM questions q WHERE q.subject_id = s.id AND q.is_published = 1) as question_count
    FROM subjects s
    ORDER BY s.name ASC
  `).all() as Array<Record<string, unknown>>;

  res.json(
    rows.map((s) => ({
      id: String(s.id),
      name: String(s.name),
      code: String(s.code),
      description: String(s.description),
      icon: String(s.icon),
      color: String(s.color),
      version: Number(s.version),
      topicCount: Number(s.topic_count),
      questionCount: Number(s.question_count),
      updatedAt: String(s.updated_at),
    }))
  );
});

contentRouter.get('/topics', authenticate, (req, res) => {
  const { subjectId } = req.query;
  const sql = subjectId
    ? `SELECT t.*, s.name as subject_name, s.color as subject_color,
        (SELECT COUNT(*) FROM questions q WHERE q.topic_id = t.id AND q.is_published = 1) as question_count
       FROM topics t JOIN subjects s ON s.id = t.subject_id
       WHERE t.is_published = 1 AND t.subject_id = ?
       ORDER BY t.chapter_number ASC`
    : `SELECT t.*, s.name as subject_name, s.color as subject_color,
        (SELECT COUNT(*) FROM questions q WHERE q.topic_id = t.id AND q.is_published = 1) as question_count
       FROM topics t JOIN subjects s ON s.id = t.subject_id
       WHERE t.is_published = 1
       ORDER BY s.name ASC, t.chapter_number ASC`;

  const rows = (subjectId ? db.prepare(sql).all(String(subjectId)) : db.prepare(sql).all()) as Array<Record<string, unknown>>;

  res.json(
    rows.map((t) => ({
      id: String(t.id),
      subjectId: String(t.subject_id),
      subjectName: String(t.subject_name),
      subjectColor: String(t.subject_color),
      title: String(t.title),
      chapterNumber: Number(t.chapter_number),
      description: String(t.description),
      difficulty: String(t.difficulty),
      estimatedMinutes: Number(t.estimated_minutes),
      questionCount: Number(t.question_count),
      version: Number(t.version),
      updatedAt: String(t.updated_at),
    }))
  );
});

contentRouter.get('/questions', authenticate, (req, res) => {
  const { topicId, subjectId, difficulty, ids } = req.query;
  const conditions = ['is_published = 1'];
  const params: Array<string> = [];

  if (topicId) {
    conditions.push('topic_id = ?');
    params.push(String(topicId));
  }
  if (subjectId) {
    conditions.push('subject_id = ?');
    params.push(String(subjectId));
  }
  if (difficulty && difficulty !== 'All') {
    conditions.push('difficulty = ?');
    params.push(String(difficulty));
  }
  if (ids) {
    const idList = String(ids).split(',').filter(Boolean);
    if (idList.length > 0) {
      conditions.push(`id IN (${idList.map(() => '?').join(',')})`);
      params.push(...idList);
    }
  }

  const rows = db
    .prepare(`SELECT * FROM questions WHERE ${conditions.join(' AND ')} ORDER BY difficulty ASC, id ASC`)
    .all(...params) as Array<Record<string, unknown>>;

  res.json(rows.map(formatQuestion));
});

// Download complete Topic bundle for offline use
contentRouter.get('/bundle/topic/:topicId', authenticate, (req, res) => {
  const topic = db.prepare(`
    SELECT t.*, s.name as subject_name, s.code as subject_code, s.description as subject_desc, s.icon as subject_icon, s.color as subject_color
    FROM topics t JOIN subjects s ON s.id = t.subject_id
    WHERE t.id = ? AND t.is_published = 1
  `).get(String(req.params.topicId)) as Record<string, unknown> | undefined;

  if (!topic) {
    res.status(404).json({ error: 'Topic not found' });
    return;
  }

  const questions = db
    .prepare('SELECT * FROM questions WHERE topic_id = ? AND is_published = 1 ORDER BY id ASC')
    .all(String(req.params.topicId)) as Array<Record<string, unknown>>;

  res.json({
    contentVersion: getContentVersion(),
    downloadedAt: new Date().toISOString(),
    subject: {
      id: String(topic.subject_id),
      name: String(topic.subject_name),
      code: String(topic.subject_code),
      description: String(topic.subject_desc),
      icon: String(topic.subject_icon),
      color: String(topic.subject_color),
    },
    topic: {
      id: String(topic.id),
      subjectId: String(topic.subject_id),
      subjectName: String(topic.subject_name),
      subjectColor: String(topic.subject_color),
      title: String(topic.title),
      chapterNumber: Number(topic.chapter_number),
      description: String(topic.description),
      difficulty: String(topic.difficulty),
      estimatedMinutes: Number(topic.estimated_minutes),
      questionCount: questions.length,
      version: Number(topic.version),
      updatedAt: String(topic.updated_at),
    },
    questions: questions.map(formatQuestion),
  });
});

// Download complete Subject bundle (all topics + all questions) for offline use
contentRouter.get('/bundle/subject/:subjectId', authenticate, (req, res) => {
  const subject = db.prepare('SELECT * FROM subjects WHERE id = ?').get(String(req.params.subjectId)) as Record<string, unknown> | undefined;
  if (!subject) {
    res.status(404).json({ error: 'Subject not found' });
    return;
  }

  const topics = db
    .prepare('SELECT * FROM topics WHERE subject_id = ? AND is_published = 1 ORDER BY chapter_number ASC')
    .all(String(req.params.subjectId)) as Array<Record<string, unknown>>;

  const questions = db
    .prepare('SELECT * FROM questions WHERE subject_id = ? AND is_published = 1 ORDER BY topic_id ASC, id ASC')
    .all(String(req.params.subjectId)) as Array<Record<string, unknown>>;

  const qCountByTopic = new Map<string, number>();
  for (const q of questions) {
    const tid = String(q.topic_id);
    qCountByTopic.set(tid, (qCountByTopic.get(tid) || 0) + 1);
  }

  res.json({
    contentVersion: getContentVersion(),
    downloadedAt: new Date().toISOString(),
    subject: {
      id: String(subject.id),
      name: String(subject.name),
      code: String(subject.code),
      description: String(subject.description),
      icon: String(subject.icon),
      color: String(subject.color),
      version: Number(subject.version),
      topicCount: topics.length,
      questionCount: questions.length,
      updatedAt: String(subject.updated_at),
    },
    topics: topics.map((t) => ({
      id: String(t.id),
      subjectId: String(t.subject_id),
      subjectName: String(subject.name),
      subjectColor: String(subject.color),
      title: String(t.title),
      chapterNumber: Number(t.chapter_number),
      description: String(t.description),
      difficulty: String(t.difficulty),
      estimatedMinutes: Number(t.estimated_minutes),
      questionCount: qCountByTopic.get(String(t.id)) || 0,
      version: Number(t.version),
      updatedAt: String(t.updated_at),
    })),
    questions: questions.map(formatQuestion),
  });
});
