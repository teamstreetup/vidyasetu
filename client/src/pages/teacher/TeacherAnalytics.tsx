import React, { useEffect, useState } from 'react';
import { AlertTriangle, BarChart3, ClipboardCheck } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { ProgressBar } from '../../components/Charts';
import { DifficultyBadge } from '../../components/Badges';

interface TeacherAnalyticsData {
  subjectAnalytics: Array<{ subjectId: string; subjectName: string; color: string; attempts: number; accuracy: number }>;
  topicAnalytics: Array<{
    topicId: string;
    title: string;
    subjectName: string;
    difficulty: string;
    attempts: number;
    accuracy: number;
    strugglingStudents: Array<{ studentId: string; studentName: string; accuracy: number }>;
  }>;
  examPerformance: Array<{ examId: string; title: string; submissions: number; avgAccuracy: number; topAccuracy: number }>;
}

export const TeacherAnalytics: React.FC = () => {
  const [data, setData] = useState<TeacherAnalyticsData | null>(null);

  useEffect(() => {
    apiFetch<TeacherAnalyticsData>('/teacher/analytics').then(setData);
  }, []);

  if (!data) return <div className="p-8 text-center text-slate-500">Loading class analytics…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-slate-900">Performance & Weak Topic Analysis</h1>
      </div>

      {/* Subject Performance + Exam Results */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card-surface rounded-2xl p-6 space-y-4">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Subject-Wise Class Accuracy
          </h2>
          {data.subjectAnalytics.map((s) => (
            <div key={s.subjectId} className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-slate-800">{s.subjectName}</span>
                <span className="text-xs text-slate-600">
                  <strong>{s.accuracy}%</strong> ({s.attempts} attempts)
                </span>
              </div>
              <ProgressBar value={s.accuracy} color={s.color} height="h-2.5" />
            </div>
          ))}
        </div>

        <div className="card-surface rounded-2xl p-6 space-y-3">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-emerald-600" />
            Mock Examination Performance
          </h2>
          {data.examPerformance.map((ex) => (
            <div key={ex.examId} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
              <div>
                <div className="font-semibold text-sm text-slate-900">{ex.title}</div>
                <div className="text-xs text-slate-500">{ex.submissions} student submission(s)</div>
              </div>
              <div className="text-right text-xs">
                <div className="font-bold text-slate-900">Avg: {ex.avgAccuracy}%</div>
                <div className="text-emerald-700 font-semibold">Top: {ex.topAccuracy}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weak Topic Breakdown */}
      <div className="card-surface rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 font-bold text-slate-900 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-500" />
          Weak Topic Analysis (Sorted Lowest Accuracy First)
        </div>
        <div className="divide-y divide-slate-100">
          {data.topicAnalytics.map((t) => (
            <div key={t.topicId} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">{t.subjectName}</span>
                  <DifficultyBadge difficulty={t.difficulty} />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">{t.title}</h3>
                <div className="text-xs text-slate-500">
                  {t.attempts} total class attempts • Overall accuracy:{' '}
                  <strong className={t.accuracy < 65 ? 'text-rose-600' : 'text-emerald-700'}>{t.accuracy}%</strong>
                </div>
              </div>

              <div className="lg:text-right">
                {t.strugglingStudents.length > 0 ? (
                  <div className="space-y-1">
                    <div className="text-[11px] font-bold uppercase text-rose-600">Struggling Students:</div>
                    <div className="flex flex-wrap lg:justify-end gap-1.5">
                      {t.strugglingStudents.map((st) => (
                        <span key={st.studentId} className="px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                          {st.studentName} ({st.accuracy}%)
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-emerald-600 font-semibold">No students currently struggling</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
