import React, { useEffect, useState } from 'react';
import { UploadCloud, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { DifficultyBadge, formatRelativeTime } from '../../components/Badges';

interface PublishingInfo {
  contentVersion: number;
  lastPublishedAt: string;
  releaseNotes: string;
  recentUpdatedQuestions: Array<{ id: string; question_text: string; difficulty: string; version: number; updated_at: string }>;
}

export const AdminContentPublishing: React.FC = () => {
  const [info, setInfo] = useState<PublishingInfo | null>(null);
  const [releaseNotes, setReleaseNotes] = useState('');
  const [publishedMsg, setPublishedMsg] = useState('');

  const load = async () => {
    const data = await apiFetch<PublishingInfo>('/admin/publishing');
    setInfo(data);
  };

  useEffect(() => {
    void load();
  }, []);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiFetch<{ contentVersion: number }>('/admin/publishing/publish', {
      method: 'POST',
      body: JSON.stringify({ releaseNotes: releaseNotes || 'Updated questions, solutions, and Olympiad mock tests.' }),
    });
    setReleaseNotes('');
    setPublishedMsg(`Content Pack v${res.contentVersion} published! Students will now see a Content Update alert on their devices.`);
    await load();
  };

  if (!info) return <div className="p-8 text-center text-slate-500">Loading publishing status…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-slate-900">Content Versioning & Publishing</h1>
      </div>

      {publishedMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {publishedMsg}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card-surface rounded-2xl p-6 space-y-3">
          <span className="text-xs font-bold uppercase text-slate-400">Current Published Pack</span>
          <div className="text-3xl font-extrabold text-[#1e3a5f]">Version {info.contentVersion}.0</div>
          <div className="text-xs text-slate-500">Published {formatRelativeTime(info.lastPublishedAt)}</div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700">
            <strong>Release Notes:</strong> {info.releaseNotes}
          </div>
        </div>

        <form onSubmit={handlePublish} className="card-surface rounded-2xl p-6 space-y-4">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-blue-600" /> Publish Version {info.contentVersion + 1}.0
          </h2>
          <textarea
            required
            rows={3}
            placeholder="Describe newly added questions, explanation fixes, or new mock exams…"
            value={releaseNotes}
            onChange={(e) => setReleaseNotes(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl btn-primary font-semibold text-sm cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" /> Publish Content Update
          </button>
        </form>
      </div>

      <div className="card-surface rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 font-bold text-slate-900">Recently Modified Questions</div>
        <div className="divide-y divide-slate-100">
          {info.recentUpdatedQuestions.map((q) => (
            <div key={q.id} className="px-6 py-3.5 flex items-center justify-between gap-3 text-sm">
              <div className="truncate flex-1 font-medium text-slate-800">{q.question_text}</div>
              <div className="flex items-center gap-2 shrink-0">
                <DifficultyBadge difficulty={q.difficulty} />
                <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded">v{q.version}</span>
                <span className="text-xs text-slate-400">{formatRelativeTime(q.updated_at)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
