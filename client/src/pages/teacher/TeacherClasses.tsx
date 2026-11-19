import React, { useEffect, useState } from 'react';
import { Plus, Trash2, UserPlus, X, GraduationCap } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { formatRelativeTime } from '../../components/Badges';

interface ClassItem {
  id: string;
  name: string;
  grade: string;
  school: string;
  description: string;
  students: Array<{ id: string; name: string; email: string; grade: string; village: string; lastSyncAt: string | null }>;
}

interface StudentOption {
  id: string;
  name: string;
  grade: string;
  email: string;
}

export const TeacherClasses: React.FC = () => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [allStudents, setAllStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [grade, setGrade] = useState('Class 8');
  const [school, setSchool] = useState('ZP High School, Wai');
  const [description, setDescription] = useState('');
  const [enrollPick, setEnrollPick] = useState<Record<string, string>>({});

  const load = async () => {
    const [cls, sts] = await Promise.all([
      apiFetch<ClassItem[]>('/teacher/classes'),
      apiFetch<StudentOption[]>('/teacher/students'),
    ]);
    setClasses(cls);
    setAllStudents(sts);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const createClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await apiFetch('/teacher/classes', {
      method: 'POST',
      body: JSON.stringify({ name, grade, school, description }),
    });
    setName('');
    setDescription('');
    await load();
  };

  const deleteClass = async (id: string) => {
    if (!window.confirm('Delete this class group?')) return;
    await apiFetch(`/teacher/classes/${id}`, { method: 'DELETE' });
    await load();
  };

  const addStudent = async (classId: string) => {
    const studentId = enrollPick[classId];
    if (!studentId) return;
    await apiFetch(`/teacher/classes/${classId}/students`, {
      method: 'POST',
      body: JSON.stringify({ studentId }),
    });
    setEnrollPick((prev) => ({ ...prev, [classId]: '' }));
    await load();
  };

  const removeStudent = async (classId: string, studentId: string) => {
    await apiFetch(`/teacher/classes/${classId}/students/${studentId}`, { method: 'DELETE' });
    await load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-slate-900">My Classes & Student Groups</h1>
      </div>

      {/* Create Class Form */}
      <form onSubmit={createClass} className="card-surface rounded-2xl p-6 space-y-4">
        <h2 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4 text-blue-600" /> Create New Class / Group
        </h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <input
            required
            placeholder="Class Name (e.g., Class 8 Batch B)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
          />
          <input
            placeholder="Grade (e.g., Class 8)"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
          />
          <input
            placeholder="School Name"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            className="px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
          />
          <input
            placeholder="Short description / Olympiad goal"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="sm:col-span-2 px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg btn-primary font-semibold text-sm cursor-pointer"
          >
            Create Class
          </button>
        </div>
      </form>

      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading classes…</div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {classes.map((cls) => {
            const memberIds = new Set(cls.students.map((s) => s.id));
            const available = allStudents.filter((s) => !memberIds.has(s.id));

            return (
              <div key={cls.id} className="card-surface rounded-2xl p-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 mb-1">
                      <GraduationCap className="w-4 h-4" /> {cls.grade} • {cls.school}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{cls.name}</h3>
                    {cls.description && <p className="text-xs text-slate-500 mt-0.5">{cls.description}</p>}
                  </div>
                  <button
                    onClick={() => void deleteClass(cls.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                    title="Delete class"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Add student */}
                <div className="flex gap-2">
                  <select
                    value={enrollPick[cls.id] || ''}
                    onChange={(e) => setEnrollPick((prev) => ({ ...prev, [cls.id]: e.target.value }))}
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                  >
                    <option value="">Enroll a student…</option>
                    {available.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.grade} – {st.email})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!enrollPick[cls.id]}
                    onClick={() => void addStudent(cls.id)}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>

                {/* Members */}
                <div className="divide-y divide-slate-100 border-t border-slate-100 pt-2">
                  {cls.students.length === 0 ? (
                    <p className="text-xs text-slate-400 py-3">No students enrolled in this class yet.</p>
                  ) : (
                    cls.students.map((st) => (
                      <div key={st.id} className="py-2.5 flex items-center justify-between gap-2 text-sm">
                        <div>
                          <div className="font-semibold text-slate-800">{st.name}</div>
                          <div className="text-xs text-slate-500">
                            {st.village} • Last sync: {formatRelativeTime(st.lastSyncAt)}
                          </div>
                        </div>
                        <button
                          onClick={() => void removeStudent(cls.id, st.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                          title="Remove from class"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
