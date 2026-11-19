import React, { useState } from 'react';
import { Save, Trash2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOffline } from '../../context/OfflineContext';
import { apiFetch } from '../../lib/api';
import { clearOfflineStorage } from '../../lib/db';
import type { User } from '../../types';

export const ProfileSettings: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { isOnline, downloadedTopics, downloadedExams, refreshState } = useOffline();

  const [name, setName] = useState(user?.name || '');
  const [grade, setGrade] = useState(user?.grade || '');
  const [school, setSchool] = useState(user?.school || '');
  const [village, setVillage] = useState(user?.village || '');
  const [savedMsg, setSavedMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedMsg('');
    try {
      const updated = await apiFetch<User>('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name, grade, school, village }),
      });
      updateUser(updated);
      setSavedMsg('Profile updated successfully.');
    } catch (err) {
      setSavedMsg(err instanceof Error ? err.message : 'Update failed (requires internet)');
    } finally {
      setSaving(false);
    }
  };

  const handleClearCache = async () => {
    if (!window.confirm('Clear all downloaded topics, exams, and local offline cache on this device?')) return;
    await clearOfflineStorage();
    await refreshState();
    setSavedMsg('Local IndexedDB storage cleared.');
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-slate-900">Profile & Settings</h1>
      </div>

      {savedMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {savedMsg}
        </div>
      )}

      <form onSubmit={handleSave} className="card-surface rounded-2xl p-6 space-y-4">
        <h2 className="font-bold text-slate-900">Student Information</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Email (Read-Only)</label>
            <input
              value={user?.email || ''}
              disabled
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Class / Grade</label>
            <input
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Village / Block</label>
            <input
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">School</label>
            <input
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={saving || !isOnline}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl btn-primary disabled:opacity-40 text-sm font-semibold cursor-pointer"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>

      <div className="card-surface rounded-2xl p-6 space-y-3">
        <h2 className="font-bold text-slate-900">Device Offline Storage (IndexedDB)</h2>
        <p className="text-sm text-slate-600">
          Currently storing <strong>{downloadedTopics.length} topics</strong> and <strong>{downloadedExams.length} mock exams</strong> offline.
        </p>
        <button
          type="button"
          onClick={() => void handleClearCache()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold cursor-pointer"
        >
          <Trash2 className="w-4 h-4" /> Clear Offline Downloads & Cache
        </button>
      </div>
    </div>
  );
};
