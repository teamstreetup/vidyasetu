import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { formatRelativeTime } from '../../components/Badges';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  grade: string;
  school: string;
  village: string;
  active: boolean;
  lastSyncAt: string | null;
}

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('student123');
  const [role, setRole] = useState<'student' | 'teacher' | 'admin'>('student');
  const [grade, setGrade] = useState('Class 8');
  const [village, setVillage] = useState('Wai, Satara');
  const [error, setError] = useState('');

  const load = async () => {
    setUsers(await apiFetch<AdminUser[]>('/admin/users'));
  };

  useEffect(() => {
    void load();
  }, []);

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/admin/users', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, role, grade, village }),
      });
      setName('');
      setEmail('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    }
  };

  const updateUser = async (id: string, patch: Record<string, unknown>) => {
    await apiFetch(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
    await load();
  };

  const deleteUser = async (id: string) => {
    if (!window.confirm('Permanently delete this user account?')) return;
    try {
      await apiFetch(`/admin/users/${id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-slate-900">User & Role Management</h1>
      </div>

      {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{error}</div>}

      <form onSubmit={createUser} className="card-surface rounded-2xl p-6 space-y-3">
        <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
          <Plus className="w-4 h-4 text-blue-600" /> Add New Account
        </h2>
        <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <input required placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 text-sm" />
          <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 text-sm" />
          <input required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 text-sm" />
          <select value={role} onChange={(e) => setRole(e.target.value as 'student' | 'teacher' | 'admin')} className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white">
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="admin">Admin</option>
          </select>
          <input placeholder="Grade / Village" value={grade} onChange={(e) => setGrade(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 text-sm" />
          <button type="submit" className="px-4 py-2 rounded-lg btn-primary font-semibold text-sm cursor-pointer">
            Create User
          </button>
        </div>
      </form>

      <div className="card-surface rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Role & Permissions</th>
                <th className="px-5 py-3">School / Village</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Last Sync</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3">
                    <div className="font-bold text-slate-900">{u.name}</div>
                    <div className="text-xs text-slate-400">{u.email}</div>
                  </td>
                  <td className="px-5 py-3">
                    <select
                      value={u.role}
                      onChange={(e) => void updateUser(u.id, { role: e.target.value })}
                      className="px-2.5 py-1 rounded-lg border border-slate-300 text-xs font-semibold bg-white"
                    >
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-600">
                    <div>{u.school}</div>
                    <div className="text-slate-400">{u.grade} • {u.village}</div>
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => void updateUser(u.id, { active: !u.active })}
                      className={`px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer ${
                        u.active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {u.active ? 'Active' : 'Suspended'}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500">{formatRelativeTime(u.lastSyncAt)}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => void deleteUser(u.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="Delete user"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
