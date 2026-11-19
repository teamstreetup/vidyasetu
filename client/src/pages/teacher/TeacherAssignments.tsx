import React, { useEffect, useState } from 'react';
import { Plus, Trash2, CheckCircle2, Clock } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import type { MockExam, Topic } from '../../types';
import { ProgressBar } from '../../components/Charts';

interface AssignmentItem {
  id: string;
  title: string;
  description: string;
  className: string;
  assignmentType: 'practice' | 'mock_exam';
  topicTitle: string | null;
  examTitle: string | null;
  targetQuestions: number;
  dueDate: string;
  totalStudents: number;
  completedCount: number;
  completions: Array<{ studentId: string; studentName: string; progress: number; completed: boolean }>;
}

export const TeacherAssignments: React.FC = () => {
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [exams, setExams] = useState<MockExam[]>([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [classId, setClassId] = useState('');
  const [assignmentType, setAssignmentType] = useState<'practice' | 'mock_exam'>('practice');
  const [topicId, setTopicId] = useState('');
  const [examId, setExamId] = useState('');
  const [targetQuestions, setTargetQuestions] = useState(4);
  const [dueDate, setDueDate] = useState(() => new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));

  const load = async () => {
    const [asg, cls, tops, exs] = await Promise.all([
      apiFetch<AssignmentItem[]>('/teacher/assignments'),
      apiFetch<Array<{ id: string; name: string }>>('/teacher/classes'),
      apiFetch<Topic[]>('/content/topics'),
      apiFetch<MockExam[]>('/exams'),
    ]);
    setAssignments(asg);
    setClasses(cls);
    setTopics(tops);
    setExams(exs);
    if (!classId && cls[0]) setClassId(cls[0].id);
    if (!topicId && tops[0]) setTopicId(tops[0].id);
    if (!examId && exs[0]) setExamId(exs[0].id);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const createAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !classId) return;
    await apiFetch('/teacher/assignments', {
      method: 'POST',
      body: JSON.stringify({
        title,
        description,
        classId,
        assignmentType,
        topicId: assignmentType === 'practice' ? topicId : null,
        examId: assignmentType === 'mock_exam' ? examId : null,
        targetQuestions,
        dueDate,
      }),
    });
    setTitle('');
    setDescription('');
    await load();
  };

  const deleteAssignment = async (id: string) => {
    await apiFetch(`/teacher/assignments/${id}`, { method: 'DELETE' });
    await load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-slate-900">Assignments & Completion Tracking</h1>
      </div>

      {/* Create Assignment */}
      <form onSubmit={createAssignment} className="card-surface rounded-2xl p-6 space-y-4">
        <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
          <Plus className="w-4 h-4 text-blue-600" /> Assign Practice or Mock Exam
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <input
            required
            placeholder="Assignment Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
          />
          <select value={classId} onChange={(e) => setClassId(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white">
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={assignmentType}
            onChange={(e) => setAssignmentType(e.target.value as 'practice' | 'mock_exam')}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
          >
            <option value="practice">Topic Practice Assignment</option>
            <option value="mock_exam">Mock Examination Assignment</option>
          </select>

          {assignmentType === 'practice' ? (
            <>
              <select value={topicId} onChange={(e) => setTopicId(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white">
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>{t.subjectName} — {t.title}</option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                max={20}
                value={targetQuestions}
                onChange={(e) => setTargetQuestions(Number(e.target.value))}
                placeholder="Target Questions"
                className="px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </>
          ) : (
            <select
              value={examId}
              onChange={(e) => setExamId(e.target.value)}
              className="sm:col-span-2 px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
            >
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>{ex.title}</option>
              ))}
            </select>
          )}

          <input
            type="date"
            required
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
          />

          <input
            placeholder="Instructions for students (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="sm:col-span-2 px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
          />

          <button type="submit" className="px-4 py-2 rounded-lg btn-primary font-semibold text-sm cursor-pointer">
            Publish Assignment
          </button>
        </div>
      </form>

      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading assignments…</div>
      ) : (
        <div className="space-y-4">
          {assignments.map((asg) => {
            const pct = asg.totalStudents > 0 ? Math.round((asg.completedCount / asg.totalStudents) * 100) : 0;
            return (
              <div key={asg.id} className="card-surface rounded-2xl p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">{asg.className}</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                        {asg.assignmentType === 'practice' ? `Practice: ${asg.topicTitle}` : `Mock Exam: ${asg.examTitle}`}
                      </span>
                      <span className="text-xs text-slate-500">Due {asg.dueDate}</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mt-1">{asg.title}</h3>
                    {asg.description && <p className="text-xs text-slate-500 mt-0.5">{asg.description}</p>}
                  </div>
                  <button
                    onClick={() => void deleteAssignment(asg.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-600">
                    <span>Class Completion</span>
                    <span>
                      {asg.completedCount} / {asg.totalStudents} students ({pct}%)
                    </span>
                  </div>
                  <ProgressBar value={pct} color="#059669" />
                </div>

                <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                  {asg.completions.map((c) => (
                    <div
                      key={c.studentId}
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                        c.completed ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <span className="font-semibold truncate pr-2">{c.studentName}</span>
                      {c.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 shrink-0">
                          <Clock className="w-3 h-3" />
                          {asg.assignmentType === 'practice' ? `${c.progress}/${asg.targetQuestions}` : 'Pending'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
