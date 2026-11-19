import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Clock,
  Download,
  Flag,
  Play,
  CheckCircle2,
  XCircle,
  Loader2,
  Lock,
  Trash2,
  WifiOff,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Send,
  ClipboardCheck,
} from 'lucide-react';
import { useOffline } from '../../context/OfflineContext';
import { apiFetch } from '../../lib/api';
import { getLocalDB } from '../../lib/db';
import type { ExamAttempt, MockExam, Question } from '../../types';
import { DifficultyBadge, OfflineAvailabilityBadge, formatRelativeTime } from '../../components/Badges';
import { CircularProgress, EmptyState, SkeletonPage } from '../../components/UI';

interface ActiveExamSession {
  exam: MockExam;
  questions: Question[];
  startedAt: string;
  remainingSec: number;
  answers: Record<string, number>;
  markedReview: string[];
  currentIndex: number;
}

interface CompletedResult {
  exam: MockExam;
  questions: Question[];
  attempt: ExamAttempt;
}

export const MockExams: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { isOnline, downloadedExamIds, busyDownloads, downloadExam, removeDownloadedExam, recordExamAttempt } = useOffline();

  const [tab, setTab] = useState<'available' | 'attempts'>('available');
  const [exams, setExams] = useState<MockExam[]>([]);
  const [myAttempts, setMyAttempts] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<ActiveExamSession | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [result, setResult] = useState<CompletedResult | null>(null);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'wrong' | 'marked'>('all');
  const [notice, setNotice] = useState<string | null>(null);

  const autoSubmitRef = useRef(false);

  const loadData = async () => {
    const db = await getLocalDB();
    const localAttempts = await db.getAll('examAttempts');

    if (isOnline) {
      try {
        const [examList, serverAttempts] = await Promise.all([
          apiFetch<MockExam[]>('/exams'),
          apiFetch<ExamAttempt[]>('/exams/my-attempts'),
        ]);
        const tx = db.transaction('exams', 'readwrite');
        for (const e of examList) await tx.store.put(e);
        await tx.done;

        const serverIds = new Set(serverAttempts.map((a) => a.id));
        const unsynced = localAttempts.filter((a) => !serverIds.has(a.id));
        setExams(examList);
        setMyAttempts([...unsynced, ...serverAttempts].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)));
        setLoading(false);
        return;
      } catch {
        // fallback offline
      }
    }

    const cachedExams = await db.getAll('exams');
    setExams(cachedExams);
    setMyAttempts(localAttempts.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)));
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, [isOnline]);

  useEffect(() => {
    const startId = searchParams.get('start');
    if (startId && exams.length > 0 && !session && !result) {
      const target = exams.find((e) => e.id === startId);
      if (target && (isOnline || downloadedExamIds.has(target.id))) {
        void startExam(target);
      }
    }
  }, [searchParams, exams.length]);

  const submitExam = async (currentSession: ActiveExamSession, autoSubmitted = false) => {
    setConfirmSubmit(false);
    const totalSec = currentSession.exam.durationMinutes * 60;
    const timeTakenSec = Math.max(5, totalSec - currentSession.remainingSec);

    let score = 0;
    for (const q of currentSession.questions) {
      if (currentSession.answers[q.id] === q.correctIndex) score++;
    }
    const totalQuestions = currentSession.questions.length || 1;
    const accuracy = Math.round((score / totalQuestions) * 100);

    const saved = await recordExamAttempt({
      examId: currentSession.exam.id,
      examTitle: currentSession.exam.title,
      examType: currentSession.exam.examType,
      answers: currentSession.answers,
      markedReview: currentSession.markedReview,
      score,
      totalQuestions,
      accuracy,
      timeTakenSec,
      autoSubmitted,
      startedAt: currentSession.startedAt,
      submittedAt: new Date().toISOString(),
    });

    setResult({ exam: currentSession.exam, questions: currentSession.questions, attempt: saved });
    setReviewFilter('all');
    setSession(null);
    autoSubmitRef.current = false;
    await loadData();
  };

  useEffect(() => {
    if (!session) return;
    if (session.remainingSec <= 0) {
      if (!autoSubmitRef.current) {
        autoSubmitRef.current = true;
        void submitExam(session, true);
      }
      return;
    }
    const id = setInterval(() => {
      setSession((prev) => (prev ? { ...prev, remainingSec: Math.max(0, prev.remainingSec - 1) } : null));
    }, 1000);
    return () => clearInterval(id);
  }, [session?.remainingSec, Boolean(session)]);

  const startExam = async (exam: MockExam) => {
    setNotice(null);
    const db = await getLocalDB();

    if (isOnline) {
      try {
        const bundle = await apiFetch<{ exam: MockExam; questions: Question[] }>(`/exams/${exam.id}/bundle`);
        setSession({
          exam: bundle.exam,
          questions: bundle.questions,
          startedAt: new Date().toISOString(),
          remainingSec: bundle.exam.durationMinutes * 60,
          answers: {},
          markedReview: [],
          currentIndex: 0,
        });
        setResult(null);
        return;
      } catch {
        // fallback offline
      }
    }

    if (!downloadedExamIds.has(exam.id)) {
      setNotice('This mock exam is Online-Only. Download it while online to attempt it offline.');
      return;
    }

    const allLocalQs = await db.getAll('questions');
    const qMap = new Map(allLocalQs.map((q) => [q.id, q]));
    const ordered = exam.questionIds.map((id) => qMap.get(id)).filter((q): q is Question => Boolean(q));

    if (ordered.length === 0) {
      setNotice('Exam questions not found in IndexedDB. Please re-download when online.');
      return;
    }

    setSession({
      exam,
      questions: ordered,
      startedAt: new Date().toISOString(),
      remainingSec: exam.durationMinutes * 60,
      answers: {},
      markedReview: [],
      currentIndex: 0,
    });
    setResult(null);
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // ==================== ACTIVE TIMED EXAM VIEW ====================
  if (session) {
    const q = session.questions[session.currentIndex];
    const isMarked = session.markedReview.includes(q.id);
    const selected = session.answers[q.id];
    const answeredCount = Object.keys(session.answers).length;
    const unansweredCount = session.questions.length - answeredCount;
    const lowTime = session.remainingSec <= 120;
    const timePct = Math.round((session.remainingSec / (session.exam.durationMinutes * 60)) * 100);

    return (
      <div className="space-y-5">
        {/* Exam Header */}
        <div className="card-surface rounded-2xl overflow-hidden">
          <div className="h-1 bg-slate-100 w-full">
            <div
              className={`h-full transition-all duration-1000 ${lowTime ? 'bg-rose-500' : 'bg-blue-600'}`}
              style={{ width: `${timePct}%` }}
            />
          </div>
          <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20 text-[11px] font-bold">
                  {session.exam.examType}
                </span>
                {!isOnline && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20 text-[11px] font-semibold">
                    <WifiOff className="w-3 h-3" /> Offline Exam
                  </span>
                )}
              </div>
              <h1 className="font-display font-bold text-slate-900 mt-1 text-base sm:text-lg">{session.exam.title}</h1>
            </div>

            <div className="flex items-center gap-3">
              <div
                className={`font-mono-num flex items-center gap-2 px-4 py-2 rounded-xl text-base sm:text-lg font-bold border ${
                  lowTime
                    ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                    : 'bg-[#0f2440] text-white border-[#0f2440]'
                }`}
              >
                <Clock className="w-4 h-4" />
                {formatTimer(session.remainingSec)}
              </div>

              <button
                onClick={() => setConfirmSubmit(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm transition cursor-pointer"
              >
                <Send className="w-4 h-4" />
                Submit ({answeredCount}/{session.questions.length})
              </button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Question Workspace */}
          <div className="lg:col-span-3 card-surface rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-bold text-slate-800 tabular-nums">
                  Question {session.currentIndex + 1} <span className="text-slate-400 font-medium">of {session.questions.length}</span>
                </span>
                <DifficultyBadge difficulty={q.difficulty} />
              </div>

              <button
                type="button"
                onClick={() =>
                  setSession((prev) => {
                    if (!prev) return null;
                    const exists = prev.markedReview.includes(q.id);
                    return {
                      ...prev,
                      markedReview: exists
                        ? prev.markedReview.filter((id) => id !== q.id)
                        : [...prev.markedReview, q.id],
                    };
                  })
                }
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                  isMarked
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Flag className={`w-3.5 h-3.5 ${isMarked ? 'fill-amber-400 text-amber-600' : ''}`} />
                {isMarked ? 'Marked for Review' : 'Mark for Review'}
              </button>
            </div>

            <h2 className="font-display text-lg sm:text-[20px] font-bold text-slate-900 leading-snug">{q.questionText}</h2>

            <div className="space-y-3">
              {q.options.map((opt, idx) => {
                const active = selected === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() =>
                      setSession((prev) => (prev ? { ...prev, answers: { ...prev.answers, [q.id]: idx } } : null))
                    }
                    className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-3.5 cursor-pointer ${
                      active
                        ? 'border-blue-600 bg-blue-50/70 ring-4 ring-blue-100/80'
                        : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50/70'
                    }`}
                  >
                    <span
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                        active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {['A', 'B', 'C', 'D'][idx]}
                    </span>
                    <span className="text-sm sm:text-[15px] font-medium text-slate-800">{opt}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                disabled={session.currentIndex === 0}
                onClick={() => setSession((prev) => (prev ? { ...prev, currentIndex: prev.currentIndex - 1 } : null))}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>

              {selected !== undefined && (
                <button
                  type="button"
                  onClick={() =>
                    setSession((prev) => {
                      if (!prev) return null;
                      const copy = { ...prev.answers };
                      delete copy[q.id];
                      return { ...prev, answers: copy };
                    })
                  }
                  className="text-xs font-semibold text-slate-400 hover:text-rose-600 cursor-pointer"
                >
                  Clear Response
                </button>
              )}

              <button
                type="button"
                disabled={session.currentIndex === session.questions.length - 1}
                onClick={() => setSession((prev) => (prev ? { ...prev, currentIndex: prev.currentIndex + 1 } : null))}
                className="btn-primary inline-flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-40 cursor-pointer"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Question Navigator Palette */}
          <div className="card-surface rounded-2xl p-5 h-fit space-y-4">
            <h3 className="font-display font-bold text-sm text-slate-900">Question Palette</h3>
            <div className="grid grid-cols-5 gap-2">
              {session.questions.map((item, idx) => {
                const ans = session.answers[item.id] !== undefined;
                const rev = session.markedReview.includes(item.id);
                const isCur = idx === session.currentIndex;

                let cls = 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/70';
                if (rev) cls = 'bg-amber-100 text-amber-900 border-amber-400';
                else if (ans) cls = 'bg-emerald-600 text-white border-emerald-600';

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSession((prev) => (prev ? { ...prev, currentIndex: idx } : null))}
                    className={`h-9 rounded-xl text-xs font-bold border tabular-nums transition cursor-pointer ${cls} ${
                      isCur ? 'ring-2 ring-blue-600 ring-offset-2' : ''
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="space-y-2 pt-3 border-t border-slate-100 text-xs text-slate-600 tabular-nums">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-emerald-600" /> Answered</span>
                <strong>{answeredCount}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-amber-300 border border-amber-500" /> Marked Review</span>
                <strong>{session.markedReview.length}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-slate-200" /> Unanswered</span>
                <strong>{unansweredCount}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Confirmation Modal (Error Prevention UX) */}
        {confirmSubmit && (
          <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-[2px] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5 border border-slate-200">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">Submit Mock Examination?</h2>
                <p className="text-xs text-slate-500 mt-1">Review your attempt summary before finalizing your submission.</p>
              </div>
              <div className="grid grid-cols-3 gap-2.5 text-center tabular-nums">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="text-xl font-extrabold text-emerald-700">{answeredCount}</div>
                  <div className="text-[11px] font-semibold text-emerald-800">Answered</div>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="text-xl font-extrabold text-amber-700">{session.markedReview.length}</div>
                  <div className="text-[11px] font-semibold text-amber-800">Marked</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-100 border border-slate-200">
                  <div className="text-xl font-extrabold text-slate-700">{unansweredCount}</div>
                  <div className="text-[11px] font-semibold text-slate-600">Skipped</div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmSubmit(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Continue Exam
                </button>
                <button
                  type="button"
                  onClick={() => void submitExam(session, false)}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                >
                  Confirm & Submit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==================== RESULT ANALYSIS VIEW ====================
  if (result) {
    const { attempt, exam, questions } = result;
    const reviewQuestions = questions.filter((q) => {
      if (reviewFilter === 'wrong') return attempt.answers[q.id] !== q.correctIndex;
      if (reviewFilter === 'marked') return attempt.markedReview.includes(q.id);
      return true;
    });

    return (
      <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
        <div className="card-surface rounded-3xl p-8 text-center space-y-5">
          <div className="flex justify-center">
            <CircularProgress
              value={attempt.accuracy}
              size={112}
              strokeWidth={9}
              color={attempt.accuracy >= 75 ? '#059669' : attempt.accuracy >= 50 ? '#d97706' : '#e11d48'}
              trackColor="#e2e8f0"
              label="Score"
            />
          </div>
          <div>
            {attempt.autoSubmitted && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold mb-2">
                <AlertTriangle className="w-3.5 h-3.5" /> Auto-submitted when timer expired
              </div>
            )}
            <h1 className="font-display text-2xl font-extrabold text-slate-900">{exam.title}</h1>
            <p className="text-xs text-slate-500 mt-1">
              {attempt.offlineRecorded && !attempt.synced
                ? 'Saved offline in IndexedDB — will auto-sync online.'
                : 'Result saved and synchronized to your profile.'}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 tabular-nums">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="text-2xl font-extrabold text-slate-900">
                {attempt.score}/{attempt.totalQuestions}
              </div>
              <div className="text-xs text-slate-500 font-medium">Marks</div>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80">
              <div className="text-2xl font-extrabold text-emerald-700">{attempt.accuracy}%</div>
              <div className="text-xs text-emerald-700 font-medium">Accuracy</div>
            </div>
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200/80">
              <div className="text-2xl font-extrabold text-blue-700">
                {Math.floor(attempt.timeTakenSec / 60)}m {attempt.timeTakenSec % 60}s
              </div>
              <div className="text-xs text-blue-700 font-medium">Time Taken</div>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80">
              <div className="text-2xl font-extrabold text-amber-700">
                {Object.keys(attempt.answers).length}/{attempt.totalQuestions}
              </div>
              <div className="text-xs text-amber-700 font-medium">Attempted</div>
            </div>
          </div>

          <div className="pt-1">
            <button onClick={() => setResult(null)} className="btn-primary px-6 py-2.5 rounded-xl font-semibold text-sm cursor-pointer">
              Back to Mock Exams
            </button>
          </div>
        </div>

        <div className="card-surface rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
            <h2 className="font-display font-bold text-slate-900">Question & Solution Review</h2>
            <div className="inline-flex bg-slate-200/70 rounded-xl p-1">
              {[
                { id: 'all', label: `All (${questions.length})` },
                { id: 'wrong', label: `Incorrect / Skipped (${questions.length - attempt.score})` },
                { id: 'marked', label: `Marked (${attempt.markedReview.length})` },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setReviewFilter(f.id as 'all' | 'wrong' | 'marked')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                    reviewFilter === f.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {reviewQuestions.map((q, idx) => {
              const userAns = attempt.answers[q.id];
              const isCorrect = userAns === q.correctIndex;
              return (
                <div key={q.id} className="p-5 sm:p-6 space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-semibold text-sm text-slate-900 leading-relaxed">
                      Q{idx + 1}. {q.questionText}
                    </div>
                    {isCorrect ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 ring-1 ring-inset ring-emerald-600/20 px-2.5 py-1 rounded-lg shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 ring-1 ring-inset ring-rose-600/20 px-2.5 py-1 rounded-lg shrink-0">
                        <XCircle className="w-3.5 h-3.5" /> {userAns === undefined ? 'Skipped' : 'Incorrect'}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-600 flex flex-wrap gap-x-5 gap-y-1">
                    <span>
                      Your Answer:{' '}
                      <strong className={isCorrect ? 'text-emerald-700' : 'text-rose-700'}>
                        {userAns !== undefined ? `${['A', 'B', 'C', 'D'][userAns]}. ${q.options[userAns]}` : 'Not Attempted'}
                      </strong>
                    </span>
                    <span>
                      Correct Answer:{' '}
                      <strong className="text-emerald-700">
                        {['A', 'B', 'C', 'D'][q.correctIndex]}. {q.options[q.correctIndex]}
                      </strong>
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200/70 leading-relaxed">
                    <strong>Explanation:</strong> {q.explanation}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ==================== EXAM CATALOG & ATTEMPTS LIST ====================
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-extrabold text-slate-900">Mock Examinations</h1>

        <div className="inline-flex bg-slate-200/70 rounded-xl p-1 self-start">
          <button
            onClick={() => setTab('available')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              tab === 'available' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Available Exams ({exams.length})
          </button>
          <button
            onClick={() => setTab('attempts')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              tab === 'attempts' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            My Attempts ({myAttempts.length})
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm font-medium">{notice}</div>
      )}

      {loading ? (
        <SkeletonPage cards={2} />
      ) : tab === 'available' ? (
        <div className="grid md:grid-cols-2 gap-5">
          {exams.map((exam) => {
            const isDl = downloadedExamIds.has(exam.id);
            const isBusy = busyDownloads.has(exam.id);
            const blocked = !isOnline && !isDl;

            return (
              <div key={exam.id} className="card-surface card-interactive rounded-2xl p-6 flex flex-col justify-between gap-5 relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1" style={{ backgroundColor: exam.subjectColor || '#0f2440' }} />

                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="px-2.5 py-0.5 rounded-md text-[11px] font-bold text-white"
                      style={{ backgroundColor: exam.subjectColor || '#0f2440' }}
                    >
                      {exam.examType}
                    </span>
                    <DifficultyBadge difficulty={exam.difficulty} />
                    <OfflineAvailabilityBadge downloaded={isDl} compact />
                  </div>

                  <h2 className="font-display text-lg font-bold text-slate-900">{exam.title}</h2>
                  <p className="text-xs text-slate-500 leading-relaxed">{exam.description}</p>

                  <div className="flex items-center gap-4 text-xs text-slate-500 pt-1 tabular-nums">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" /> {exam.durationMinutes} mins
                    </span>
                    <span>{exam.questionCount} Questions</span>
                    {exam.bestAccuracy !== null && exam.bestAccuracy !== undefined && (
                      <span className="text-emerald-700 font-bold">Best: {exam.bestAccuracy}%</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-3.5 border-t border-slate-100">
                  {isDl ? (
                    <button
                      type="button"
                      onClick={() => void removeDownloadedExam(exam.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-rose-600 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove Offline Copy
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!isOnline || isBusy}
                      onClick={() => void downloadExam(exam.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
                    >
                      {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      Download Offline
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={blocked}
                    onClick={() => void startExam(exam)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      blocked ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'btn-primary'
                    }`}
                  >
                    {blocked ? (
                      <>
                        <Lock className="w-3.5 h-3.5" /> Online Only
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" /> Start Exam
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card-surface rounded-2xl overflow-hidden">
          {myAttempts.length === 0 ? (
            <EmptyState icon={ClipboardCheck} title="No mock exam attempts yet" description="Attempt any Olympiad mock exam to view your score history here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Exam</th>
                    <th className="px-5 py-3.5">Score</th>
                    <th className="px-5 py-3.5">Accuracy</th>
                    <th className="px-5 py-3.5">Time Taken</th>
                    <th className="px-5 py-3.5">Mode</th>
                    <th className="px-5 py-3.5">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums">
                  {myAttempts.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-5 py-3.5 font-semibold text-slate-900">
                        {a.examTitle || a.examId}
                        {a.autoSubmitted && <span className="ml-2 text-[10px] text-amber-700 font-bold">(Auto)</span>}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-800">
                        {a.score} / {a.totalQuestions}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-md text-xs font-bold ring-1 ring-inset ${
                            a.accuracy >= 80
                              ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                              : a.accuracy >= 60
                                ? 'bg-amber-50 text-amber-800 ring-amber-600/20'
                                : 'bg-rose-50 text-rose-700 ring-rose-600/20'
                          }`}
                        >
                          {a.accuracy}%
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {Math.floor(a.timeTakenSec / 60)}m {a.timeTakenSec % 60}s
                      </td>
                      <td className="px-5 py-3.5 text-xs">
                        {a.offlineRecorded ? (
                          <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                            <WifiOff className="w-3 h-3" /> Offline {!a.synced && '(Pending)'}
                          </span>
                        ) : (
                          <span className="text-slate-500">Online</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">{formatRelativeTime(a.submittedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
