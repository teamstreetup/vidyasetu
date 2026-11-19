import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../db.js';
import { authenticate, requireRole, type AuthRequest } from '../middleware/auth.js';

export const teacherRouter = Router();
teacherRouter.use(authenticate, requireRole('teacher', 'admin'));

teacherRouter.get('/overview', (req: AuthRequest, res) => {
  const teacherId = req.user!.id;
  const classes = db
    .prepare(
      req.user!.role === 'admin'
        ? 'SELECT * FROM classes ORDER BY created_at DESC'
        : 'SELECT * FROM classes WHERE teacher_id = ? ORDER BY created_at DESC'
    )
    .all(...(req.user!.role === 'admin' ? [] : [teacherId])) as Array<Record<string, unknown>>;

  const students = db
    .prepare("SELECT id, name, email, grade, school, village, streak_days, last_sync_at FROM users WHERE role = 'student' AND active = 1 ORDER BY name ASC")
    .all() as Array<Record<string, unknown>>;

  const attempts = db.prepare('SELECT * FROM practice_attempts').all() as Array<Record<string, unknown>>;
  const examAttempts = db.prepare('SELECT * FROM exam_attempts').all() as Array<Record<string, unknown>>;
  const assignments = db.prepare('SELECT * FROM assignments').all() as Array<Record<string, unknown>>;

  const studentMetrics = students.map((s) => {
    const sid = String(s.id);
    const sAtt = attempts.filter((a) => String(a.student_id) === sid);
    const correct = sAtt.filter((a) => Number(a.is_correct) === 1).length;
    const accuracy = sAtt.length > 0 ? Math.round((correct / sAtt.length) * 100) : 0;
    const exams = examAttempts.filter((e) => String(e.student_id) === sid);
    return {
      id: sid,
      name: String(s.name),
      email: String(s.email),
      grade: String(s.grade),
      village: String(s.village),
      attempted: sAtt.length,
      accuracy,
      examsTaken: exams.length,
      streakDays: Number(s.streak_days || 0),
      lastSyncAt: s.last_sync_at ? String(s.last_sync_at) : null,
    };
  });

  const strugglingStudents = studentMetrics.filter((s) => s.attempted > 0 && s.accuracy < 65);
  const avgAccuracy =
    studentMetrics.filter((s) => s.attempted > 0).length > 0
      ? Math.round(
          studentMetrics.filter((s) => s.attempted > 0).reduce((acc, s) => acc + s.accuracy, 0) /
            studentMetrics.filter((s) => s.attempted > 0).length
        )
      : 0;

  res.json({
    stats: {
      totalClasses: classes.length,
      totalStudents: students.length,
      totalAssignments: assignments.length,
      averageAccuracy: avgAccuracy,
      strugglingCount: strugglingStudents.length,
      totalPracticeAttempts: attempts.length,
      totalExamSubmissions: examAttempts.length,
    },
    strugglingStudents,
    recentSyncs: [...studentMetrics].sort((a, b) => (b.lastSyncAt || '').localeCompare(a.lastSyncAt || '')).slice(0, 8),
  });
});

teacherRouter.get('/classes', (req: AuthRequest, res) => {
  const rows = db
    .prepare(
      req.user!.role === 'admin'
        ? 'SELECT * FROM classes ORDER BY created_at DESC'
        : 'SELECT * FROM classes WHERE teacher_id = ? ORDER BY created_at DESC'
    )
    .all(...(req.user!.role === 'admin' ? [] : [req.user!.id])) as Array<Record<string, unknown>>;

  const enriched = rows.map((c) => {
    const members = db
      .prepare(`
        SELECT u.id, u.name, u.email, u.grade, u.village, u.last_sync_at
        FROM class_students cs JOIN users u ON u.id = cs.student_id
        WHERE cs.class_id = ?
        ORDER BY u.name ASC
      `)
      .all(String(c.id)) as Array<Record<string, unknown>>;

    return {
      id: String(c.id),
      name: String(c.name),
      grade: String(c.grade),
      school: String(c.school),
      description: String(c.description || ''),
      createdAt: String(c.created_at),
      students: members.map((m) => ({
        id: String(m.id),
        name: String(m.name),
        email: String(m.email),
        grade: String(m.grade),
        village: String(m.village),
        lastSyncAt: m.last_sync_at ? String(m.last_sync_at) : null,
      })),
    };
  });

  res.json(enriched);
});

