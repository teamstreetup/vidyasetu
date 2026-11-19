export type UserRole = 'student' | 'teacher' | 'admin';
export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type SyncStatus = 'Synced' | 'Pending' | 'Syncing' | 'Failed';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  grade?: string;
  school?: string;
  village?: string;
  streakDays?: number;
  lastSyncAt?: string | null;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  description: string;
  icon: string;
  color: string;
  version: number;
  topicCount: number;
  questionCount: number;
  updatedAt?: string;
}

export interface Topic {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  title: string;
  chapterNumber: number;
  description: string;
  difficulty: Difficulty;
  estimatedMinutes: number;
  questionCount: number;
  version: number;
  updatedAt?: string;
}

export interface Question {
  id: string;
  topicId: string;
  topicTitle?: string;
  subjectId: string;
  subjectName?: string;
  questionText: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: Difficulty;
  tags?: string;
  version: number;
  updatedAt?: string;
}

export interface PracticeAttempt {
  id: string;
  questionId: string;
  topicId: string;
  subjectId: string;
  selectedIndex: number;
  isCorrect: boolean;
  timeSpentSec: number;
  attemptedAt: string;
  offlineRecorded: boolean;
  synced: boolean;
}

export interface MockExam {
  id: string;
  title: string;
  description: string;
  subjectId: string | null;
  subjectName: string;
  subjectColor: string;
  examType: 'Full Olympiad' | 'Subject Test';
  durationMinutes: number;
  difficulty: Difficulty;
  questionCount: number;
  questionIds: string[];
  version: number;
  attemptCount?: number;
  bestAccuracy?: number | null;
}

export interface ExamAttempt {
  id: string;
  examId: string;
  examTitle?: string;
  examType?: string;
  answers: Record<string, number>;
  markedReview: string[];
  score: number;
  totalQuestions: number;
  accuracy: number;
  timeTakenSec: number;
  autoSubmitted: boolean;
  startedAt: string;
  submittedAt: string;
  offlineRecorded: boolean;
  synced: boolean;
}

export interface LocalSyncLog {
  id: string;
  status: SyncStatus;
  attemptsSynced: number;
  examsSynced: number;
  message: string;
  timestamp: string;
}

export interface StudentProgressData {
  summary: {
    totalAttempted: number;
    totalCorrect: number;
    overallAccuracy: number;
    overallCompletion: number;
    streakDays: number;
    lastSyncAt: string | null;
    mockExamsTaken: number;
    incorrectCount: number;
  };
  lastActivity: {
    topicId: string;
    topicTitle: string;
    subjectName: string;
    attemptedAt: string;
  } | null;
  subjectStats: Array<{
    subjectId: string;
    subjectName: string;
    color: string;
    attempted: number;
    correct: number;
    accuracy: number;
    uniqueAttempted: number;
    totalQuestions: number;
    completion: number;
  }>;
  topicStats: Array<{
    topicId: string;
    subjectId: string;
    subjectName: string;
    subjectColor: string;
    title: string;
    chapterNumber: number;
    difficulty: Difficulty;
    attempted: number;
    correct: number;
    accuracy: number;
    uniqueAttempted: number;
    totalQuestions: number;
    completion: number;
    status: string;
  }>;
  dailyTrend: Array<{ date: string; attempted: number; correct: number; accuracy: number }>;
  incorrectQuestionIds: string[];
  recentActivities: Array<{
    id: string;
    questionId: string;
    questionText: string;
    topicId: string;
    topicTitle: string;
    subjectName: string;
    isCorrect: boolean;
    difficulty: string;
    offlineRecorded: boolean;
    attemptedAt: string;
  }>;
  examHistory: Array<{
    id: string;
    examId: string;
    examTitle: string;
    examType: string;
    score: number;
    totalQuestions: number;
    accuracy: number;
    timeTakenSec: number;
    autoSubmitted: boolean;
    offlineRecorded: boolean;
    submittedAt: string;
  }>;
  assignments: Array<{
    id: string;
    title: string;
    description: string;
    className: string;
    assignmentType: 'practice' | 'mock_exam';
    topicId: string | null;
    topicTitle: string | null;
    examId: string | null;
    examTitle: string | null;
    targetQuestions: number;
    currentCount: number;
    completed: boolean;
    dueDate: string;
  }>;
  achievements: Array<{
    id: string;
    title: string;
    desc: string;
    earned: boolean;
    icon: string;
  }>;
}

export interface RecommendationsData {
  weakTopics: Array<{
    topicId: string;
    subjectId: string;
    subjectName: string;
    subjectColor: string;
    title: string;
    difficulty: Difficulty;
    attempted: number;
    accuracy: number | null;
    recommendedDifficulty: Difficulty;
    reason: string;
  }>;
  nextRecommendedTopic: {
    topicId: string;
    subjectId: string;
    subjectName: string;
    title: string;
    recommendedDifficulty: Difficulty;
    reason: string;
    accuracy: number | null;
  } | null;
  recommendedQuestions: Array<{
    id: string;
    topicId: string;
    topicTitle: string;
    subjectName: string;
    questionText: string;
    difficulty: Difficulty;
    priority: number;
    rationale: string;
  }>;
  revisionActivities: Array<{
    type: string;
    title: string;
    subtitle: string;
    actionLabel: string;
    topicId: string | null;
    difficulty: Difficulty | null;
  }>;
  difficultyProgression: Array<{
    topicId: string;
    subjectName: string;
    title: string;
    attempted: number;
    accuracy: number | null;
    recommendedDifficulty: Difficulty;
    reason: string;
  }>;
}
