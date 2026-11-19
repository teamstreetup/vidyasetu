import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WifiOff, Brain, RefreshCw, ShieldCheck, GraduationCap, User, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthPage: React.FC = () => {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('aarav@vidyasetu.edu');
  const [password, setPassword] = useState('student123');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [grade, setGrade] = useState('Class 8');
  const [school, setSchool] = useState('ZP High School, Wai');
  const [village, setVillage] = useState('Satara District');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const routeByRole = (r: string) => {
    if (r === 'admin') navigate('/admin');
    else if (r === 'teacher') navigate('/teacher');
    else navigate('/student');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'login') {
        const u = await login(email, password);
        routeByRole(u.role);
      } else {
        const u = await register({ name, email, password, role, grade, school, village });
        routeByRole(u.role);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  const quickLogin = async (demoEmail: string, demoPassword: string) => {
    setError('');
    setEmail(demoEmail);
    setPassword(demoPassword);
    setSubmitting(true);
    try {
      const u = await login(demoEmail, demoPassword);
      routeByRole(u.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f8fb] flex flex-col lg:flex-row">
      {/* Brand Showcase Panel */}
      <div className="relative overflow-hidden lg:w-[46%] bg-[#0f2440] text-white p-8 lg:p-14 flex flex-col justify-between">
        {/* Ambient radial accent */}
        <div
          className="pointer-events-none absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-25 blur-3xl"
          style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }}
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-24 w-80 h-80 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)' }}
        />

        <div className="relative z-10">
          <div className="flex items-center gap-3.5 mb-12">
            <img src="/favicon.svg" alt="VidyaSetu" className="w-11 h-11 rounded-xl shadow-lg ring-1 ring-white/20" />
            <h1 className="font-display text-2xl font-extrabold tracking-tight">VidyaSetu</h1>
          </div>

          <h2 className="font-display text-3xl lg:text-[38px] font-extrabold leading-[1.15] tracking-tight mb-5">
            Olympiad preparation that continues even without internet.
          </h2>
          <p className="text-slate-300 text-sm lg:text-[15px] leading-relaxed mb-10 max-w-lg">
            Download chapters, practise adaptive MCQs, attempt timed Olympiad mock examinations offline, and automatically sync progress whenever connectivity returns.
          </p>

          <div className="space-y-3.5 max-w-lg">
            {[
              {
                icon: WifiOff,
                color: 'text-amber-300 bg-amber-400/15',
                title: 'Offline-First Learning (PWA + IndexedDB)',
                desc: 'Download Mathematics, Science & Logical Reasoning packs locally.',
              },
              {
                icon: Brain,
                color: 'text-emerald-300 bg-emerald-400/15',
                title: 'Adaptive Weak-Topic Recommendations',
                desc: 'Automatically calibrates difficulty and prioritizes weak chapters.',
              },
              {
                icon: RefreshCw,
                color: 'text-sky-300 bg-sky-400/15',
                title: 'Reliable Automatic Synchronization',
                desc: 'Idempotent sync queues upload offline progress to teachers & analytics.',
              },
            ].map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="flex items-start gap-3.5 bg-white/[0.05] backdrop-blur-sm border border-white/[0.08] rounded-2xl p-4"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${feat.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[13.5px] text-white">{feat.title}</h3>
                    <p className="text-xs text-slate-300/90 mt-0.5 leading-relaxed">{feat.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative z-10 mt-10 pt-6 border-t border-white/10 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
          <span>Mathematics</span>
          <span>•</span>
          <span>Science</span>
          <span>•</span>
          <span>Logical Reasoning</span>
          <span>•</span>
          <span>Student, Teacher & Admin Portals</span>
        </div>
      </div>

      {/* Auth Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-14">
        <div className="w-full max-w-[440px] card-surface rounded-3xl p-7 sm:p-9 animate-fade-in">
          <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-slate-100 rounded-2xl mb-7">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`py-2 text-sm font-semibold rounded-xl transition cursor-pointer ${
                mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setEmail('');
                setPassword('');
                setError('');
              }}
              className={`py-2 text-sm font-semibold rounded-xl transition cursor-pointer ${
                mode === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Create Account
            </button>
          </div>

          <h2 className="font-display text-2xl font-bold text-slate-900 mb-6">
            {mode === 'login' ? 'Sign in to VidyaSetu' : 'Create your account'}
          </h2>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Account Role</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setRole('student')}
                      className={`py-2.5 px-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                        role === 'student'
                          ? 'border-blue-600 bg-blue-50 text-blue-800 ring-2 ring-blue-100'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <User className="w-4 h-4" /> Student
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('teacher')}
                      className={`py-2.5 px-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                        role === 'teacher'
                          ? 'border-blue-600 bg-blue-50 text-blue-800 ring-2 ring-blue-100'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <GraduationCap className="w-4 h-4" /> Teacher
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Tanvi Kulkarni"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300/90 text-sm bg-white"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@vidyasetu.edu"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300/90 text-sm bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300/90 text-sm bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Class / Grade</label>
                  <input
                    type="text"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300/90 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Village / Block</label>
                  <input
                    type="text"
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300/90 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">School Name</label>
                  <input
                    type="text"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300/90 text-sm"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer mt-2"
            >
              {submitting ? 'Signing in…' : mode === 'login' ? 'Sign In' : 'Create Account'}
              {!submitting && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* 1-Click Demo Logins */}
          <div className="mt-7 pt-6 border-t border-slate-200/80">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 text-center">
              Quick Demo Access
            </p>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { label: 'Student', sub: 'Aarav Patil', email: 'aarav@vidyasetu.edu', pass: 'student123', icon: User, accent: 'text-blue-600 bg-blue-50' },
                { label: 'Teacher', sub: 'Prof. Sunita', email: 'teacher@vidyasetu.edu', pass: 'teacher123', icon: GraduationCap, accent: 'text-emerald-600 bg-emerald-50' },
                { label: 'Admin', sub: 'Dr. Rajesh', email: 'admin@vidyasetu.edu', pass: 'admin123', icon: ShieldCheck, accent: 'text-amber-600 bg-amber-50' },
              ].map((d) => {
                const Icon = d.icon;
                return (
                  <button
                    key={d.label}
                    type="button"
                    disabled={submitting}
                    onClick={() => void quickLogin(d.email, d.pass)}
                    className="card-interactive flex flex-col items-center gap-1.5 p-3 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-white text-slate-800 cursor-pointer"
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${d.accent}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold leading-none">{d.label}</span>
                    <span className="text-[10px] text-slate-500">{d.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