teacherRouter.post('/classes', (req: AuthRequest, res) => {
  const { name, grade = 'Class 8', school = 'ZP High School', description = '' } = req.body || {};
  if (!name) {
    res.status(400).json({ error: 'Class name is required' });
    return;
  }
  const id = `cls-${uuid().slice(0, 8)}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO classes (id, name, grade, school, teacher_id, description, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, String(name).trim(), grade, school, req.user!.id, description, now);

  res.status(201).json({ id, name: String(name).trim(), grade, school, description, createdAt: now, students: [] });
});

teacherRouter.delete('/classes/:id', (req, res) => {
  db.prepare('DELETE FROM classes WHERE id = ?').run(String(req.params.id));
  res.json({ deleted: true });
});

teacherRouter.post('/classes/:id/students', (req, res) => {
  const { studentId } = req.body || {};
  if (!studentId) {
    res.status(400).json({ error: 'studentId is required' });
    return;
  }
  db.prepare('INSERT OR IGNORE INTO class_students (class_id, student_id, enrolled_at) VALUES (?, ?, ?)').run(
    String(req.params.id),
    String(studentId),
    new Date().toISOString()
  );
  res.json({ added: true });
});

teacherRouter.delete('/classes/:id/students/:studentId', (req, res) => {
  db.prepare('DELETE FROM class_students WHERE class_id = ? AND student_id = ?').run(
    String(req.params.id),
    String(req.params.studentId)
  );
  res.json({ removed: true });
});

teacherRouter.get('/students', (_req, res) => {
  const students = db
    .prepare("SELECT id, name, email, grade, school, village, streak_days, last_sync_at, created_at FROM users WHERE role = 'student' AND active = 1 ORDER BY name ASC")
    .all() as Array<Record<string, unknown>>;

  const topics = db.prepare('SELECT id, title FROM topics').all() as Array<{ id: string; title: string }>;
  const topicTitleMap = new Map(topics.map((t) => [t.id, t.title]));

  const result = students.map((s) => {
    const sid = String(s.id);
    const attempts = db.prepare('SELECT topic_id, subject_id, is_correct, offline_recorded FROM practice_attempts WHERE student_id = ?').all(sid) as Array<
      Record<string, unknown>
    >;
    const exams = db.prepare('SELECT score, total_questions, accuracy FROM exam_attempts WHERE student_id = ?').all(sid) as Array<
      Record<string, unknown>
    >;
    const classes = db
      .prepare('SELECT c.id, c.name FROM class_students cs JOIN classes c ON c.id = cs.class_id WHERE cs.student_id = ?')
      .all(sid) as Array<{ id: string; name: string }>;

    const correct = attempts.filter((a) => Number(a.is_correct) === 1).length;
    const accuracy = attempts.length > 0 ? Math.round((correct / attempts.length) * 100) : 0;

    // Identify weak topics for this student
    const byTopic = new Map<string, { total: number; correct: number }>();
    for (const a of attempts) {
      const tid = String(a.topic_id);
      const cur = byTopic.get(tid) || { total: 0, correct: 0 };
      cur.total++;
      if (Number(a.is_correct) === 1) cur.correct++;
      byTopic.set(tid, cur);
    }
    const weakTopics = Array.from(byTopic.entries())
      .map(([tid, v]) => ({ topicId: tid, title: topicTitleMap.get(tid) || tid, accuracy: Math.round((v.correct / v.total) * 100) }))
      .filter((t) => t.accuracy < 65);

    const avgExam = exams.length > 0 ? Math.round(exams.reduce((acc, e) => acc + Number(e.accuracy), 0) / exams.length) : null;

    return {
      id: sid,
      name: String(s.name),
      email: String(s.email),
      grade: String(s.grade),
      school: String(s.school),
      village: String(s.village),
      streakDays: Number(s.streak_days || 0),
      lastSyncAt: s.last_sync_at ? String(s.last_sync_at) : null,
      classes,
      attempted: attempts.length,
      correct,
      accuracy,
      offlineAttempts: attempts.filter((a) => Number(a.offline_recorded) === 1).length,
      examsTaken: exams.length,
      avgExamAccuracy: avgExam,
      weakTopics,
    };
  });

  res.json(result);
});

teacherRouter.get('/students/:id', (req, res) => {
  const sid = String(req.params.id);
  const student = db
    .prepare("SELECT id, name, email, grade, school, village, streak_days, last_sync_at, created_at FROM users WHERE id = ? AND role = 'student'")
    .get(sid) as Record<string, unknown> | undefined;

  if (!student) {
    res.status(404).json({ error: 'Student not found' });
    return;
  }

  const subjects = db.prepare('SELECT id, name, color FROM subjects').all() as Array<{ id: string; name: string; color: string }>;
  const topics = db.prepare('SELECT id, subject_id, title, difficulty FROM topics').all() as Array<{
    id: string;
    subject_id: string;
    title: string;
    difficulty: string;
  }>;
  const attempts = db
    .prepare('SELECT * FROM practice_attempts WHERE student_id = ? ORDER BY attempted_at DESC')
    .all(sid) as Array<Record<string, unknown>>;
  const examAttempts = db
    .prepare(`
      SELECT ea.*, me.title as exam_title, me.exam_type
      FROM exam_attempts ea JOIN mock_exams me ON me.id = ea.exam_id
      WHERE ea.student_id = ?
      ORDER BY ea.submitted_at DESC
    `)
    .all(sid) as Array<Record<string, unknown>>;
  const syncLogs = db.prepare('SELECT * FROM sync_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 10').all(sid);

  const subjectProgress = subjects.map((s) => {
    const subA = attempts.filter((a) => String(a.subject_id) === s.id);
    const c = subA.filter((a) => Number(a.is_correct) === 1).length;
    return {
      subjectId: s.id,
      subjectName: s.name,
      color: s.color,
      attempted: subA.length,
      correct: c,
      accuracy: subA.length > 0 ? Math.round((c / subA.length) * 100) : 0,
    };
  });

  const topicProgress = topics.map((t) => {
    const tA = attempts.filter((a) => String(a.topic_id) === t.id);
    const c = tA.filter((a) => Number(a.is_correct) === 1).length;
    return {
      topicId: t.id,
      title: t.title,
      difficulty: t.difficulty,
      attempted: tA.length,
      correct: c,
      accuracy: tA.length > 0 ? Math.round((c / tA.length) * 100) : 0,
    };
  });

  res.json({
    student: {
      id: String(student.id),
      name: String(student.name),
      email: String(student.email),
      grade: String(student.grade),
      school: String(student.school),
      village: String(student.village),
      streakDays: Number(student.streak_days || 0),
      lastSyncAt: student.last_sync_at ? String(student.last_sync_at) : null,
    },
    subjectProgress,
    topicProgress,
    examResults: examAttempts.map((e) => ({
      id: String(e.id),
      examTitle: String(e.exam_title),
      examType: String(e.exam_type),
      score: Number(e.score),
      totalQuestions: Number(e.total_questions),
      accuracy: Number(e.accuracy),
      timeTakenSec: Number(e.time_taken_sec),
      offlineRecorded: Number(e.offline_recorded) === 1,
      submittedAt: String(e.submitted_at),
    })),
    syncLogs,
  });
});

teacherRouter.get('/assignments', (_req, res) => {
  const rows = db.prepare(`
    SELECT a.*, c.name as class_name, t.title as topic_title, me.title as exam_title
    FROM assignments a
    JOIN classes c ON c.id = a.class_id
    LEFT JOIN topics t ON t.id = a.topic_id
    LEFT JOIN mock_exams me ON me.id = a.exam_id
    ORDER BY a.created_at DESC
  `).all() as Array<Record<string, unknown>>;

  const result = rows.map((a) => {
    const classStudents = db
      .prepare('SELECT u.id, u.name FROM class_students cs JOIN users u ON u.id = cs.student_id WHERE cs.class_id = ?')
      .all(String(a.class_id)) as Array<{ id: string; name: string }>;

    const target = Number(a.target_questions || 5);
    const completions = classStudents.map((st) => {
      let progress = 0;
      let done = false;
      if (a.assignment_type === 'practice' && a.topic_id) {
        const cnt = (db
          .prepare('SELECT COUNT(*) as c FROM practice_attempts WHERE student_id = ? AND topic_id = ?')
          .get(st.id, String(a.topic_id)) as { c: number }).c;
        progress = cnt;
        done = cnt >= target;
      } else if (a.assignment_type === 'mock_exam' && a.exam_id) {
        const cnt = (db
          .prepare('SELECT COUNT(*) as c FROM exam_attempts WHERE student_id = ? AND exam_id = ?')
          .get(st.id, String(a.exam_id)) as { c: number }).c;
        progress = cnt > 0 ? 1 : 0;
        done = cnt > 0;
      }
      return { studentId: st.id, studentName: st.name, progress, completed: done };
    });

    const completedCount = completions.filter((c) => c.completed).length;

    return {
      id: String(a.id),
      title: String(a.title),
      description: String(a.description || ''),
      classId: String(a.class_id),
      className: String(a.class_name),
      assignmentType: String(a.assignment_type),
      topicId: a.topic_id ? String(a.topic_id) : null,
      topicTitle: a.topic_title ? String(a.topic_title) : null,
      examId: a.exam_id ? String(a.exam_id) : null,
      examTitle: a.exam_title ? String(a.exam_title) : null,
      targetQuestions: target,
      dueDate: String(a.due_date),
      createdAt: String(a.created_at),
      totalStudents: classStudents.length,
      completedCount,
      completions,
    };
  });

  res.json(result);
});

teacherRouter.post('/assignments', (req: AuthRequest, res) => {
  const { title, description = '', classId, assignmentType = 'practice', topicId = null, examId = null, targetQuestions = 5, dueDate } =
    req.body || {};
  if (!title || !classId || !dueDate) {
    res.status(400).json({ error: 'title, classId, and dueDate are required' });
    return;
  }
  const id = `asg-${uuid().slice(0, 8)}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO assignments (id, teacher_id, class_id, title, description, assignment_type, topic_id, exam_id, target_questions, due_date, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.user!.id, classId, String(title).trim(), description, assignmentType, topicId || null, examId || null, Number(targetQuestions), dueDate, now);

  res.status(201).json({ id, title, classId, assignmentType, dueDate });
});

