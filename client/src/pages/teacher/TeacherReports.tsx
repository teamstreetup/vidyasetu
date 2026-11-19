import React, { useEffect, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { formatRelativeTime } from '../../components/Badges';

interface ReportStudent {
  id: string;
  name: string;
  email: string;
  grade: string;
  village: string;
  attempted: number;
  correct: number;
  accuracy: number;
  offlineAttempts: number;
  examsTaken: number;
  avgExamAccuracy: number | null;
  lastSyncAt: string | null;
  weakTopics: Array<{ title: string; accuracy: number }>;
}

export const TeacherReports: React.FC = () => {
  const [students, setStudents] = useState<ReportStudent[]>([]);

  useEffect(() => {
    apiFetch<ReportStudent[]>('/teacher/students').then(setStudents);
  }, []);

  const exportCsv = () => {
    const headers = ['Name', 'Email', 'Grade', 'Village', 'Attempted', 'Correct', 'Accuracy %', 'Offline Attempts', 'Exams Taken', 'Avg Exam %', 'Weak Topics', 'Last Sync'];
    const rows = students.map((s) => [
      s.name,
      s.email,
      s.grade,
      s.village,
      s.attempted,
      s.correct,
      s.accuracy,
      s.offlineAttempts,
      s.examsTaken,
      s.avgExamAccuracy ?? '',
      s.weakTopics.map((w) => `${w.title} (${w.accuracy}%)`).join('; '),
      s.lastSyncAt || 'Never',
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vidyasetu-student-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900">Student Performance Reports</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl btn-primary text-xs font-bold cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print Report
          </button>
        </div>
      </div>

      <div className="card-surface rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-900">VidyaSetu – Rural Olympiad Progress Summary</h2>
            <p className="text-xs text-slate-500">Generated on {new Date().toLocaleDateString()}</p>
          </div>
          <span className="text-xs font-semibold text-slate-500">{students.length} Students</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-left">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Grade / Village</th>
                <th className="px-4 py-3">Attempted</th>
                <th className="px-4 py-3">Accuracy</th>
                <th className="px-4 py-3">Offline Qs</th>
                <th className="px-4 py-3">Exam Avg</th>
                <th className="px-4 py-3">Focus Areas</th>
                <th className="px-4 py-3">Last Sync</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-semibold text-slate-900">{s.name}</td>
                  <td className="px-4 py-3 text-slate-600">{s.grade} • {s.village}</td>
                  <td className="px-4 py-3">{s.attempted}</td>
                  <td className="px-4 py-3 font-bold">{s.accuracy}%</td>
                  <td className="px-4 py-3">{s.offlineAttempts}</td>
                  <td className="px-4 py-3">{s.avgExamAccuracy !== null ? `${s.avgExamAccuracy}%` : '—'}</td>
                  <td className="px-4 py-3 text-xs text-rose-700">
                    {s.weakTopics.length > 0 ? s.weakTopics.map((w) => w.title).join(', ') : 'On Track'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatRelativeTime(s.lastSyncAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
