import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, GraduationCap, ClipboardList, AlertTriangle, RefreshCw, Target, ArrowRight } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { formatRelativeTime } from '../../components/Badges';
import { KpiCard, SkeletonPage } from '../../components/UI';

interface TeacherOverview {
  stats: {
    totalClasses: number;
    totalStudents: number;
    totalAssignments: number;
    averageAccuracy: number;
    strugglingCount: number;
    totalPracticeAttempts: number;
    totalExamSubmissions: number;
  };
  strugglingStudents: Array<{
    id: string;
    name: string;
    grade: string;
    village: string;
    attempted: number;
    accuracy: number;
    lastSyncAt: string | null;
  }>;
  recentSyncs: Array<{
    id: string;
    name: string;
    grade: string;
    village: string;
    attempted: number;
    accuracy: number;
    lastSyncAt: string | null;
  }>;
}

export const TeacherDashboard: React.FC = () => {
  const [data, setData] = useState<TeacherOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<TeacherOverview>('/teacher/overview')
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return <SkeletonPage />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-extrabold text-slate-900">Teacher Dashboard</h1>
        <Link
          to="/teacher/assignments"
          className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold self-start"
        >
          <ClipboardList className="w-4 h-4" /> Create Assignment
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="My Classes" value={data.stats.totalClasses} meta={`${data.stats.totalStudents} active students`} icon={GraduationCap} tone="blue" />
        <KpiCard label="Class Avg Accuracy" value={`${data.stats.averageAccuracy}%`} meta={`${data.stats.totalPracticeAttempts} total attempts`} icon={Target} tone="emerald" />
        <KpiCard label="Needing Support" value={data.stats.strugglingCount} meta="Below 65% accuracy" icon={AlertTriangle} tone="rose" />
        <KpiCard label="Assignments" value={data.stats.totalAssignments} meta={`${data.stats.totalExamSubmissions} exam submissions`} icon={Users} tone="amber" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card-surface rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Students Needing Attention
            </h2>
            <Link to="/teacher/analytics" className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1">
              Weak Topics <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {data.strugglingStudents.length === 0 ? (
            <p className="text-sm text-slate-500">All active students are performing above 65% accuracy.</p>
          ) : (
            <div className="space-y-3">
              {data.strugglingStudents.map((st) => (
                <div key={st.id} className="p-4 rounded-2xl border border-rose-200/80 bg-rose-50/40 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-sm text-slate-900">{st.name}</div>
                    <div className="text-xs text-slate-500 tabular-nums">
                      {st.grade} • {st.village} • {st.attempted} questions
                    </div>
                  </div>
                  <div className="text-right tabular-nums">
                    <span className="px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-800 text-xs font-extrabold">{st.accuracy}%</span>
                    <div className="text-[11px] text-slate-400 mt-1">Synced {formatRelativeTime(st.lastSyncAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-surface rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-slate-900 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-600" />
              Student Last Sync Status
            </h2>
            <Link to="/teacher/students" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
              All Students
            </Link>
          </div>
          <div className="divide-y divide-slate-100 tabular-nums">
            {data.recentSyncs.map((st) => (
              <div key={st.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                <div>
                  <div className="font-semibold text-slate-900">{st.name}</div>
                  <div className="text-xs text-slate-500">
                    {st.grade} • {st.village}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-slate-700">{formatRelativeTime(st.lastSyncAt)}</div>
                  <div className="text-[11px] text-slate-400">{st.accuracy}% acc • {st.attempted} Qs</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
