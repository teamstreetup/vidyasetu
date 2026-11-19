import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Play,
  Target,
  CheckCircle2,
  Flame,
  Sparkles,
  BookOpen,
  ClipboardCheck,
  WifiOff,
  ArrowRight,
  Clock,
  AlertCircle,
  Download,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOffline } from '../../context/OfflineContext';
import { apiFetch } from '../../lib/api';
import { getCache, getLocalDB, putCache } from '../../lib/db';
import { buildOfflineRecommendations, mergeOfflineProgress } from '../../lib/offlineAnalytics';
import type { RecommendationsData, StudentProgressData } from '../../types';
import { DifficultyBadge, OfflineAvailabilityBadge, formatRelativeTime } from '../../components/Badges';
import { CircularProgress, EmptyState, KpiCard, SkeletonPage } from '../../components/UI';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const { isOnline, downloadedTopicIds, pendingCount, updateAvailable } = useOffline();
  const navigate = useNavigate();

  const [progress, setProgress] = useState<StudentProgressData | null>(null);
  const [recs, setRecs] = useState<RecommendationsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const db = await getLocalDB();
      const [localPractice, localExams, localTopics, cachedProg, cachedRecs] = await Promise.all([
        db.getAll('practiceAttempts'),
        db.getAll('examAttempts'),
        db.getAll('topics'),
        getCache<StudentProgressData>('student_progress'),
        getCache<RecommendationsData>('student_recs'),
      ]);
      const pendingP = localPractice.filter((a) => !a.synced);
      const pendingE = localExams.filter((e) => !e.synced);

      if (isOnline) {
        try {
          const [serverProg, serverRecs] = await Promise.all([
            apiFetch<StudentProgressData>('/practice/progress'),
            apiFetch<RecommendationsData>('/practice/recommendations'),
          ]);
          await putCache('student_progress', serverProg);
          await putCache('student_recs', serverRecs);
          if (!active) return;
          setProgress(mergeOfflineProgress(serverProg, pendingP, pendingE, localTopics));
          setRecs(serverRecs);
          setLoading(false);
          return;
        } catch {
          // fallback to cached
        }
      }

      const merged = mergeOfflineProgress(cachedProg, pendingP, pendingE, localTopics);
      if (!active) return;
      setProgress(merged);
      setRecs(cachedRecs || buildOfflineRecommendations(merged));
      setLoading(false);
    };

    void load();
    return () => {
      active = false;
    };
  }, [isOnline, pendingCount]);

  if (loading) {
    return <SkeletonPage />;
  }

  const summary = progress?.summary;
  const continueTopicId = progress?.lastActivity?.topicId || recs?.nextRecommendedTopic?.topicId || 'top-math-1';
  const continueTitle = progress?.lastActivity?.topicTitle || recs?.nextRecommendedTopic?.title || 'Number Systems & Divisibility';

  return (
    <div className="space-y-6">
      {/* Hero Welcome Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0f2440] via-[#173359] to-[#1d4ed8] rounded-3xl p-6 sm:p-8 text-white shadow-[0_10px_30px_rgba(15,36,64,0.16)]">
        <div
          className="pointer-events-none absolute -top-20 -right-16 w-72 h-72 rounded-full opacity-25 blur-3xl"
          style={{ background: 'radial-gradient(circle, #fbbf24 0%, transparent 70%)' }}
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="hidden sm:block">
              <CircularProgress value={summary?.overallAccuracy ?? 0} size={88} strokeWidth={7} label="Accuracy" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 ring-1 ring-white/15 text-xs font-semibold text-amber-200 mb-3">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>{summary?.streakDays || user?.streakDays || 1}-Day Streak</span>
                <span className="opacity-40">•</span>
                <span>{user?.grade || 'Class 8'}</span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
                Namaste, {user?.name}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-200/90 text-xs sm:text-sm mt-1.5">
                <span>{user?.school}</span>
                <span className="opacity-40">•</span>
                <span>{user?.village}</span>
                <span className="opacity-40">•</span>
                <span className="inline-flex items-center gap-1 text-emerald-300 font-medium">
                  <Download className="w-3.5 h-3.5" /> {downloadedTopicIds.size} offline topic{downloadedTopicIds.size === 1 ? '' : 's'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate(`/student/practice?topicId=${continueTopicId}`)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-[0.98] text-slate-950 font-bold text-sm shadow-md transition cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              Continue: {continueTitle.length > 24 ? `${continueTitle.slice(0, 24)}…` : continueTitle}
            </button>
            <Link
              to="/student/subjects"
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 ring-1 ring-white/15 text-white font-semibold text-sm transition"
            >
              <BookOpen className="w-4 h-4" />
              Browse Subjects
            </Link>
          </div>
        </div>
      </div>

      {/* Content Update Alert */}
      {updateAvailable && (
        <div className="bg-blue-50/90 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="text-sm text-blue-950">
              <strong>New Olympiad Content Update Available</strong> — refresh your offline downloads to receive the latest questions.
            </div>
          </div>
          <Link
            to="/student/offline"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shrink-0 text-center transition"
          >
            Update Downloads
          </Link>
        </div>
      )}

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Overall Progress"
          value={`${summary?.overallCompletion ?? 0}%`}
          icon={BookOpen}
          tone="blue"
          progress={summary?.overallCompletion ?? 0}
        />
        <KpiCard
          label="Questions Attempted"
          value={summary?.totalAttempted ?? 0}
          meta={`${summary?.totalCorrect ?? 0} answered correctly`}
          icon={CheckCircle2}
          tone="indigo"
        />
        <KpiCard
          label="Accuracy Rate"
          value={`${summary?.overallAccuracy ?? 0}%`}
          meta={`${summary?.incorrectCount ?? 0} waiting for revision`}
          icon={Target}
          tone="emerald"
        />
        <KpiCard
          label="Mock Exams Taken"
          value={summary?.mockExamsTaken ?? 0}
          meta={`${downloadedTopicIds.size} topics ready offline`}
          icon={ClipboardCheck}
          tone="amber"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Recommended Topics */}
          <section className="card-surface rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h2 className="font-display font-bold text-slate-900">Recommended Next Topics</h2>
              </div>
              <Link
                to="/student/recommendations"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
              >
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recs && (recs.weakTopics.length > 0 || recs.nextRecommendedTopic) ? (
              <div className="space-y-3">
                {(recs.weakTopics.length > 0 ? recs.weakTopics : recs.difficultyProgression.slice(0, 3)).slice(0, 3).map((t) => {
                  const downloaded = downloadedTopicIds.has(t.topicId);
                  return (
                    <div
                      key={t.topicId}
                      className="card-interactive flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-200/80 bg-slate-50/40 hover:bg-white"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{t.subjectName}</span>
                          <DifficultyBadge difficulty={t.recommendedDifficulty} />
                          <OfflineAvailabilityBadge downloaded={downloaded} compact />
                        </div>
                        <h3 className="font-bold text-slate-900 text-sm">{t.title}</h3>
                        <p className="text-xs text-slate-500 leading-relaxed">{t.reason}</p>
                      </div>
                      <button
                        onClick={() => navigate(`/student/practice?topicId=${t.topicId}&difficulty=${t.recommendedDifficulty}`)}
                        disabled={!isOnline && !downloaded}
                        className="btn-primary shrink-0 px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-40 cursor-pointer"
                      >
                        {!isOnline && !downloaded ? 'Online Only' : 'Practise Now'}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon={Sparkles} title="No recommendations yet" description="Start practising any subject chapter to unlock adaptive recommendations." />
            )}
          </section>

          {/* Teacher Assignments */}
          {progress && progress.assignments.length > 0 && (
            <section className="card-surface rounded-2xl p-6">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <h2 className="font-display font-bold text-slate-900">Assigned by Your Teacher</h2>
              </div>
              <div className="space-y-3">
                {progress.assignments.map((asg) => (
                  <div
                    key={asg.id}
                    className="p-4 rounded-2xl border border-slate-200/80 hover:border-slate-300 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 text-[11px] font-bold rounded-md ring-1 ring-inset ${
                            asg.completed
                              ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                              : 'bg-amber-50 text-amber-800 ring-amber-600/20'
                          }`}
                        >
                          {asg.completed ? 'Completed' : 'In Progress'}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">Due {asg.dueDate}</span>
                      </div>
                      <h3 className="font-semibold text-sm text-slate-900 mt-1.5">{asg.title}</h3>
                      {asg.description && <p className="text-xs text-slate-500 mt-0.5">{asg.description}</p>}
                    </div>
                    <button
                      onClick={() =>
                        asg.assignmentType === 'mock_exam' && asg.examId
                          ? navigate(`/student/exams?start=${asg.examId}`)
                          : navigate(`/student/practice?topicId=${asg.topicId || ''}`)
                      }
                      className="shrink-0 px-3.5 py-2 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 tabular-nums transition cursor-pointer"
                    >
                      {asg.assignmentType === 'mock_exam' ? 'Start Exam' : `Open (${asg.currentCount}/${asg.targetQuestions})`}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Recent Learning Activity Feed */}
        <section className="card-surface rounded-2xl p-6 h-fit">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <h2 className="font-display font-bold text-slate-900">Recent Activity</h2>
            </div>
            <Link to="/student/performance" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
              Full Report
            </Link>
          </div>

          {progress && progress.recentActivities.length > 0 ? (
            <div className="relative space-y-4 before:absolute before:left-[5px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
              {progress.recentActivities.slice(0, 7).map((act) => (
                <div key={act.id} className="relative pl-5">
                  <span
                    className={`absolute left-0 top-1.5 w-[11px] h-[11px] rounded-full ring-4 ring-white ${
                      act.isCorrect ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                  />
                  <div className="text-xs font-semibold text-slate-800 truncate">{act.topicTitle}</div>
                  <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{act.questionText}</div>
                  <div className="flex items-center gap-2 mt-1 text-[10.5px] text-slate-400">
                    <span className={act.isCorrect ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
                      {act.isCorrect ? 'Correct' : 'Incorrect'}
                    </span>
                    <span>•</span>
                    <span>{formatRelativeTime(act.attemptedAt)}</span>
                    {act.offlineRecorded && (
                      <span className="inline-flex items-center gap-0.5 text-amber-700 font-semibold">
                        <WifiOff className="w-2.5 h-2.5" /> Offline
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Clock} title="No recent activity" description="Your answered questions and mock exams will appear here." />
          )}
        </section>
      </div>
    </div>
  );
};