teacherRouter.delete('/assignments/:id', (req, res) => {
  db.prepare('DELETE FROM assignments WHERE id = ?').run(String(req.params.id));
  res.json({ deleted: true });
});

teacherRouter.get('/analytics', (_req, res) => {
  const subjects = db.prepare('SELECT id, name, color FROM subjects').all() as Array<{ id: string; name: string; color: string }>;
  const topics = db.prepare(`
    SELECT t.id, t.title, t.difficulty, t.subject_id, s.name as subject_name
    FROM topics t JOIN subjects s ON s.id = t.subject_id
  `).all() as Array<{ id: string; title: string; difficulty: string; subject_id: string; subject_name: string }>;

  const attempts = db.prepare(`
    SELECT pa.*, u.name as student_name
    FROM practice_attempts pa JOIN users u ON u.id = pa.student_id
  `).all() as Array<Record<string, unknown>>;

  const subjectAnalytics = subjects.map((s) => {
    const sA = attempts.filter((a) => String(a.subject_id) === s.id);
    const c = sA.filter((a) => Number(a.is_correct) === 1).length;
    return {
      subjectId: s.id,
      subjectName: s.name,
      color: s.color,
      attempts: sA.length,
      accuracy: sA.length > 0 ? Math.round((c / sA.length) * 100) : 0,
    };
  });

  const topicAnalytics = topics
    .map((t) => {
      const tA = attempts.filter((a) => String(a.topic_id) === t.id);
      const c = tA.filter((a) => Number(a.is_correct) === 1).length;
      const accuracy = tA.length > 0 ? Math.round((c / tA.length) * 100) : 0;

      // Students struggling on this specific topic
      const byStudent = new Map<string, { name: string; total: number; correct: number }>();
      for (const a of tA) {
        const sid = String(a.student_id);
        const cur = byStudent.get(sid) || { name: String(a.student_name), total: 0, correct: 0 };
        cur.total++;
        if (Number(a.is_correct) === 1) cur.correct++;
        byStudent.set(sid, cur);
      }
      const struggling = Array.from(byStudent.entries())
        .map(([id, v]) => ({ studentId: id, studentName: v.name, accuracy: Math.round((v.correct / v.total) * 100) }))
        .filter((s) => s.accuracy < 65);

      return {
        topicId: t.id,
        title: t.title,
        subjectName: t.subject_name,
        difficulty: t.difficulty,
        attempts: tA.length,
        accuracy,
        strugglingStudents: struggling,
      };
    })
    .sort((a, b) => a.accuracy - b.accuracy);

  const examPerformance = db.prepare(`
    SELECT me.id, me.title, COUNT(ea.id) as submissions, AVG(ea.accuracy) as avg_accuracy, MAX(ea.accuracy) as top_accuracy
    FROM mock_exams me LEFT JOIN exam_attempts ea ON ea.exam_id = me.id
    GROUP BY me.id
  `).all() as Array<Record<string, unknown>>;

  res.json({
    subjectAnalytics,
    topicAnalytics,
    examPerformance: examPerformance.map((e) => ({
      examId: String(e.id),
      title: String(e.title),
      submissions: Number(e.submissions || 0),
      avgAccuracy: e.avg_accuracy ? Math.round(Number(e.avg_accuracy)) : 0,
      topAccuracy: e.top_accuracy ? Math.round(Number(e.top_accuracy)) : 0,
    })),
  });
});
