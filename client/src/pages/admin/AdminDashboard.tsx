import React, { useEffect, useState } from 'react';
import { Users, Database, WifiOff, UploadCloud, Activity, Layers } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { formatRelativeTime } from '../../components/Badges';
import { KpiCard, SkeletonPage } from '../../components/UI';

interface AdminAnalytics {
  users: { students: number; teachers: number; admins: number };
  content: { subjects: number; topics: number; questions: number; mockExams: number; contentVersion: number; lastPublishedAt: string };
  engagement: {
    totalPracticeAttempts: number;
    offlinePracticeAttempts: number;
    offlineSharePercent: number;
    totalExamAttempts: number;
    syncSuccess: number;
    syncFailed: number;
  };
  subjectDistribution: Array<{ name: string; color: string; topics: number; questions: number; attempts: number }>;
}

export const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<AdminAnalytics | null>(null);

  useEffect(() => {
    apiFetch<AdminAnalytics>('/admin/analytics').then(setData);
  }, []);

  if (!data) return <SkeletonPage />;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-extrabold text-slate-900">Administrator Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Users"
          value={data.users.students + data.users.teachers + data.users.admins}
          meta={`${data.users.students} students • ${data.users.teachers} teachers`}
          icon={Users}
          tone="blue"
        />
        <KpiCard
          label="Question Bank"
          value={data.content.questions}
          meta={`${data.content.subjects} subjects • ${data.content.topics} topics • ${data.content.mockExams} exams`}
          icon={Database}
          tone="indigo"
        />
        <KpiCard
          label="Offline Learning Share"
          value={`${data.engagement.offlineSharePercent}%`}
          meta={`${data.engagement.offlinePracticeAttempts} of ${data.engagement.totalPracticeAttempts} attempts offline`}
          icon={WifiOff}
          tone="amber"
        />
        <KpiCard
          label="Content Pack Version"
          value={`v${data.content.contentVersion}.0`}
          meta={`Published ${formatRelativeTime(data.content.lastPublishedAt)}`}
          icon={UploadCloud}
          tone="emerald"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card-surface rounded-2xl p-6">
          <h2 className="font-display font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            Subject Content & Engagement
          </h2>
          <div className="space-y-3 tabular-nums">
            {data.subjectDistribution.map((s) => (
              <div key={s.name} className="p-4 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3 hover:bg-slate-50/50 transition">
                <div className="flex items-center gap-3">
                  <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  <div>
                    <div className="font-bold text-sm text-slate-900">{s.name}</div>
                    <div className="text-xs text-slate-500">
                      {s.topics} chapters • {s.questions} MCQs
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-extrabold text-slate-900 text-sm">{s.attempts}</div>
                  <div className="text-[11px] text-slate-400">attempts</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-surface rounded-2xl p-6 space-y-4">
          <h2 className="font-display font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600" />
            Synchronization & Exam Health
          </h2>
          <div className="grid grid-cols-2 gap-3.5 tabular-nums">
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80">
              <div className="text-2xl font-extrabold text-emerald-700">{data.engagement.syncSuccess}</div>
              <div className="text-xs text-emerald-800 font-semibold mt-0.5">Successful Syncs</div>
            </div>
            <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/80">
              <div className="text-2xl font-extrabold text-rose-700">{data.engagement.syncFailed}</div>
              <div className="text-xs text-rose-800 font-semibold mt-0.5">Failed Sync Attempts</div>
            </div>
            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 col-span-2">
              <div className="text-2xl font-extrabold text-blue-700">{data.engagement.totalExamAttempts}</div>
              <div className="text-xs text-blue-800 font-semibold mt-0.5">Total Mock Examinations Submitted</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
