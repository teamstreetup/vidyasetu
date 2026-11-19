import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, AlertTriangle, ArrowRight, RotateCcw, TrendingUp, BookOpen } from 'lucide-react';
import { useOffline } from '../../context/OfflineContext';
import { apiFetch } from '../../lib/api';
import { getCache, getLocalDB, putCache } from '../../lib/db';
import { buildOfflineRecommendations, mergeOfflineProgress } from '../../lib/offlineAnalytics';
import type { RecommendationsData, StudentProgressData } from '../../types';
import { DifficultyBadge, OfflineAvailabilityBadge } from '../../components/Badges';
import { SkeletonPage } from '../../components/UI';

export const Recommendations: React.FC = () => {
  const { isOnline, downloadedTopicIds, pendingCount } = useOffline();
  const navigate = useNavigate();
  const [recs, setRecs] = useState<RecommendationsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (isOnline) {
        try {
          const data = await apiFetch<RecommendationsData>('/practice/recommendations');
          await putCache('student_recs', data);
          setRecs(data);
          setLoading(false);
          return;
        } catch {
          // fallback offline
        }
      }

      const db = await getLocalDB();
      const [localP, localE, localTopics, cachedProg] = await Promise.all([
        db.getAll('practiceAttempts'),
        db.getAll('examAttempts'),
        db.getAll('topics'),
        getCache<StudentProgressData>('student_progress'),
      ]);
      const merged = mergeOfflineProgress(
        cachedProg,
        localP.filter((a) => !a.synced),
        localE.filter((e) => !e.synced),
        localTopics
      );
      setRecs(buildOfflineRecommendations(merged));
      setLoading(false);
    };
    void load();
  }, [isOnline, pendingCount]);

  if (loading || !recs) {
    return <SkeletonPage cards={2} />;
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-extrabold text-slate-900 flex items-center gap-2.5">
        <Sparkles className="w-6 h-6 text-amber-500" />
        Smart Adaptive Recommendations
      </h1>

      {recs.nextRecommendedTopic && (
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0f2440] via-[#173359] to-[#2563eb] text-white rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-[0_10px_28px_rgba(15,36,64,0.16)]">
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-amber-300">Next Best Focus</div>
            <h2 className="font-display text-xl sm:text-2xl font-extrabold">{recs.nextRecommendedTopic.title}</h2>
            <p className="text-sm text-slate-200/90 max-w-xl leading-relaxed">{recs.nextRecommendedTopic.reason}</p>
            <div className="flex items-center gap-2 pt-1">
              <span className="px-2.5 py-0.5 rounded-md bg-white/15 text-xs font-semibold">
                {recs.nextRecommendedTopic.subjectName}
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-amber-400 text-slate-950 text-xs font-bold">
                Target Level: {recs.nextRecommendedTopic.recommendedDifficulty}
              </span>
            </div>
          </div>

          <button
            onClick={() =>
              navigate(
                `/student/practice?topicId=${recs.nextRecommendedTopic!.topicId}&difficulty=${recs.nextRecommendedTopic!.recommendedDifficulty}`
              )
            }
            className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm shadow-md transition cursor-pointer"
          >
            Start Adaptive Practice <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card-surface rounded-2xl p-6">
          <h2 className="font-display font-bold text-slate-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
            Identified Weak Topics ({recs.weakTopics.length})
          </h2>
          {recs.weakTopics.length === 0 ? (
            <p className="text-sm text-slate-500">None of your attempted topics are currently below 70% accuracy.</p>
          ) : (
            <div className="space-y-3">
              {recs.weakTopics.map((wt) => {
                const isDl = downloadedTopicIds.has(wt.topicId);
                return (
                  <div key={wt.topicId} className="p-4 rounded-2xl border border-rose-200/80 bg-rose-50/40 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-rose-700">{wt.subjectName}</span>
                        <DifficultyBadge difficulty={wt.recommendedDifficulty} />
                        <OfflineAvailabilityBadge downloaded={isDl} compact />
                      </div>
                      <span className="text-sm font-extrabold text-rose-700 tabular-nums">{wt.accuracy}%</span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm">{wt.title}</h3>
                    <p className="text-xs text-slate-600">{wt.reason}</p>
                    <button
                      onClick={() => navigate(`/student/practice?topicId=${wt.topicId}&difficulty=${wt.recommendedDifficulty}`)}
                      disabled={!isOnline && !isDl}
                      className="btn-primary px-3.5 py-1.5 rounded-lg disabled:opacity-40 text-xs font-semibold cursor-pointer"
                    >
                      Practise {wt.recommendedDifficulty} Questions
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card-surface rounded-2xl p-6">
          <h2 className="font-display font-bold text-slate-900 mb-4 flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-blue-600" />
            Suggested Revision Activities
          </h2>
          {recs.revisionActivities.length === 0 ? (
            <p className="text-sm text-slate-500">All caught up — attempt a timed Mock Exam to test your speed.</p>
          ) : (
            <div className="space-y-3">
              {recs.revisionActivities.map((act, idx) => (
                <div key={idx} className="p-4 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3 hover:border-slate-300 transition">
                  <div>
                    <div className="font-bold text-sm text-slate-900">{act.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{act.subtitle}</div>
                  </div>
                  <button
                    onClick={() =>
                      act.type === 'retry_incorrect'
                        ? navigate('/student/practice?mode=incorrect')
                        : navigate(`/student/practice?topicId=${act.topicId}&difficulty=${act.difficulty || 'All'}`)
                    }
                    className="shrink-0 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold transition cursor-pointer"
                  >
                    {act.actionLabel}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {recs.recommendedQuestions.length > 0 && (
        <div className="card-surface rounded-2xl p-6">
          <h2 className="font-display font-bold text-slate-900 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            Recommended Practice Questions
          </h2>
          <div className="grid md:grid-cols-2 gap-3.5">
            {recs.recommendedQuestions.map((q) => (
              <div
                key={q.id}
                onClick={() => navigate(`/student/practice?topicId=${q.topicId}&difficulty=${q.difficulty}`)}
                className="card-interactive p-4 rounded-2xl border border-slate-200/80 bg-slate-50/40 hover:bg-white cursor-pointer space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    {q.subjectName} • {q.topicTitle}
                  </span>
                  <DifficultyBadge difficulty={q.difficulty} />
                </div>
                <p className="text-sm font-semibold text-slate-900 line-clamp-2">{q.questionText}</p>
                <p className="text-[11px] text-blue-700 font-medium">{q.rationale}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card-surface rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200/80 flex items-center gap-2 font-display font-bold text-slate-900 bg-slate-50/50">
          <TrendingUp className="w-5 h-5 text-emerald-600" />
          Gradual Difficulty Progression Across Chapters
        </div>
        <div className="divide-y divide-slate-100">
          {recs.difficultyProgression.map((row) => (
            <div key={row.topicId} className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/50 transition">
              <div>
                <div className="text-sm font-semibold text-slate-900">{row.title}</div>
                <div className="text-xs text-slate-500">
                  {row.subjectName} • {row.reason}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 tabular-nums">
                <span className="text-xs font-medium text-slate-500">
                  {row.accuracy !== null ? `${row.accuracy}% accuracy` : 'Unattempted'}
                </span>
                <DifficultyBadge difficulty={row.recommendedDifficulty} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
