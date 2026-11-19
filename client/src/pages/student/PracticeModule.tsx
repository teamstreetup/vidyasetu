import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  Lightbulb,
  RotateCcw,
  ChevronRight,
  WifiOff,
  Filter,
  Download,
  Keyboard,
} from 'lucide-react';
import { useOffline } from '../../context/OfflineContext';
import { apiFetch } from '../../lib/api';
import { getCache, getLocalDB } from '../../lib/db';
import type { Difficulty, Question, StudentProgressData, Topic } from '../../types';
import { DifficultyBadge, OfflineAvailabilityBadge } from '../../components/Badges';
import { CircularProgress, EmptyState } from '../../components/UI';

type PracticeMode = 'topic' | 'difficulty' | 'incorrect';

export const PracticeModule: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isOnline, downloadedTopicIds, downloadTopic, recordPracticeAttempt } = useOffline();

  const initialTopic = searchParams.get('topicId') || '';
  const initialDiff = (searchParams.get('difficulty') as Difficulty | 'All') || 'All';
  const initialMode = (searchParams.get('mode') as PracticeMode) || 'topic';

  const [mode, setMode] = useState<PracticeMode>(initialMode);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string>(initialTopic);
  const [difficulty, setDifficulty] = useState<Difficulty | 'All'>(initialDiff);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadNotice, setLoadNotice] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [questionStartMs, setQuestionStartMs] = useState(Date.now());
  const [sessionStats, setSessionStats] = useState({ answered: 0, correct: 0, incorrectIds: [] as string[] });
  const [sessionComplete, setSessionComplete] = useState(false);

  useEffect(() => {
    const loadTopics = async () => {
      const db = await getLocalDB();
      if (isOnline) {
        try {
          const list = await apiFetch<Topic[]>('/content/topics');
          setTopics(list);
          if (!selectedTopicId && list.length > 0) setSelectedTopicId(list[0].id);
          return;
        } catch {
          // fallback
        }
      }
      const local = await db.getAll('topics');
      setTopics(local);
      if (!selectedTopicId && local.length > 0) {
        const firstDl = local.find((t) => downloadedTopicIds.has(t.id));
        setSelectedTopicId(firstDl ? firstDl.id : local[0].id);
      }
    };
    void loadTopics();
  }, [isOnline]);

  useEffect(() => {
    let active = true;
    const loadQuestions = async () => {
      setLoading(true);
      setLoadNotice(null);
      setCurrentIndex(0);
      setSelectedOption(null);
      setSubmitted(false);
      setSessionComplete(false);
      setSessionStats({ answered: 0, correct: 0, incorrectIds: [] });

      const db = await getLocalDB();

      if (mode === 'incorrect') {
        const [localAttempts, cachedProg] = await Promise.all([
          db.getAll('practiceAttempts'),
          getCache<StudentProgressData>('student_progress'),
        ]);
        const wrongSet = new Set<string>(cachedProg?.incorrectQuestionIds || []);
        for (const a of localAttempts) {
          if (!a.isCorrect) wrongSet.add(a.questionId);
          else wrongSet.delete(a.questionId);
        }
        const ids = Array.from(wrongSet);

        if (ids.length === 0) {
          if (active) {
            setQuestions([]);
            setLoadNotice('You have no incorrect questions waiting to be retried.');
            setLoading(false);
          }
          return;
        }

        if (isOnline) {
          try {
            const qs = await apiFetch<Question[]>(`/content/questions?ids=${ids.join(',')}`);
            if (active) {
              setQuestions(qs);
              setLoading(false);
            }
            return;
          } catch {
            // fallback
          }
        }
        const allLocal = await db.getAll('questions');
        const filtered = allLocal.filter((q) => wrongSet.has(q.id));
        if (active) {
          setQuestions(filtered);
          if (filtered.length === 0) setLoadNotice('Download topics while online to retry these questions offline.');
          setLoading(false);
        }
        return;
      }

      if (isOnline) {
        try {
          const params = new URLSearchParams();
          if (mode === 'topic' && selectedTopicId) params.set('topicId', selectedTopicId);
          if (difficulty !== 'All') params.set('difficulty', difficulty);
          const qs = await apiFetch<Question[]>(`/content/questions?${params.toString()}`);
          if (active) {
            setQuestions(qs);
            setQuestionStartMs(Date.now());
            setLoading(false);
          }
          return;
        } catch {
          // fallback
        }
      }

      const allLocal = await db.getAll('questions');
      let filtered = allLocal.filter((q) => downloadedTopicIds.has(q.topicId));
      if (mode === 'topic' && selectedTopicId) {
        if (!downloadedTopicIds.has(selectedTopicId)) {
          if (active) {
            setQuestions([]);
            setLoadNotice('This topic is Online-Only and not downloaded yet. Select an Offline Ready topic to continue.');
            setLoading(false);
          }
          return;
        }
        filtered = filtered.filter((q) => q.topicId === selectedTopicId);
      }
      if (difficulty !== 'All') {
        filtered = filtered.filter((q) => q.difficulty === difficulty);
      }

      if (active) {
        setQuestions(filtered);
        if (filtered.length === 0) setLoadNotice('No downloaded questions match this filter.');
        setQuestionStartMs(Date.now());
        setLoading(false);
      }
    };

    void loadQuestions();
    return () => {
      active = false;
    };
  }, [mode, selectedTopicId, difficulty, isOnline, downloadedTopicIds.size]);

  const currentQuestion = questions[currentIndex];

  const handleValidate = async () => {
    if (selectedOption === null || !currentQuestion || submitted) return;
    const isCorrect = selectedOption === currentQuestion.correctIndex;
    const elapsedSec = Math.max(2, Math.round((Date.now() - questionStartMs) / 1000));

    setSubmitted(true);
    setSessionStats((prev) => ({
      answered: prev.answered + 1,
      correct: prev.correct + (isCorrect ? 1 : 0),
      incorrectIds: isCorrect ? prev.incorrectIds : [...prev.incorrectIds, currentQuestion.id],
    }));

    await recordPracticeAttempt({
      questionId: currentQuestion.id,
      topicId: currentQuestion.topicId,
      subjectId: currentQuestion.subjectId,
      selectedIndex: selectedOption,
      isCorrect,
      timeSpentSec: elapsedSec,
      attemptedAt: new Date().toISOString(),
    });
  };

  const handleNext = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setSubmitted(false);
      setQuestionStartMs(Date.now());
    } else {
      setSessionComplete(true);
    }
  };

  // Keyboard shortcuts (1-4 / A-D to select, Enter to check or continue)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!currentQuestion || sessionComplete || loading) return;
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      const key = e.key.toLowerCase();
      if (!submitted) {
        const idx = ['1', '2', '3', '4'].indexOf(key);
        const alphaIdx = ['a', 'b', 'c', 'd'].indexOf(key);
        const pick = idx !== -1 ? idx : alphaIdx;
        if (pick !== -1 && pick < currentQuestion.options.length) {
          setSelectedOption(pick);
          return;
        }
        if (e.key === 'Enter' && selectedOption !== null) {
          e.preventDefault();
          void handleValidate();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentQuestion, sessionComplete, loading, submitted, selectedOption]);

  const handleRetryWrongInSession = () => {
    const wrongQs = questions.filter((q) => sessionStats.incorrectIds.includes(q.id));
    if (wrongQs.length === 0) return;
    setQuestions(wrongQs);
    setCurrentIndex(0);
    setSelectedOption(null);
    setSubmitted(false);
    setSessionComplete(false);
    setSessionStats({ answered: 0, correct: 0, incorrectIds: [] });
  };

  const activeTopic = topics.find((t) => t.id === selectedTopicId);
  const progressPct = questions.length > 0 ? ((currentIndex + (submitted ? 1 : 0)) / questions.length) * 100 : 0;
  const sessionAccuracy = sessionStats.answered > 0 ? Math.round((sessionStats.correct / sessionStats.answered) * 100) : 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-extrabold text-slate-900">Practice Module</h1>

        <div className="inline-flex bg-slate-200/70 rounded-xl p-1 self-start">
          {[
            { id: 'topic', label: 'Topic-wise' },
            { id: 'difficulty', label: 'Difficulty-wise' },
            { id: 'incorrect', label: 'Retry Incorrect' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setMode(m.id as PracticeMode);
                setSearchParams({});
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                mode === m.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Controls Bar */}
      {mode !== 'incorrect' && (
        <div className="card-surface rounded-2xl p-4 flex flex-col md:flex-row md:items-end gap-4 justify-between">
          <div className="flex flex-wrap items-end gap-4 flex-1">
            {mode === 'topic' && (
              <div className="flex-1 min-w-[230px]">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Chapter / Topic
                </label>
                <select
                  value={selectedTopicId}
                  onChange={(e) => setSelectedTopicId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm bg-white font-medium"
                >
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.subjectName} — {t.title} {downloadedTopicIds.has(t.id) ? '(Offline Ready)' : '(Online Only)'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Difficulty
              </label>
              <div className="inline-flex bg-slate-100 rounded-xl p-1 gap-0.5">
                {(['All', 'Easy', 'Medium', 'Hard'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      difficulty === d ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {mode === 'topic' && activeTopic && (
            <div className="flex items-center gap-2 pb-0.5">
              <OfflineAvailabilityBadge downloaded={downloadedTopicIds.has(activeTopic.id)} compact />
              {!downloadedTopicIds.has(activeTopic.id) && isOnline && (
                <button
                  onClick={() => void downloadTopic(activeTopic.id)}
                  className="btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Save Offline
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Question Workspace */}
      {loading ? (
        <div className="card-surface rounded-2xl p-8 space-y-5 animate-pulse">
          <div className="h-4 w-40 bg-slate-200 rounded" />
          <div className="h-6 w-3/4 bg-slate-200 rounded" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 bg-slate-100 rounded-xl" />
            ))}
          </div>
        </div>
      ) : loadNotice || questions.length === 0 ? (
        <div className="card-surface rounded-2xl">
          <EmptyState icon={WifiOff} title="No questions available" description={loadNotice || 'Try selecting another topic or difficulty.'} />
        </div>
      ) : sessionComplete ? (
        <div className="card-surface rounded-3xl p-8 sm:p-10 text-center space-y-6 animate-fade-in">
          <div className="flex justify-center">
            <CircularProgress
              value={sessionAccuracy}
              size={112}
              strokeWidth={9}
              color={sessionAccuracy >= 75 ? '#059669' : sessionAccuracy >= 50 ? '#d97706' : '#e11d48'}
              trackColor="#e2e8f0"
              label="Accuracy"
            />
          </div>
          <div>
            <h2 className="font-display text-2xl font-extrabold text-slate-900">Practice Session Complete</h2>
            <p className="text-sm text-slate-500 mt-1">
              {isOnline
                ? 'Your answers have been saved and synced to your progress dashboard.'
                : 'Saved securely to IndexedDB — will auto-sync when connectivity returns.'}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="text-2xl font-extrabold text-slate-900 tabular-nums">{sessionStats.answered}</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">Attempted</div>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80">
              <div className="text-2xl font-extrabold text-emerald-700 tabular-nums">{sessionStats.correct}</div>
              <div className="text-xs text-emerald-700 font-medium mt-0.5">Correct</div>
            </div>
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200/80">
              <div className="text-2xl font-extrabold text-rose-700 tabular-nums">{sessionStats.incorrectIds.length}</div>
              <div className="text-xs text-rose-700 font-medium mt-0.5">To Review</div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 flex-wrap pt-2">
            {sessionStats.incorrectIds.length > 0 && (
              <button
                onClick={handleRetryWrongInSession}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Retry {sessionStats.incorrectIds.length} Incorrect
              </button>
            )}
            <button
              onClick={() => {
                setCurrentIndex(0);
                setSelectedOption(null);
                setSubmitted(false);
                setSessionComplete(false);
                setSessionStats({ answered: 0, correct: 0, incorrectIds: [] });
              }}
              className="btn-primary px-5 py-2.5 rounded-xl font-semibold text-sm cursor-pointer"
            >
              Practise Again
            </button>
          </div>
        </div>
      ) : (
        currentQuestion && (
          <div className="card-surface rounded-3xl overflow-hidden animate-fade-in">
            {/* Step Progress Track */}
            <div className="h-1.5 bg-slate-100 w-full">
              <div
                className="h-full bg-gradient-to-r from-[#0f2440] to-blue-600 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <div className="px-6 py-4 bg-slate-50/70 border-b border-slate-200/70 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-bold text-slate-700 tabular-nums">
                  Question {currentIndex + 1} <span className="text-slate-400 font-medium">of {questions.length}</span>
                </span>
                <DifficultyBadge difficulty={currentQuestion.difficulty} />
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-400">
                  <Keyboard className="w-3.5 h-3.5" /> Keys A–D & Enter
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold tabular-nums text-slate-700">
                  <span className="text-emerald-600">{sessionStats.correct}</span> / {sessionStats.answered}
                </span>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              <h2 className="font-display text-lg sm:text-[21px] font-bold text-slate-900 leading-snug">
                {currentQuestion.questionText}
              </h2>

              <div className="space-y-3">
                {currentQuestion.options.map((opt, idx) => {
                  const letter = ['A', 'B', 'C', 'D'][idx];
                  const isSelected = selectedOption === idx;
                  const isCorrectOpt = idx === currentQuestion.correctIndex;

                  let style = 'border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/30';
                  if (submitted) {
                    if (isCorrectOpt) style = 'border-emerald-500 bg-emerald-50/80 text-emerald-950';
                    else if (isSelected && !isCorrectOpt) style = 'border-rose-500 bg-rose-50/80 text-rose-950';
                    else style = 'border-slate-200/70 bg-slate-50/40 text-slate-400';
                  } else if (isSelected) {
                    style = 'border-blue-600 bg-blue-50/70 ring-4 ring-blue-100/80';
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={submitted}
                      onClick={() => setSelectedOption(idx)}
                      className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center justify-between gap-3 cursor-pointer disabled:cursor-default ${style}`}
                    >
                      <div className="flex items-center gap-3.5">
                        <span
                          className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                            submitted && isCorrectOpt
                              ? 'bg-emerald-600 text-white'
                              : submitted && isSelected && !isCorrectOpt
                                ? 'bg-rose-600 text-white'
                                : isSelected
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {letter}
                        </span>
                        <span className="text-sm sm:text-[15px] font-medium leading-snug">{opt}</span>
                      </div>
                      {submitted && isCorrectOpt && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
                      {submitted && isSelected && !isCorrectOpt && <XCircle className="w-5 h-5 text-rose-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {submitted && (
                <div
                  className={`p-5 rounded-2xl border animate-fade-in ${
                    selectedOption === currentQuestion.correctIndex
                      ? 'bg-emerald-50/90 border-emerald-200'
                      : 'bg-rose-50/90 border-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm mb-2">
                    {selectedOption === currentQuestion.correctIndex ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <span className="text-emerald-950">Correct Answer</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-rose-600" />
                        <span className="text-rose-950">
                          Incorrect — Correct option is {['A', 'B', 'C', 'D'][currentQuestion.correctIndex]}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex items-start gap-2.5 text-sm text-slate-800 mt-2.5 pt-2.5 border-t border-black/10 leading-relaxed">
                    <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Solution: </span>
                      {currentQuestion.explanation}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-xs text-slate-400 font-medium">
                  {!isOnline ? 'Saved offline in IndexedDB' : 'Auto-saved to your progress'}
                </span>
                {!submitted ? (
                  <button
                    type="button"
                    disabled={selectedOption === null}
                    onClick={() => void handleValidate()}
                    className="btn-primary px-6 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-40 cursor-pointer"
                  >
                    Check Answer
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition cursor-pointer"
                  >
                    {currentIndex + 1 < questions.length ? 'Next Question' : 'View Summary'}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
};
