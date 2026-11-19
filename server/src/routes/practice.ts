import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../db.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';

export const practiceRouter = Router();

practiceRouter.post('/attempts', authenticate, (req: AuthRequest, res) => {
  const payload = Array.isArray(req.body?.attempts) ? req.body.attempts : [req.body];
  const studentId = req.user!.id;
  const now = new Date().toISOString();

  const insert = db.prepare(`
    INSERT OR IGNORE INTO practice_attempts
      (id, student_id, question_id, topic_id, subject_id, selected_index, is_correct, time_spent_sec, attempted_at, synced_at, offline_recorded)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let saved = 0;
  for (const a of payload) {
    if (!a || !a.questionId || typeof a.selectedIndex !== 'number') continue;
    const q = db.prepare('SELECT id, topic_id, subject_id, correct_index FROM questions WHERE id = ?').get(String(a.questionId)) as
      | { id: string; topic_id: string; subject_id: string; correct_index: number }
      | undefined;
    if (!q) continue;

    const isCorrect = q.correct_index === a.selectedIndex ? 1 : 0;
    const result = insert.run(
      a.id ? String(a.id) : uuid(),
      studentId,
      q.id,
      q.topic_id,
      q.subject_id,
      a.selectedIndex,
      isCorrect,
      Number(a.timeSpentSec || 20),
      a.attemptedAt ? String(a.attemptedAt) : now,
      now,
      a.offlineRecorded ? 1 : 0
    );
    if (result.changes > 0) saved++;
  }

  db.prepare('UPDATE users SET last_sync_at = ?, last_active_date = ? WHERE id = ?').run(now, now.slice(0, 10), studentId);
  res.json({ saved, syncedAt: now });
});

practiceRouter.get('/progress', authenticate, (req: AuthRequest, res) => {
  const studentId = req.user!.id;

  const attempts = db.prepare(`
    SELECT pa.*, q.question_text, q.difficulty as q_difficulty, t.title as topic_title, s.name as subject_name, s.color as subject_color
    FROM practice_attempts pa
    LEFT JOIN questions q ON q.id = pa.question_id
    LEFT JOIN topics t ON t.id = pa.topic_id
    LEFT JOIN subjects s ON s.id = pa.subject_id
    WHERE pa.student_id = ?
    ORDER BY pa.attempted_at DESC
  `).all(studentId) as Array<Record<string, unknown>>;

  const subjects = db.prepare('SELECT * FROM subjects ORDER BY name ASC').all() as Array<Record<string, unknown>>;
  const topics = db.prepare(`
    SELECT t.*, s.name as subject_name, s.color as subject_color,
      (SELECT COUNT(*) FROM questions q WHERE q.topic_id = t.id AND q.is_published = 1) as total_questions
    FROM topics t JOIN subjects s ON s.id = t.subject_id
    WHERE t.is_published = 1
    ORDER BY s.name ASC, t.chapter_number ASC
  `).all() as Array<Record<string, unknown>>;

  const totalAttempted = attempts.length;
  const totalCorrect = attempts.filter((a) => Number(a.is_correct) === 1).length;
  const overallAccuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

  // Unique questions mastered / attempted
  const latestByQuestion = new Map<string, Record<string, unknown>>();
  for (const a of attempts) {
    const qid = String(a.question_id);
    if (!latestByQuestion.has(qid)) latestByQuestion.set(qid, a);
  }
  const incorrectQuestionIds = Array.from(latestByQuestion.values())
    .filter((a) => Number(a.is_correct) === 0)
    .map((a) => String(a.question_id));

  const totalPublishedQuestions = (db.prepare('SELECT COUNT(*) as c FROM questions WHERE is_published = 1').get() as { c: number }).c || 1;
  const overallCompletion = Math.min(100, Math.round((latestByQuestion.size / totalPublishedQuestions) * 100));

  // Subject-wise accuracy & completion
  const subjectStats = subjects.map((s) => {
    const sid = String(s.id);
    const subAttempts = attempts.filter((a) => String(a.subject_id) === sid);
    const subCorrect = subAttempts.filter((a) => Number(a.is_correct) === 1).length;
    const subUnique = new Set(subAttempts.map((a) => String(a.question_id))).size;
    const totalQ = (db.prepare('SELECT COUNT(*) as c FROM questions WHERE subject_id = ? AND is_published = 1').get(sid) as { c: number }).c || 1;
    return {
      subjectId: sid,
      subjectName: String(s.name),
      color: String(s.color),
      attempted: subAttempts.length,
      correct: subCorrect,
      accuracy: subAttempts.length > 0 ? Math.round((subCorrect / subAttempts.length) * 100) : 0,
      uniqueAttempted: subUnique,
      totalQuestions: totalQ,
      completion: Math.min(100, Math.round((subUnique / totalQ) * 100)),
    };
  });

  // Topic-wise stats
  const topicStats = topics.map((t) => {
    const tid = String(t.id);
    const tAttempts = attempts.filter((a) => String(a.topic_id) === tid);
    const tCorrect = tAttempts.filter((a) => Number(a.is_correct) === 1).length;
    const uniqueQ = new Set(tAttempts.map((a) => String(a.question_id))).size;
    const totalQ = Number(t.total_questions || 0);
    const accuracy = tAttempts.length > 0 ? Math.round((tCorrect / tAttempts.length) * 100) : 0;
    const completion = totalQ > 0 ? Math.min(100, Math.round((uniqueQ / totalQ) * 100)) : 0;
    return {
      topicId: tid,
      subjectId: String(t.subject_id),
      subjectName: String(t.subject_name),
      subjectColor: String(t.subject_color),
      title: String(t.title),
      chapterNumber: Number(t.chapter_number),
      difficulty: String(t.difficulty),
      attempted: tAttempts.length,
      correct: tCorrect,
      accuracy,
      uniqueAttempted: uniqueQ,
      totalQuestions: totalQ,
      completion,
      status: tAttempts.length === 0 ? 'Not Started' : accuracy < 65 ? 'Needs Revision' : accuracy < 85 ? 'Developing' : 'Strong',
    };
  });

  // Daily trend (last 7 active days)
  const byDay = new Map<string, { date: string; attempted: number; correct: number }>();
  for (const a of [...attempts].reverse()) {
    const day = String(a.attempted_at).slice(0, 10);
    const cur = byDay.get(day) || { date: day, attempted: 0, correct: 0 };
    cur.attempted += 1;
    cur.correct += Number(a.is_correct) === 1 ? 1 : 0;
    byDay.set(day, cur);
  }
  const dailyTrend = Array.from(byDay.values()).slice(-7).map((d) => ({
    ...d,
    accuracy: d.attempted > 0 ? Math.round((d.correct / d.attempted) * 100) : 0,
  }));

  // Assigned tasks for student's classes
  const assignments = db.prepare(`
    SELECT a.*, c.name as class_name, t.title as topic_title, e.title as exam_title
    FROM assignments a
    JOIN class_students cs ON cs.class_id = a.class_id
    JOIN classes c ON c.id = a.class_id
    LEFT JOIN topics t ON t.id = a.topic_id
    LEFT JOIN mock_exams e ON e.id = a.exam_id
    WHERE cs.student_id = ?
    ORDER BY a.due_date ASC
  `).all(studentId) as Array<Record<string, unknown>>;

  const examAttempts = db.prepare(`
    SELECT ea.*, me.title as exam_title, me.exam_type
    FROM exam_attempts ea JOIN mock_exams me ON me.id = ea.exam_id
    WHERE ea.student_id = ?
    ORDER BY ea.submitted_at DESC
  `).all(studentId) as Array<Record<string, unknown>>;

  const assignmentsWithProgress = assignments.map((asg) => {
    let completed = false;
    let currentCount = 0;
    const target = Number(asg.target_questions || 5);
    if (asg.assignment_type === 'practice' && asg.topic_id) {
      currentCount = attempts.filter((a) => String(a.topic_id) === String(asg.topic_id)).length;
      completed = currentCount >= target;
    } else if (asg.assignment_type === 'mock_exam' && asg.exam_id) {
      const done = examAttempts.some((ea) => String(ea.exam_id) === String(asg.exam_id));
      currentCount = done ? 1 : 0;
      completed = done;
    }
    return {
      id: String(asg.id),
      title: String(asg.title),
      description: String(asg.description || ''),
      className: String(asg.class_name),
      assignmentType: String(asg.assignment_type),
      topicId: asg.topic_id ? String(asg.topic_id) : null,
      topicTitle: asg.topic_title ? String(asg.topic_title) : null,
      examId: asg.exam_id ? String(asg.exam_id) : null,
      examTitle: asg.exam_title ? String(asg.exam_title) : null,
      targetQuestions: target,
      currentCount,
      completed,
      dueDate: String(asg.due_date),
    };
  });

  const userRow = db.prepare('SELECT streak_days, last_sync_at FROM users WHERE id = ?').get(studentId) as {
    streak_days: number;
    last_sync_at: string | null;
  };

  // Achievements / Milestones
  const achievements = [
    { id: 'ach-first', title: 'First Steps', desc: 'Attempted your first 10 Olympiad questions', earned: totalAttempted >= 10, icon: 'sparkles' },
    { id: 'ach-streak', title: '5-Day Learning Streak', desc: 'Consistent daily Olympiad preparation', earned: (userRow?.streak_days || 0) >= 5, icon: 'flame' },
    { id: 'ach-offline', title: 'Offline Warrior', desc: 'Practiced questions without internet connectivity', earned: attempts.some((a) => Number(a.offline_recorded) === 1), icon: 'wifi-off' },
    { id: 'ach-mock', title: 'Mock Challenger', desc: 'Completed at least one timed Mock Examination', earned: examAttempts.length >= 1, icon: 'award' },
    { id: 'ach-sharp', title: 'Accuracy Ace', desc: 'Scored 80%+ on a Mock Examination', earned: examAttempts.some((e) => Number(e.accuracy) >= 80), icon: 'trophy' },
  ];

  // Continue Learning pointer
  const lastActivity = attempts[0]
    ? {
        topicId: String(attempts[0].topic_id),
        topicTitle: String(attempts[0].topic_title || 'Practice'),
        subjectName: String(attempts[0].subject_name || ''),
        attemptedAt: String(attempts[0].attempted_at),
      }
    : null;

  res.json({
    summary: {
      totalAttempted,
      totalCorrect,
      overallAccuracy,
      overallCompletion,
      streakDays: userRow?.streak_days || 1,
      lastSyncAt: userRow?.last_sync_at || null,
      mockExamsTaken: examAttempts.length,
      incorrectCount: incorrectQuestionIds.length,
    },
    lastActivity,
    subjectStats,
    topicStats,
    dailyTrend,
    incorrectQuestionIds,
    recentActivities: attempts.slice(0, 12).map((a) => ({
      id: String(a.id),
      questionId: String(a.question_id),
      questionText: String(a.question_text || ''),
      topicId: String(a.topic_id),
      topicTitle: String(a.topic_title || ''),
      subjectName: String(a.subject_name || ''),
      isCorrect: Number(a.is_correct) === 1,
      difficulty: String(a.q_difficulty || 'Medium'),
      offlineRecorded: Number(a.offline_recorded) === 1,
      attemptedAt: String(a.attempted_at),
    })),
    examHistory: examAttempts.map((e) => ({
      id: String(e.id),
      examId: String(e.exam_id),
      examTitle: String(e.exam_title),
      examType: String(e.exam_type),
      score: Number(e.score),
      totalQuestions: Number(e.total_questions),
      accuracy: Number(e.accuracy),
      timeTakenSec: Number(e.time_taken_sec),
      autoSubmitted: Number(e.auto_submitted) === 1,
      offlineRecorded: Number(e.offline_recorded) === 1,
      submittedAt: String(e.submitted_at),
    })),
    assignments: assignmentsWithProgress,
    achievements,
  });
});

practiceRouter.get('/recommendations', authenticate, (req: AuthRequest, res) => {
  const studentId = req.user!.id;

  const attempts = db.prepare('SELECT * FROM practice_attempts WHERE student_id = ? ORDER BY attempted_at DESC').all(studentId) as Array<
    Record<string, unknown>
  >;
  const topics = db.prepare(`
    SELECT t.*, s.name as subject_name, s.color as subject_color
    FROM topics t JOIN subjects s ON s.id = t.subject_id
    WHERE t.is_published = 1
    ORDER BY s.name ASC, t.chapter_number ASC
  `).all() as Array<Record<string, unknown>>;

  const allQuestions = db.prepare('SELECT * FROM questions WHERE is_published = 1').all() as Array<Record<string, unknown>>;

  const topicPerf = topics.map((t) => {
    const tid = String(t.id);
    const tAttempts = attempts.filter((a) => String(a.topic_id) === tid);
    const correct = tAttempts.filter((a) => Number(a.is_correct) === 1).length;
    const accuracy = tAttempts.length > 0 ? Math.round((correct / tAttempts.length) * 100) : null;

    // Determine adaptive difficulty recommendation
    let recommendedDifficulty: 'Easy' | 'Medium' | 'Hard' = 'Easy';
    let reason = 'Start with foundational Easy problems to build confidence.';
    if (accuracy !== null) {
      if (accuracy < 55) {
        recommendedDifficulty = 'Easy';
        reason = `Accuracy is ${accuracy}% — reinforce core concepts with Easy questions and review explanations.`;
      } else if (accuracy < 80) {
        recommendedDifficulty = 'Medium';
        reason = `Solid foundation (${accuracy}% accuracy) — step up to Medium Olympiad questions.`;
      } else {
        recommendedDifficulty = 'Hard';
        reason = `Strong mastery (${accuracy}% accuracy) — challenge yourself with Hard Olympiad problems!`;
      }
    }

    return {
      topicId: tid,
      subjectId: String(t.subject_id),
      subjectName: String(t.subject_name),
      subjectColor: String(t.subject_color),
      title: String(t.title),
      difficulty: String(t.difficulty),
      attempted: tAttempts.length,
      accuracy,
      recommendedDifficulty,
      reason,
    };
  });

  const weakTopics = topicPerf
    .filter((t) => t.accuracy !== null && t.accuracy < 70)
    .sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0));

  const nextTopic =
    weakTopics[0] ||
    topicPerf.find((t) => t.attempted === 0) ||
    topicPerf.sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0))[0] ||
    null;

  // Recommend suitable practice questions (prioritize weak topic + unattempted/incorrect + adaptive difficulty)
  const latestCorrectMap = new Map<string, boolean>();
  for (const a of attempts) {
    const qid = String(a.question_id);
    if (!latestCorrectMap.has(qid)) latestCorrectMap.set(qid, Number(a.is_correct) === 1);
  }

  const weakIds = new Set(weakTopics.map((w) => w.topicId));
  const scoredQuestions = allQuestions
    .map((q) => {
      const qid = String(q.id);
      const tid = String(q.topic_id);
      const status = latestCorrectMap.get(qid);
      const tInfo = topicPerf.find((t) => t.topicId === tid);
      let priority = 0;
      let rationale = 'Adaptive progression question';

      if (status === false) {
        priority += 50;
        rationale = 'Previously answered incorrectly — recommended for revision';
      } else if (status === undefined) {
        priority += 30;
        rationale = 'New unseen Olympiad question';
      } else {
        priority += 5;
      }

      if (weakIds.has(tid)) {
        priority += 35;
        rationale = `Targets weak topic: ${tInfo?.title || ''}`;
      }
      if (tInfo && String(q.difficulty) === tInfo.recommendedDifficulty) {
        priority += 20;
      }

      return {
        id: qid,
        topicId: tid,
        topicTitle: tInfo?.title || '',
        subjectName: tInfo?.subjectName || '',
        questionText: String(q.question_text),
        difficulty: String(q.difficulty),
        priority,
        rationale,
      };
    })
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 8);

  const revisionActivities = [
    ...weakTopics.slice(0, 3).map((w) => ({
      type: 'weak_topic_drill',
      title: `Revise ${w.title}`,
      subtitle: `${w.subjectName} • Current Accuracy: ${w.accuracy}%`,
      actionLabel: `Practice ${w.recommendedDifficulty} Questions`,
      topicId: w.topicId,
      difficulty: w.recommendedDifficulty,
    })),
    ...(Array.from(latestCorrectMap.values()).filter((v) => !v).length > 0
      ? [
          {
            type: 'retry_incorrect',
            title: 'Retry Incorrectly Answered Questions',
            subtitle: `${Array.from(latestCorrectMap.values()).filter((v) => !v).length} questions waiting for mastery`,
            actionLabel: 'Start Error Revision',
            topicId: null,
            difficulty: null,
          },
        ]
      : []),
  ];

  res.json({
    weakTopics,
    nextRecommendedTopic: nextTopic,
    recommendedQuestions: scoredQuestions,
    revisionActivities,
    difficultyProgression: topicPerf,
  });
});
