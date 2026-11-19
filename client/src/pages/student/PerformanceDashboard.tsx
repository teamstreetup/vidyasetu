import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Flame, TrendingUp, AlertTriangle, CheckCircle2, Trophy, WifiOff, Sparkles } from 'lucide-react';
import { useOffline } from '../../context/OfflineContext';
import { apiFetch } from '../../lib/api';
import { getCache, getLocalDB, putCache } from '../../lib/db';
import { mergeOfflineProgress } from '../../lib/offlineAnalytics';
import type { StudentProgressData } from '../../types';
import { AccuracyTrendChart, ProgressBar } from '../../components/Charts';
import { DifficultyBadge, formatRelativeTime } from '../../components/Badges';
import { SkeletonPage } from '../../components/UI';

export const PerformanceDashboard: React.FC = () => {
  const { isOnline, pendingCount } = useOffline();
  const navigate = useNavigate();
  const [progress, setProgress] = useState<StudentProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const db = await getLocalDB();
      const [localP, localE, localTopics, cached] = await Promise.all([
        db.getAll('practiceAttempts'),
        db.getAll('examAttempts'),
        db.getAll('topics'),
        getCache<StudentProgressData>('student_progress'),
      ]);
      const pendingP = localP.filter((p) => !p.synced);
      const pendingE = localE.filter((e) => !e.synced);

      if (isOnline) {
        try {
          const fresh = await apiFetch<StudentProgressData>('/practice/progress');
          await putCache('student_progress', fresh);
          setProgress(mergeOfflineProgress(fresh, pendingP, pendingE, localTopics));
          setLoading(false);
          return;
        } catch {
          // fallback
        }
      }
      setProgress(mergeOfflineProgress(cached, pendingP, pendingE, localTopics));
      setLoading(false);
    };
    void load();
  }, [isOnline, pendingCount]);

  if (loading || !progress) {
    return <SkeletonPage />;
  }

  const strengths = progress.topicStats.filter((t) => t.attempted > 0 && t.accuracy >= 75);
  const weaknesses = progress.topicStats.filter((t) => t.attempted > 0 && t.accuracy < 65);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-extrabold text-slate-900">Performance Dashboard</h1>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card-surface rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Learning Improvement Over Time
            </h2>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg tabular-nums">
              {progress.summary.overallAccuracy}% ({progress.summary.totalAttempted} Qs)
            </span>
          </div>
          <AccuracyTrendChart data={progress.dailyTrend} />
        </div>

        <div className="card-surface rounded-2xl p-6">
          <h2 className="font-display font-bold text-slate-900 mb-5">Subject-Wise Accuracy & Syllabus</h2>
          <div className="space-y-4">
            {progress.subjectStats.map((s) => (
              <div key={s.subjectId} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-800">{s.subjectName}</span>
                  <span className="text-xs text-slate-500 tabular-nums">
                    <strong className="text-slate-900">{s.accuracy}%</strong> accuracy • {s.attempted} Qs ({s.completion}% done)
                  </span>
                </div>
                <ProgressBar value={s.accuracy} color={s.color} height="h-2" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card-surface rounded-2xl p-6">
          <h2 className="font-display font-bold text-slate-900 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Topic Strengths ({strengths.length})
          </h2>
          {strengths.length === 0 ? (
            <p className="text-sm text-slate-500">Practise chapters to reach 75%+ accuracy and unlock strengths.</p>
          ) : (
            <div className="space-y-2.5">
              {strengths.map((t) => (
                <div key={t.topicId} className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">{t.subjectName}</div>
                    <div className="text-sm font-bold text-slate-900">{t.title}</div>
                  </div>
                  <span className="text-sm font-extrabold text-emerald-700 tabular-nums">{t.accuracy}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-surface rounded-2xl p-6">
          <h2 className="font-display font-bold text-slate-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            Weak Topics ({weaknesses.length})
          </h2>
          {weaknesses.length === 0 ? (
            <p className="text-sm text-slate-500">No weak topics below 65% accuracy right now.</p>
          ) : (
            <div className="space-y-2.5">
              {weaknesses.map((t) => (
                <div key={t.topicId} className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200/80 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wide text-rose-700">{t.subjectName}</div>
                    <div className="text-sm font-bold text-slate-900">{t.title}</div>
                    <div className="text-xs text-slate-500 tabular-nums">{t.correct}/{t.attempted} correct</div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-extrabold text-rose-700 tabular-nums">{t.accuracy}%</span>
                    <button
                      onClick={() => navigate(`/student/practice?topicId=${t.topicId}`)}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition cursor-pointer"
                    >
                      Revise
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Achievements */}
      <div className="card-surface rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Streaks & Achievements
          </h2>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20 text-xs font-bold tabular-nums">
            <Flame className="w-3.5 h-3.5 text-amber-600" />
            {progress.summary.streakDays} Day Streak
          </span>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {progress.achievements.map((ach) => (
            <div
              key={ach.id}
              className={`p-4 rounded-2xl border text-center space-y-2 transition ${
                ach.earned ? 'bg-amber-50/50 border-amber-300/80' : 'bg-slate-50/80 border-slate-200/80 opacity-50'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl mx-auto flex items-center justify-center ${
                  ach.earned ? 'bg-amber-400 text-slate-950 shadow-sm' : 'bg-slate-200 text-slate-500'
                }`}
              >
                {ach.icon === 'wifi-off' ? <WifiOff className="w-5 h-5" /> : ach.icon === 'sparkles' ? <Sparkles className="w-5 h-5" /> : <Award className="w-5 h-5" />}
              </div>
              <div className="text-xs font-bold text-slate-900">{ach.title}</div>
              <div className="text-[11px] text-slate-500 leading-snug">{ach.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Topic Breakdown Table */}
      <div className="card-surface rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200/80 font-display font-bold text-slate-900 bg-slate-50/50">
          Topic-Wise Performance Breakdown
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Topic</th>
                <th className="px-5 py-3.5">Subject</th>
                <th className="px-5 py-3.5">Difficulty</th>
                <th className="px-5 py-3.5">Attempted</th>
                <th className="px-5 py-3.5">Accuracy</th>
                <th className="px-5 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums">
              {progress.topicStats.map((t) => (
                <tr key={t.topicId} className="hover:bg-slate-50/60 transition">
                  <td className="px-5 py-3.5 font-semibold text-slate-900">{t.title}</td>
                  <td className="px-5 py-3.5 text-slate-600">{t.subjectName}</td>
                  <td className="px-5 py-3.5"><DifficultyBadge difficulty={t.difficulty} /></td>
                  <td className="px-5 py-3.5">{t.attempted}</td>
                  <td className="px-5 py-3.5 font-bold">{t.attempted > 0 ? `${t.accuracy}%` : '—'}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold ring-1 ring-inset ${
                        t.status === 'Strong'
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                          : t.status === 'Needs Revision'
                            ? 'bg-rose-50 text-rose-700 ring-rose-600/20'
                            : t.status === 'Developing'
                              ? 'bg-amber-50 text-amber-800 ring-amber-600/20'
                              : 'bg-slate-100 text-slate-500 ring-slate-200'
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {progress.examHistory.length > 0 && (
        <div className="card-surface rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200/80 font-display font-bold text-slate-900 bg-slate-50/50">
            Mock Examination History
          </div>
          <div className="divide-y divide-slate-100 tabular-nums">
            {progress.examHistory.map((ex) => (
              <div key={ex.id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition">
                <div>
                  <div className="font-semibold text-slate-900 text-sm">{ex.examTitle}</div>
                  <div className="text-xs text-slate-500">
                    {ex.examType} • {formatRelativeTime(ex.submittedAt)} {ex.offlineRecorded && '• Taken Offline'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-extrabold text-slate-900">
                    {ex.score}/{ex.totalQuestions} ({ex.accuracy}%)
                  </div>
                  <div className="text-xs text-slate-500">
                    {Math.floor(ex.timeTakenSec / 60)}m {ex.timeTakenSec % 60}s
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
