import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isVercel = Boolean(process.env.VERCEL);
const dataDir = isVercel ? os.tmpdir() : path.resolve(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.SQLITE_DB_PATH || path.join(dataDir, 'vidyasetu.db');
export const db = new DatabaseSync(dbPath);

db.exec(isVercel ? 'PRAGMA journal_mode = MEMORY;' : 'PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

export function initSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('student', 'teacher', 'admin')),
      grade TEXT DEFAULT 'Class 8',
      school TEXT DEFAULT 'Zilla Parishad High School',
      village TEXT DEFAULT 'Satara District',
      active INTEGER DEFAULT 1,
      streak_days INTEGER DEFAULT 1,
      last_active_date TEXT,
      last_sync_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS classes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      grade TEXT NOT NULL,
      school TEXT DEFAULT 'Zilla Parishad High School',
      teacher_id TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS class_students (
      class_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      enrolled_at TEXT NOT NULL,
      PRIMARY KEY (class_id, student_id),
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      description TEXT NOT NULL,
      icon TEXT DEFAULT 'book',
      color TEXT DEFAULT '#2563eb',
      version INTEGER DEFAULT 1,
      updated_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL,
      title TEXT NOT NULL,
      chapter_number INTEGER DEFAULT 1,
      description TEXT NOT NULL,
      difficulty TEXT NOT NULL CHECK(difficulty IN ('Easy', 'Medium', 'Hard')),
      estimated_minutes INTEGER DEFAULT 20,
      version INTEGER DEFAULT 1,
      is_published INTEGER DEFAULT 1,
      updated_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      question_text TEXT NOT NULL,
      options_json TEXT NOT NULL,
      correct_index INTEGER NOT NULL CHECK(correct_index BETWEEN 0 AND 3),
      explanation TEXT NOT NULL,
      difficulty TEXT NOT NULL CHECK(difficulty IN ('Easy', 'Medium', 'Hard')),
      tags TEXT DEFAULT '',
      version INTEGER DEFAULT 1,
      is_published INTEGER DEFAULT 1,
      updated_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS practice_attempts (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      topic_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      selected_index INTEGER NOT NULL,
      is_correct INTEGER NOT NULL,
      time_spent_sec INTEGER DEFAULT 15,
      attempted_at TEXT NOT NULL,
      synced_at TEXT NOT NULL,
      offline_recorded INTEGER DEFAULT 0,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS mock_exams (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      subject_id TEXT,
      exam_type TEXT NOT NULL CHECK(exam_type IN ('Full Olympiad', 'Subject Test')),
      duration_minutes INTEGER NOT NULL,
      difficulty TEXT NOT NULL CHECK(difficulty IN ('Easy', 'Medium', 'Hard')),
      question_ids_json TEXT NOT NULL,
      is_published INTEGER DEFAULT 1,
      version INTEGER DEFAULT 1,
      created_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS exam_attempts (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      answers_json TEXT NOT NULL,
      marked_review_json TEXT DEFAULT '[]',
      score INTEGER NOT NULL,
      total_questions INTEGER NOT NULL,
      accuracy REAL NOT NULL,
      time_taken_sec INTEGER NOT NULL,
      auto_submitted INTEGER DEFAULT 0,
      started_at TEXT NOT NULL,
      submitted_at TEXT NOT NULL,
      synced_at TEXT NOT NULL,
      offline_recorded INTEGER DEFAULT 0,
      FOREIGN KEY (exam_id) REFERENCES mock_exams(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS assignments (
      id TEXT PRIMARY KEY,
      teacher_id TEXT NOT NULL,
      class_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      assignment_type TEXT NOT NULL CHECK(assignment_type IN ('practice', 'mock_exam')),
      topic_id TEXT,
      exam_id TEXT,
      target_questions INTEGER DEFAULT 5,
      due_date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sync_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('Synced', 'Failed', 'Pending')),
      attempts_synced INTEGER DEFAULT 0,
      exams_synced INTEGER DEFAULT 0,
      content_version INTEGER DEFAULT 1,
      error_message TEXT DEFAULT '',
      device_info TEXT DEFAULT 'Web PWA',
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS platform_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_practice_student ON practice_attempts(student_id);
    CREATE INDEX IF NOT EXISTS idx_practice_topic ON practice_attempts(topic_id);
    CREATE INDEX IF NOT EXISTS idx_exam_attempts_student ON exam_attempts(student_id);
    CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic_id);
    CREATE INDEX IF NOT EXISTS idx_topics_subject ON topics(subject_id);
  `);
}

export function getMeta(key: string, fallback = ''): string {
  const row = db.prepare('SELECT value FROM platform_meta WHERE key = ?').get(key) as { value: string } | undefined;
  return row ? row.value : fallback;
}

export function setMeta(key: string, value: string): void {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO platform_meta (key, value, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(key, value, now);
}

export function getContentVersion(): number {
  return parseInt(getMeta('content_version', '1'), 10) || 1;
}
