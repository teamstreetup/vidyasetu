import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import type { Difficulty, Subject, Topic } from '../../types';
import { DifficultyBadge } from '../../components/Badges';

export const AdminSubjectsTopics: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);

  // Subject form
  const [sName, setSName] = useState('');
  const [sCode, setSCode] = useState('');
  const [sDesc, setSDesc] = useState('');
  const [sColor, setSColor] = useState('#2563eb');

  // Topic form
  const [tSubjectId, setTSubjectId] = useState('');
  const [tTitle, setTTitle] = useState('');
  const [tChapter, setTChapter] = useState(5);
  const [tDiff, setTDiff] = useState<Difficulty>('Medium');
  const [tDesc, setTDesc] = useState('');

  const load = async () => {
    const [subs, tops] = await Promise.all([apiFetch<Subject[]>('/content/subjects'), apiFetch<Topic[]>('/content/topics')]);
    setSubjects(subs);
    setTopics(tops);
    if (!tSubjectId && subs[0]) setTSubjectId(subs[0].id);
  };

  useEffect(() => {
    void load();
  }, []);

  const addSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/admin/subjects', {
      method: 'POST',
      body: JSON.stringify({ name: sName, code: sCode, description: sDesc, color: sColor }),
    });
    setSName('');
    setSCode('');
    setSDesc('');
    await load();
  };

  const deleteSubject = async (id: string) => {
    if (!window.confirm('Delete this subject and its topics/questions?')) return;
    await apiFetch(`/admin/subjects/${id}`, { method: 'DELETE' });
    await load();
  };

  const addTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/admin/topics', {
      method: 'POST',
      body: JSON.stringify({ subjectId: tSubjectId, title: tTitle, chapterNumber: tChapter, difficulty: tDiff, description: tDesc }),
    });
    setTTitle('');
    setTDesc('');
    await load();
  };

  const deleteTopic = async (id: string) => {
    if (!window.confirm('Delete this topic and its questions?')) return;
    await apiFetch(`/admin/topics/${id}`, { method: 'DELETE' });
    await load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-slate-900">Subjects & Topics Management</h1>
      </div>

      {/* Subjects Section */}
      <div className="grid lg:grid-cols-3 gap-6">
        <form onSubmit={addSubject} className="card-surface rounded-2xl p-5 space-y-3 h-fit">
          <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" /> Add New Subject
          </h2>
          <input required placeholder="Subject Name (e.g., English Olympiad)" value={sName} onChange={(e) => setSName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
          <div className="flex gap-2">
            <input required placeholder="Code (e.g., ENG)" value={sCode} onChange={(e) => setSCode(e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm" />
            <input type="color" value={sColor} onChange={(e) => setSColor(e.target.value)} className="w-12 h-10 rounded border border-slate-300 p-1" />
          </div>
          <textarea placeholder="Description" value={sDesc} onChange={(e) => setSDesc(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
          <button type="submit" className="w-full py-2 rounded-lg btn-primary font-semibold text-sm cursor-pointer">
            Add Subject
          </button>
        </form>

        <div className="lg:col-span-2 card-surface rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 font-bold text-sm text-slate-900">Existing Subjects ({subjects.length})</div>
          <div className="divide-y divide-slate-100">
            {subjects.map((s) => (
              <div key={s.id} className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  <div>
                    <div className="font-bold text-sm text-slate-900">
                      {s.name} <span className="text-xs font-mono text-slate-400">({s.code})</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {s.topicCount} topics • {s.questionCount} questions • v{s.version}
                    </div>
                  </div>
                </div>
                <button onClick={() => void deleteSubject(s.id)} className="p-2 text-slate-400 hover:text-rose-600 cursor-pointer">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Topics Section */}
      <div className="grid lg:grid-cols-3 gap-6">
        <form onSubmit={addTopic} className="card-surface rounded-2xl p-5 space-y-3 h-fit">
          <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-600" /> Add Topic / Chapter
          </h2>
          <select value={tSubjectId} onChange={(e) => setTSubjectId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white">
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <input required placeholder="Topic Title" value={tTitle} onChange={(e) => setTTitle(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" min={1} value={tChapter} onChange={(e) => setTChapter(Number(e.target.value))} placeholder="Chapter #" className="px-3 py-2 rounded-lg border border-slate-300 text-sm" />
            <select value={tDiff} onChange={(e) => setTDiff(e.target.value as Difficulty)} className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white">
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
          <textarea placeholder="Topic learning objectives" value={tDesc} onChange={(e) => setTDesc(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
          <button type="submit" className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm cursor-pointer">
            Add Chapter
          </button>
        </form>

        <div className="lg:col-span-2 card-surface rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 font-bold text-sm text-slate-900">Chapters & Topics ({topics.length})</div>
          <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
            {topics.map((t) => (
              <div key={t.id} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">{t.subjectName} • Ch {t.chapterNumber}</span>
                    <DifficultyBadge difficulty={t.difficulty} />
                  </div>
                  <div className="font-bold text-sm text-slate-900 mt-0.5">{t.title}</div>
                  <div className="text-xs text-slate-500">{t.questionCount} questions • v{t.version}</div>
                </div>
                <button onClick={() => void deleteTopic(t.id)} className="p-2 text-slate-400 hover:text-rose-600 cursor-pointer">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
