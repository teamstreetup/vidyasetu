import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { db } from '../db.js';
import { authenticate, signToken, type AuthRequest } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/register', (req, res) => {
  const { name, email, password, role = 'student', grade = 'Class 8', school = 'ZP High School', village = 'Rural Block' } = req.body || {};

  if (!name || !email || !password) {
    res.status(400).json({ error: 'Name, email, and password are required' });
    return;
  }
  if (!['student', 'teacher'].includes(role)) {
    res.status(400).json({ error: 'Registration is allowed for student or teacher accounts' });
    return;
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existing) {
    res.status(409).json({ error: 'An account with this email already exists' });
    return;
  }

  const id = `u-${role}-${uuid().slice(0, 8)}`;
  const hash = bcrypt.hashSync(String(password), 8);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, grade, school, village, active, streak_days, last_active_date, last_sync_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?, ?)
  `).run(id, String(name).trim(), normalizedEmail, hash, role, grade, school, village, now.slice(0, 10), now, now);

  // Auto-enroll new students into default batch if it exists so they see assignments
  if (role === 'student') {
    const defaultCls = db.prepare('SELECT id FROM classes LIMIT 1').get() as { id: string } | undefined;
    if (defaultCls) {
      db.prepare('INSERT OR IGNORE INTO class_students (class_id, student_id, enrolled_at) VALUES (?, ?, ?)').run(defaultCls.id, id, now);
    }
  }

  const user = { id, name: String(name).trim(), email: normalizedEmail, role: role as 'student' | 'teacher', grade, school, village };
  const token = signToken(user);
  res.status(201).json({ token, user });
});

authRouter.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail) as Record<string, unknown> | undefined;
  if (!row || !row.active) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const valid = bcrypt.compareSync(String(password), String(row.password_hash));
  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  // Update streak/activity date
  const today = new Date().toISOString().slice(0, 10);
  if (row.last_active_date !== today) {
    db.prepare('UPDATE users SET last_active_date = ?, streak_days = streak_days + 1 WHERE id = ?').run(today, String(row.id));
  }

  const user = {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    role: row.role as 'student' | 'teacher' | 'admin',
    grade: String(row.grade || ''),
    school: String(row.school || ''),
    village: String(row.village || ''),
    streakDays: Number(row.streak_days || 1),
    lastSyncAt: row.last_sync_at ? String(row.last_sync_at) : null,
  };

  const token = signToken(user);
  res.json({ token, user });
});

authRouter.get('/me', authenticate, (req: AuthRequest, res) => {
  const row = db.prepare(
    'SELECT id, name, email, role, grade, school, village, streak_days, last_sync_at, created_at FROM users WHERE id = ?'
  ).get(req.user!.id) as Record<string, unknown> | undefined;

  if (!row) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    grade: row.grade,
    school: row.school,
    village: row.village,
    streakDays: row.streak_days,
    lastSyncAt: row.last_sync_at,
    createdAt: row.created_at,
  });
});

authRouter.patch('/profile', authenticate, (req: AuthRequest, res) => {
  const { name, grade, school, village } = req.body || {};
  db.prepare(`
    UPDATE users SET
      name = COALESCE(?, name),
      grade = COALESCE(?, grade),
      school = COALESCE(?, school),
      village = COALESCE(?, village)
    WHERE id = ?
  `).run(name || null, grade || null, school || null, village || null, req.user!.id);

  const updated = db.prepare(
    'SELECT id, name, email, role, grade, school, village, streak_days, last_sync_at FROM users WHERE id = ?'
  ).get(req.user!.id) as Record<string, unknown>;

  res.json({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    role: updated.role,
    grade: updated.grade,
    school: updated.school,
    village: updated.village,
    streakDays: updated.streak_days,
    lastSyncAt: updated.last_sync_at,
  });
});
