import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  PenTool,
  ClipboardCheck,
  BarChart3,
  Sparkles,
  WifiOff,
  UserCircle,
  Users,
  GraduationCap,
  FileSpreadsheet,
  ClipboardList,
  AlertCircle,
  Layers,
  Database,
  UploadCloud,
  Activity,
  LogOut,
  Menu,
  X,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useOffline } from '../context/OfflineContext';
import { ConnectivityPill, SyncStatusBadge } from './Badges';

interface NavItem {
  to: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  badge?: string | number;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const { isOnline, simulatedOffline, toggleSimulatedOffline, syncStatus, pendingCount, updateAvailable, syncNow } = useOffline();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return <>{children}</>;

  const studentGroups: NavGroup[] = [
    {
      title: 'Overview',
      items: [{ to: '/student', label: 'Dashboard', icon: LayoutDashboard }],
    },
    {
      title: 'Learn & Practise',
      items: [
        { to: '/student/subjects', label: 'Subjects & Topics', icon: BookOpen },
        { to: '/student/practice', label: 'Practice Module', icon: PenTool },
        { to: '/student/exams', label: 'Mock Exams', icon: ClipboardCheck },
      ],
    },
    {
      title: 'Insights & Offline',
      items: [
        { to: '/student/performance', label: 'My Progress', icon: BarChart3 },
        { to: '/student/recommendations', label: 'Recommendations', icon: Sparkles },
        {
          to: '/student/offline',
          label: 'Offline & Sync',
          icon: WifiOff,
          badge: pendingCount > 0 ? pendingCount : updateAvailable ? 'New' : undefined,
        },
      ],
    },
    {
      title: 'Account',
      items: [{ to: '/student/profile', label: 'Profile & Settings', icon: UserCircle }],
    },
  ];

  const teacherGroups: NavGroup[] = [
    {
      title: 'Overview',
      items: [{ to: '/teacher', label: 'Teacher Dashboard', icon: LayoutDashboard }],
    },
    {
      title: 'Classroom',
      items: [
        { to: '/teacher/classes', label: 'My Classes', icon: GraduationCap },
        { to: '/teacher/students', label: 'Students', icon: Users },
        { to: '/teacher/assignments', label: 'Assignments', icon: ClipboardList },
      ],
    },
    {
      title: 'Insights',
      items: [
        { to: '/teacher/analytics', label: 'Analytics & Weak Topics', icon: AlertCircle },
        { to: '/teacher/reports', label: 'Reports', icon: FileSpreadsheet },
      ],
    },
  ];

  const adminGroups: NavGroup[] = [
    {
      title: 'Overview',
      items: [
        { to: '/admin', label: 'Admin Dashboard', icon: LayoutDashboard },
        { to: '/admin/users', label: 'User Management', icon: Users },
      ],
    },
    {
      title: 'Content Studio',
      items: [
        { to: '/admin/subjects', label: 'Subjects & Topics', icon: Layers },
        { to: '/admin/questions', label: 'Question Bank', icon: Database },
        { to: '/admin/exams', label: 'Mock Exams', icon: ClipboardCheck },
      ],
    },
    {
      title: 'Operations',
      items: [
        { to: '/admin/publishing', label: 'Content Publishing', icon: UploadCloud },
        { to: '/admin/sync', label: 'Sync Monitoring', icon: Activity },
      ],
    },
  ];

  const groups = user.role === 'student' ? studentGroups : user.role === 'teacher' ? teacherGroups : adminGroups;
  const allItems = groups.flatMap((g) => g.items);
  const currentItem = allItems.find((i) => i.to === location.pathname) || allItems[0];
  const roleLabel = user.role === 'student' ? 'Student Portal' : user.role === 'teacher' ? 'Teacher Portal' : 'Admin Console';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-[#f6f8fb]">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-[2px] z-30 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`no-print fixed lg:sticky top-0 left-0 z-40 h-screen w-[264px] bg-[#0f2440] text-slate-100 flex flex-col border-r border-slate-800/60 transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="px-5 h-16 flex items-center justify-between border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <img src="/favicon.svg" alt="VidyaSetu" className="w-9 h-9 rounded-xl shadow-md ring-1 ring-white/15" />
            <div>
              <div className="font-display font-extrabold text-[17px] tracking-tight leading-none text-white">VidyaSetu</div>
              <div className="text-[11px] text-amber-300/90 font-semibold mt-1 tracking-wide">{roleLabel}</div>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Grouped Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {groups.map((group) => (
            <div key={group.title}>
              <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.09em] text-slate-400/80">
                {group.title}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isRoot = item.to === '/student' || item.to === '/teacher' || item.to === '/admin';
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={isRoot}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        `group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-all ${
                          isActive
                            ? 'bg-white/[0.12] text-white font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                            : 'text-slate-300/90 hover:bg-white/[0.06] hover:text-white'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-amber-400" />
                          )}
                          <span className="flex items-center gap-3 min-w-0">
                            <Icon
                              className={`w-[17px] h-[17px] shrink-0 transition-colors ${
                                isActive ? 'text-amber-300' : 'text-slate-400 group-hover:text-slate-200'
                              }`}
                            />
                            <span className="truncate">{item.label}</span>
                          </span>
                          {item.badge !== undefined && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-400 text-slate-950 tabular-nums">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Footer */}
        <div className="p-3.5 border-t border-white/[0.08] bg-black/15">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-white/[0.04] mb-2.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center text-slate-950 font-extrabold text-xs shrink-0 shadow-sm">
              {user.name
                .split(' ')
                .map((p) => p[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-white truncate">{user.name}</div>
              <div className="text-[11px] text-slate-400 truncate">
                {user.grade || user.role} • {user.village || 'India'}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky Topbar with Wayfinding Breadcrumb & Sync Controls */}
        <header className="no-print sticky top-0 z-20 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm min-w-0">
              <span className="hidden sm:inline text-slate-400 font-medium">{roleLabel}</span>
              <ChevronRight className="hidden sm:inline w-3.5 h-3.5 text-slate-300 shrink-0" />
              <span className="font-semibold text-slate-800 truncate">{currentItem?.label}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <ConnectivityPill isOnline={isOnline} simulatedOffline={simulatedOffline} onToggle={toggleSimulatedOffline} />

            {user.role === 'student' && (
              <>
                <SyncStatusBadge status={syncStatus} pendingCount={pendingCount} />
                <button
                  onClick={() => void syncNow()}
                  disabled={!isOnline || syncStatus === 'Syncing'}
                  className="btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'Syncing' ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Sync Now</span>
                </button>
              </>
            )}
          </div>
        </header>

        {/* Offline Banner */}
        {!isOnline && (
          <div className="no-print bg-amber-50 border-b border-amber-200/90 px-4 lg:px-8 py-2.5 text-xs sm:text-sm text-amber-950 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-amber-200/70 flex items-center justify-center shrink-0">
                <WifiOff className="w-3.5 h-3.5 text-amber-800" />
              </div>
              <span>
                <strong>Offline Mode Active:</strong> Practise downloaded topics and mock exams freely. Progress is saved in IndexedDB and auto-syncs online.
              </span>
            </div>
            {simulatedOffline && (
              <button
                onClick={toggleSimulatedOffline}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-900 hover:bg-amber-950 text-white font-semibold text-xs transition cursor-pointer"
              >
                Restore Online
              </button>
            )}
          </div>
        )}

        <main key={location.pathname} className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1320px] w-full mx-auto animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
};
