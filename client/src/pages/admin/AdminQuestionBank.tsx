import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import type { Difficulty, Question, Subject, Topic } from '../../types';
import { DifficultyBadge } from '../../components/Badges';

interface AdminQuestion extends Question {
  topicTitle: string;
  subjectName: string;
}

export const AdminQuestionBank: React.FC = () => {
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [filterSubject, setFilterSubject] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('All');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState<[string, string, string, string]>(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [explanation, setExplanation] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
  const [tags, setTags] = useState('');

  const load = async () => {
    const params = new URLSearchParams();
    if (filterSubject) params.set('subjectId', filterSubject);
    if (filterDifficulty !== 'All') params.set('difficulty', filterDifficulty);

    const [qs, subs, tops] = await Promise.all([
      apiFetch<AdminQuestion[]>(`/admin/questions?${params.toString()}`),
      apiFetch<Subject[]>('/content/subjects'),
      apiFetch<Topic[]>('/content/topics'),
    ]);
    setQuestions(qs);
    setSubjects(subs);
    setTopics(tops);
    if (!subjectId && subs[0]) {
      setSubjectId(subs[0].id);
      const firstTopic = tops.find((t) => t.subjectId === subs[0].id);
      if (firstTopic) setTopicId(firstTopic.id);
    }
  };

  useEffect(() => {
    void load();
  }, [filterSubject, filterDifficulty]);

  const resetForm = () => {
    setEditingId(null);
    setQuestionText('');
    setOptions(['', '', '', '']);
    setCorrectIndex(0);
    setExplanation('');
    setDifficulty('Medium');
    setTags('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { subjectId, topicId, questionText, options, correctIndex, explanation, difficulty, tags };
    if (editingId) {
      await apiFetch(`/admin/questions/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await apiFetch('/admin/questions', { method: 'POST', body: JSON.stringify(payload) });
    }
    resetForm();
    await load();
  };

  const startEdit = (q: AdminQuestion) => {
    setEditingId(q.id);
    setSubjectId(q.subjectId);
    setTopicId(q.topicId);
    setQuestionText(q.questionText);
    setOptions([q.options[0] || '', q.options[1] || '', q.options[2] || '', q.options[3] || '']);
    setCorrectIndex(q.correctIndex);
    setExplanation(q.explanation);
    setDifficulty(q.difficulty);
    setTags(q.tags || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const removeQuestion = async (id: string) => {
    if (!window.confirm('Delete this question from the bank?')) return;
    await apiFetch(`/admin/questions/${id}`, { method: 'DELETE' });
    await load();
  };

  const subjectTopics = topics.filter((t) => t.subjectId === subjectId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-slate-900">Question Bank Management</h1>
      </div>

      {/* Add / Edit Question Form */}
      <form onSubmit={handleSubmit} className="card-surface rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" />
            {editingId ? 'Edit Olympiad Question (Auto-increments Version)' : 'Add New Olympiad Question'}
          </h2>
          {editingId && (
            <button type="button" onClick={resetForm} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer">
              <X className="w-3.5 h-3.5" /> Cancel Edit
            </button>
          )}
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <select
            value={subjectId}
            onChange={(e) => {
              const sid = e.target.value;
              setSubjectId(sid);
              const firstT = topics.find((t) => t.subjectId === sid);
              if (firstT) setTopicId(firstT.id);
            }}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <select value={topicId} onChange={(e) => setTopicId(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white">
            {subjectTopics.map((t) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>

          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)} className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white">
            <option value="Easy">Difficulty: Easy</option>
            <option value="Medium">Difficulty: Medium</option>
            <option value="Hard">Difficulty: Hard</option>
          </select>
        </div>

        <textarea
          required
          rows={2}
          placeholder="Enter Olympiad question text…"
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
        />

        <div className="grid sm:grid-cols-2 gap-3">
          {options.map((opt, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="radio"
                name="correctOption"
                checked={correctIndex === idx}
                onChange={() => setCorrectIndex(idx)}
                title="Mark as correct option"
                className="w-4 h-4 accent-emerald-600 cursor-pointer"
              />
              <input
                required
                placeholder={`Option ${['A', 'B', 'C', 'D'][idx]}`}
                value={opt}
                onChange={(e) => {
                  const copy: [string, string, string, string] = [...options];
                  copy[idx] = e.target.value;
                  setOptions(copy);
                }}
                className={`flex-1 px-3 py-2 rounded-lg border text-sm ${
                  correctIndex === idx ? 'border-emerald-400 bg-emerald-50/40' : 'border-slate-300'
                }`}
              />
            </div>
          ))}
        </div>

        <textarea
          required
          rows={2}
          placeholder="Detailed step-by-step explanation & solution…"
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
        />

        <div className="flex items-center justify-between gap-3">
          <input
            placeholder="Tags (comma-separated, e.g., Algebra, Identities)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="flex-1 max-w-sm px-3 py-2 rounded-lg border border-slate-300 text-xs"
          />
          <button type="submit" className="px-5 py-2.5 rounded-xl btn-primary font-semibold text-sm cursor-pointer">
            {editingId ? 'Save Changes (Bump Version)' : 'Add to Question Bank'}
          </button>
        </div>
      </form>

      {/* Filters & Bank Table */}
      <div className="card-surface rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-slate-900">Questions ({questions.length})</h2>
          <div className="flex gap-2">
            <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white">
              <option value="">All Subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <select value={filterDifficulty} onChange={(e) => setFilterDifficulty(e.target.value)} className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white">
              <option value="All">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {questions.map((q) => (
            <div key={q.id} className="p-5 flex items-start justify-between gap-4 hover:bg-slate-50/50">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-blue-700">
                    {q.subjectName} • {q.topicTitle}
                  </span>
                  <DifficultyBadge difficulty={q.difficulty} />
                  <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">v{q.version}</span>
                </div>
                <div className="font-semibold text-sm text-slate-900">{q.questionText}</div>
                <div className="text-xs text-emerald-700 font-medium">
                  Answer: {['A', 'B', 'C', 'D'][q.correctIndex]}. {q.options[q.correctIndex]}
                </div>
                <div className="text-xs text-slate-500 line-clamp-2">{q.explanation}</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => startEdit(q)} className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer" title="Edit">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => void removeQuestion(q.id)} className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer" title="Delete">
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
