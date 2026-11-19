import React, { useEffect, useState } from 'react';
import { Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import type { Difficulty, Subject } from '../../types';
import { DifficultyBadge } from '../../components/Badges';

interface AdminExam {
  id: string;
  title: string;
  description: string;
  subjectName: string;
  examType: 'Full Olympiad' | 'Subject Test';
  durationMinutes: number;
  difficulty: Difficulty;
  questionIds: string[];
  isPublished: boolean;
  version: number;
  attemptCount: number;
}

interface BankQuestion {
  id: string;
  subjectName: string;
  topicTitle: string;
  questionText: string;
  difficulty: Difficulty;
}

export const AdminMockExams: React.FC = () => {
  const [exams, setExams] = useState<AdminExam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [questions, setQuestions] = useState<BankQuestion[]>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [examType, setExamType] = useState<'Full Olympiad' | 'Subject Test'>('Subject Test');
  const [subjectId, setSubjectId] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
  const [selectedQIds, setSelectedQIds] = useState<string[]>([]);

  const load = async () => {
    const [exs, subs, qs] = await Promise.all([
      apiFetch<AdminExam[]>('/admin/exams'),
      apiFetch<Subject[]>('/content/subjects'),
      apiFetch<BankQuestion[]>('/admin/questions'),
    ]);
    setExams(exs);
    setSubjects(subs);
    setQuestions(qs);
  };

  useEffect(() => {
    void load();
  }, []);

  const toggleQ = (id: string) => {
    setSelectedQIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const createExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || selectedQIds.length === 0) return;
    await apiFetch('/admin/exams', {
      method: 'POST',
      body: JSON.stringify({
        title,
        description,
        examType,
        subjectId: examType === 'Subject Test' ? subjectId || null : null,
        durationMinutes,
        difficulty,
        questionIds: selectedQIds,
        isPublished: true,
      }),
    });
    setTitle('');
    setDescription('');
    setSelectedQIds([]);
    await load();
  };

  const togglePublish = async (exam: AdminExam) => {
    await apiFetch(`/admin/exams/${exam.id}`, {
      method: 'PUT',
      body: JSON.stringify({ isPublished: !exam.isPublished }),
    });
    await load();
  };

  const deleteExam = async (id: string) => {
    if (!window.confirm('Delete this mock examination?')) return;
    await apiFetch(`/admin/exams/${id}`, { method: 'DELETE' });
    await load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-slate-900">Mock Examination Management</h1>
      </div>

      <form onSubmit={createExam} className="card-surface rounded-2xl p-6 space-y-4">
        <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
          <Plus className="w-4 h-4 text-blue-600" /> Create & Publish Mock Examination
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input required placeholder="Exam Title" value={title} onChange={(e) => setTitle(e.target.value)} className="sm:col-span-2 px-3.5 py-2 rounded-lg border border-slate-300 text-sm" />
          <select value={examType} onChange={(e) => setExamType(e.target.value as 'Full Olympiad' | 'Subject Test')} className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white">
            <option value="Subject Test">Subject Test</option>
            <option value="Full Olympiad">Full Olympiad</option>
          </select>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)} className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white">
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
          {examType === 'Subject Test' && (
            <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white">
              <option value="">Select Subject…</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
          <input type="number" min={5} max={180} value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} placeholder="Duration (mins)" className="px-3.5 py-2 rounded-lg border border-slate-300 text-sm" />
          <input placeholder="Exam instructions / description" value={description} onChange={(e) => setDescription(e.target.value)} className="sm:col-span-2 px-3.5 py-2 rounded-lg border border-slate-300 text-sm" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase text-slate-500">
              Select Questions ({selectedQIds.length} selected)
            </span>
            <button
              type="button"
              onClick={() => setSelectedQIds(questions.slice(0, 10).map((q) => q.id))}
              className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
            >
              Quick Select 10 Questions
            </button>
          </div>
          <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
            {questions.map((q) => {
              const checked = selectedQIds.includes(q.id);
              return (
                <label key={q.id} className={`flex items-center gap-3 p-3 text-xs cursor-pointer ${checked ? 'bg-blue-50/70' : 'hover:bg-slate-50'}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggleQ(q.id)} className="w-4 h-4 accent-blue-600" />
                  <span className="font-semibold text-slate-500 shrink-0">{q.subjectName}</span>
                  <span className="text-slate-800 truncate flex-1">{q.questionText}</span>
                  <DifficultyBadge difficulty={q.difficulty} />
                </label>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={selectedQIds.length === 0}
          className="px-5 py-2.5 rounded-xl btn-primary disabled:opacity-40 font-semibold text-sm cursor-pointer"
        >
          Publish Mock Examination
        </button>
      </form>

      <div className="card-surface rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 font-bold text-slate-900">Published & Draft Exams ({exams.length})</div>
        <div className="divide-y divide-slate-100">
          {exams.map((ex) => (
            <div key={ex.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-blue-700">{ex.examType} • {ex.subjectName}</span>
                  <DifficultyBadge difficulty={ex.difficulty} />
                  <span className="text-xs text-slate-400">v{ex.version}</span>
                </div>
                <div className="font-bold text-slate-900 mt-0.5">{ex.title}</div>
                <div className="text-xs text-slate-500">
                  {ex.questionIds.length} questions • {ex.durationMinutes} mins • {ex.attemptCount} student attempts
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => void togglePublish(ex)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    ex.isPublished ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {ex.isPublished ? 'Published' : 'Draft'}
                </button>
                <button onClick={() => void deleteExam(ex.id)} className="p-2 text-slate-400 hover:text-rose-600 cursor-pointer">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
