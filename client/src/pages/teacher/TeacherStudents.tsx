import React, { useEffect, useState } from 'react';
import { Eye, WifiOff, X } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { formatRelativeTime } from '../../components/Badges';
import { ProgressBar } from '../../components/Charts';

interface StudentRow {
  id: string;
  name: string;
  email: string;
  grade: string;
  village: string;
  streakDays: number;
  lastSyncAt: string | null;
  classes: Array<{ id: string; name: string }>;
  attempted: number;
  correct: number;
  accuracy: number;
  offlineAttempts: number;
  examsTaken: number;
  avgExamAccuracy: number | null;
  weakTopics: Array<{ topicId: string; title: string; accuracy: number }>;
}

interface StudentDetail {
  student: { id: string; name: string; email: string; grade: string; school: string; village: string; lastSyncAt: string | null };
  subjectProgress: Array<{ subjectId: string; subjectName: string; color: string; attempted: number; accuracy: number }>;
  topicProgress: Array<{ topicId: string; title: string; difficulty: string; attempted: number; accuracy: number }>;
  examResults: Array<{ id: string; examTitle: string; score: number; totalQuestions: number; accuracy: number; offlineRecorded: boolean; submittedAt: string }>;
}

export const TeacherStudents: React.FC = () => {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [selected, setSelected] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<StudentRow[]>('/teacher/students')
      .then(setStudents)
      .finally(() => setLoading(false));
  }, []);

  const openDetail = async (id: string) => {
    const detail = await apiFetch<StudentDetail>(`/teacher/students/${id}`);
    setSelected(detail);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-slate-900">Students & Individual Performance</h1>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading student roster…</div>
      ) : (
        <div className="card-surface rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Student</th>
                  <th className="px-5 py-3">Class / Village</th>
                  <th className="px-5 py-3">Practice</th>
                  <th className="px-5 py-3">Accuracy</th>
                  <th className="px-5 py-3">Mock Exams</th>
                  <th className="px-5 py-3">Weak Topics</th>
                  <th className="px-5 py-3">Last Sync</th>
                  <th className="px-5 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">{st.name}</div>
                      <div className="text-xs text-slate-400">{st.email}</div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">
                      <div className="font-medium text-slate-800">{st.grade}</div>
                      <div>{st.village}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold">{st.attempted} Qs</div>
                      {st.offlineAttempts > 0 && (
                        <div className="text-[11px] text-amber-700 inline-flex items-center gap-1">
                          <WifiOff className="w-3 h-3" /> {st.offlineAttempts} offline
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          st.accuracy >= 75
                            ? 'bg-emerald-50 text-emerald-700'
                            : st.accuracy >= 55
                              ? 'bg-amber-50 text-amber-800'
                              : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {st.accuracy}%
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      {st.examsTaken} taken {st.avgExamAccuracy !== null && `(Avg ${st.avgExamAccuracy}%)`}
                    </td>
                    <td className="px-5 py-3.5">
                      {st.weakTopics.length === 0 ? (
                        <span className="text-xs text-emerald-600 font-medium">None</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {st.weakTopics.slice(0, 2).map((w) => (
                            <span key={w.topicId} className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 text-[11px] font-semibold">
                              {w.title.slice(0, 18)}… ({w.accuracy}%)
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">{formatRelativeTime(st.lastSyncAt)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => void openDetail(st.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-6 shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{selected.student.name}</h2>
                <p className="text-xs text-slate-500">
                  {selected.student.grade} • {selected.student.school} • {selected.student.village} • Last Sync:{' '}
                  {formatRelativeTime(selected.student.lastSyncAt)}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="font-bold text-sm text-slate-900 mb-3">Subject-Wise Progress</h3>
              <div className="space-y-3">
                {selected.subjectProgress.map((s) => (
                  <div key={s.subjectId} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>{s.subjectName}</span>
                      <span>
                        {s.accuracy}% accuracy ({s.attempted} attempts)
                      </span>
                    </div>
                    <ProgressBar value={s.accuracy} color={s.color} />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-bold text-sm text-slate-900 mb-2">Topic-Wise Performance</h3>
              <div className="grid sm:grid-cols-2 gap-2">
                {selected.topicProgress.filter((t) => t.attempted > 0).map((t) => (
                  <div key={t.topicId} className="p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800 truncate pr-2">{t.title}</span>
                    <span className={`font-bold shrink-0 ${t.accuracy < 65 ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {t.accuracy}% ({t.attempted})
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-bold text-sm text-slate-900 mb-2">Mock Examination Results</h3>
              {selected.examResults.length === 0 ? (
                <p className="text-xs text-slate-400">No mock exams completed yet.</p>
              ) : (
                <div className="space-y-2">
                  {selected.examResults.map((er) => (
                    <div key={er.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900">{er.examTitle}</div>
                        <div className="text-slate-500">
                          {formatRelativeTime(er.submittedAt)} {er.offlineRecorded && '• Recorded Offline'}
                        </div>
                      </div>
                      <div className="font-extrabold text-slate-900">
                        {er.score}/{er.totalQuestions} ({er.accuracy}%)
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
