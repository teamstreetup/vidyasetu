import type { ExamAttempt, PracticeAttempt, RecommendationsData, StudentProgressData, Topic } from '../types';

/**
 * Merges cached server StudentProgressData with unsynced local IndexedDB attempts
 * so offline practice & mock exams immediately update dashboards and adaptive recommendations.
 */
export function mergeOfflineProgress(
  base: StudentProgressData | null,
  pendingPractice: PracticeAttempt[],
  pendingExams: ExamAttempt[],
  topics: Topic[]
): StudentProgressData {
  const safeBase: StudentProgressData = base
    ? structuredClone(base)
    : {
        summary: {
          totalAttempted: 0,
          totalCorrect: 0,
          overallAccuracy: 0,
          overallCompletion: 0,
          streakDays: 1,
          lastSyncAt: null,
          mockExamsTaken: 0,
          incorrectCount: 0,
        },
        lastActivity: null,
        subjectStats: [],
        topicStats: topics.map((t) => ({
          topicId: t.id,
          subjectId: t.subjectId,
          subjectName: t.subjectName,
          subjectColor: t.subjectColor,
          title: t.title,
          chapterNumber: t.chapterNumber,
          difficulty: t.difficulty,
          attempted: 0,
          correct: 0,
          accuracy: 0,
          uniqueAttempted: 0,
          totalQuestions: t.questionCount,
          completion: 0,
          status: 'Not Started',
        })),
        dailyTrend: [],
        incorrectQuestionIds: [],
        recentActivities: [],
        examHistory: [],
        assignments: [],
        achievements: [],
      };

  if (pendingPractice.length === 0 && pendingExams.length === 0) {
    return safeBase;
  }

  const topicMap = new Map(topics.map((t) => [t.id, t]));
  const existingRecentIds = new Set(safeBase.recentActivities.map((r) => r.id));

  for (const att of pendingPractice) {
    if (existingRecentIds.has(att.id)) continue;

    safeBase.summary.totalAttempted += 1;
    if (att.isCorrect) safeBase.summary.totalCorrect += 1;

    const tStat = safeBase.topicStats.find((t) => t.topicId === att.topicId);
    if (tStat) {
      tStat.attempted += 1;
      if (att.isCorrect) tStat.correct += 1;
      tStat.accuracy = Math.round((tStat.correct / tStat.attempted) * 100);
      tStat.uniqueAttempted = Math.min(tStat.totalQuestions || 5, tStat.uniqueAttempted + 1);
      tStat.completion = tStat.totalQuestions > 0 ? Math.min(100, Math.round((tStat.uniqueAttempted / tStat.totalQuestions) * 100)) : tStat.completion;
      tStat.status = tStat.accuracy < 65 ? 'Needs Revision' : tStat.accuracy < 85 ? 'Developing' : 'Strong';
    }

    const sStat = safeBase.subjectStats.find((s) => s.subjectId === att.subjectId);
    if (sStat) {
      sStat.attempted += 1;
      if (att.isCorrect) sStat.correct += 1;
      sStat.accuracy = Math.round((sStat.correct / sStat.attempted) * 100);
    }

    if (!att.isCorrect && !safeBase.incorrectQuestionIds.includes(att.questionId)) {
      safeBase.incorrectQuestionIds.push(att.questionId);
    } else if (att.isCorrect) {
      safeBase.incorrectQuestionIds = safeBase.incorrectQuestionIds.filter((id) => id !== att.questionId);
    }

    const topicInfo = topicMap.get(att.topicId);
    safeBase.recentActivities.unshift({
      id: att.id,
      questionId: att.questionId,
      questionText: 'Recorded offline (pending sync)',
      topicId: att.topicId,
      topicTitle: topicInfo?.title || 'Topic Practice',
      subjectName: topicInfo?.subjectName || '',
      isCorrect: att.isCorrect,
      difficulty: topicInfo?.difficulty || 'Medium',
      offlineRecorded: true,
      attemptedAt: att.attemptedAt,
    });
  }

  safeBase.recentActivities = safeBase.recentActivities.slice(0, 14);
  safeBase.summary.overallAccuracy =
    safeBase.summary.totalAttempted > 0
      ? Math.round((safeBase.summary.totalCorrect / safeBase.summary.totalAttempted) * 100)
      : 0;
  safeBase.summary.incorrectCount = safeBase.incorrectQuestionIds.length;

  // Merge pending exam attempts
  const existingExamIds = new Set(safeBase.examHistory.map((e) => e.id));
  for (const ea of pendingExams) {
    if (existingExamIds.has(ea.id)) continue;
    safeBase.summary.mockExamsTaken += 1;
    safeBase.examHistory.unshift({
      id: ea.id,
      examId: ea.examId,
      examTitle: ea.examTitle || 'Downloaded Mock Exam',
      examType: ea.examType || 'Mock Exam',
      score: ea.score,
      totalQuestions: ea.totalQuestions,
      accuracy: ea.accuracy,
      timeTakenSec: ea.timeTakenSec,
      autoSubmitted: ea.autoSubmitted,
      offlineRecorded: true,
      submittedAt: ea.submittedAt,
    });
  }

  return safeBase;
}

export function buildOfflineRecommendations(progress: StudentProgressData): RecommendationsData {
  const progression = progress.topicStats.map((t) => {
    let recommendedDifficulty: 'Easy' | 'Medium' | 'Hard' = 'Easy';
    let reason = 'Begin with foundational Easy problems.';
    if (t.attempted > 0) {
      if (t.accuracy < 55) {
        recommendedDifficulty = 'Easy';
        reason = `Accuracy is ${t.accuracy}% — revisit Easy concepts and study explanations.`;
      } else if (t.accuracy < 80) {
        recommendedDifficulty = 'Medium';
        reason = `Accuracy is ${t.accuracy}% — practice Medium Olympiad questions.`;
      } else {
        recommendedDifficulty = 'Hard';
        reason = `Strong accuracy (${t.accuracy}%) — ready for Hard Olympiad challenges!`;
      }
    }
    return {
      topicId: t.topicId,
      subjectId: t.subjectId,
      subjectName: t.subjectName,
      subjectColor: t.subjectColor,
      title: t.title,
      difficulty: t.difficulty,
      attempted: t.attempted,
      accuracy: t.attempted > 0 ? t.accuracy : null,
      recommendedDifficulty,
      reason,
    };
  });

  const weakTopics = progression
    .filter((t) => t.accuracy !== null && t.accuracy < 70)
    .sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0));

  const nextRecommendedTopic = weakTopics[0] || progression.find((t) => t.attempted === 0) || progression[0] || null;

  return {
    weakTopics,
    nextRecommendedTopic,
    recommendedQuestions: [],
    revisionActivities: weakTopics.slice(0, 3).map((w) => ({
      type: 'weak_topic_drill',
      title: `Revise ${w.title}`,
      subtitle: `${w.subjectName} • Current Accuracy: ${w.accuracy}%`,
      actionLabel: `Practice ${w.recommendedDifficulty} Questions`,
      topicId: w.topicId,
      difficulty: w.recommendedDifficulty,
    })),
    difficultyProgression: progression,
  };
}
