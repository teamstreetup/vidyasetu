import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OfflineProvider } from './context/OfflineContext';
import { Layout } from './components/Layout';
import { AuthPage } from './pages/AuthPage';

// Student Pages
import { StudentDashboard } from './pages/student/StudentDashboard';
import { SubjectsTopics } from './pages/student/SubjectsTopics';
import { PracticeModule } from './pages/student/PracticeModule';
import { MockExams } from './pages/student/MockExams';
import { PerformanceDashboard } from './pages/student/PerformanceDashboard';
import { Recommendations } from './pages/student/Recommendations';
import { OfflineSyncPage } from './pages/student/OfflineSyncPage';
import { ProfileSettings } from './pages/student/ProfileSettings';

// Teacher Pages
import { TeacherDashboard } from './pages/teacher/TeacherDashboard';
import { TeacherClasses } from './pages/teacher/TeacherClasses';
import { TeacherStudents } from './pages/teacher/TeacherStudents';
import { TeacherAssignments } from './pages/teacher/TeacherAssignments';
import { TeacherAnalytics } from './pages/teacher/TeacherAnalytics';
import { TeacherReports } from './pages/teacher/TeacherReports';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminSubjectsTopics } from './pages/admin/AdminSubjectsTopics';
import { AdminQuestionBank } from './pages/admin/AdminQuestionBank';
import { AdminMockExams } from './pages/admin/AdminMockExams';
import { AdminContentPublishing } from './pages/admin/AdminContentPublishing';
import { AdminSyncMonitoring } from './pages/admin/AdminSyncMonitoring';

import type { UserRole } from './types';

const ProtectedRoute: React.FC<{ roles: UserRole[]; children: React.ReactNode }> = ({ roles, children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading VidyaSetu…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) {
    const target = user.role === 'admin' ? '/admin' : user.role === 'teacher' ? '/teacher' : '/student';
    return <Navigate to={target} replace />;
  }
  return <Layout>{children}</Layout>;
};

const RootRedirect: React.FC = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading VidyaSetu…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'teacher') return <Navigate to="/teacher" replace />;
  return <Navigate to="/student" replace />;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <OfflineProvider>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<AuthPage />} />

            {/* Student Routes */}
            <Route path="/student" element={<ProtectedRoute roles={['student']}><StudentDashboard /></ProtectedRoute>} />
            <Route path="/student/subjects" element={<ProtectedRoute roles={['student']}><SubjectsTopics /></ProtectedRoute>} />
            <Route path="/student/practice" element={<ProtectedRoute roles={['student']}><PracticeModule /></ProtectedRoute>} />
            <Route path="/student/exams" element={<ProtectedRoute roles={['student']}><MockExams /></ProtectedRoute>} />
            <Route path="/student/performance" element={<ProtectedRoute roles={['student']}><PerformanceDashboard /></ProtectedRoute>} />
            <Route path="/student/recommendations" element={<ProtectedRoute roles={['student']}><Recommendations /></ProtectedRoute>} />
            <Route path="/student/offline" element={<ProtectedRoute roles={['student']}><OfflineSyncPage /></ProtectedRoute>} />
            <Route path="/student/profile" element={<ProtectedRoute roles={['student']}><ProfileSettings /></ProtectedRoute>} />

            {/* Teacher Routes */}
            <Route path="/teacher" element={<ProtectedRoute roles={['teacher', 'admin']}><TeacherDashboard /></ProtectedRoute>} />
            <Route path="/teacher/classes" element={<ProtectedRoute roles={['teacher', 'admin']}><TeacherClasses /></ProtectedRoute>} />
            <Route path="/teacher/students" element={<ProtectedRoute roles={['teacher', 'admin']}><TeacherStudents /></ProtectedRoute>} />
            <Route path="/teacher/assignments" element={<ProtectedRoute roles={['teacher', 'admin']}><TeacherAssignments /></ProtectedRoute>} />
            <Route path="/teacher/analytics" element={<ProtectedRoute roles={['teacher', 'admin']}><TeacherAnalytics /></ProtectedRoute>} />
            <Route path="/teacher/reports" element={<ProtectedRoute roles={['teacher', 'admin']}><TeacherReports /></ProtectedRoute>} />

            {/* Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute roles={['admin']}><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/subjects" element={<ProtectedRoute roles={['admin']}><AdminSubjectsTopics /></ProtectedRoute>} />
            <Route path="/admin/questions" element={<ProtectedRoute roles={['admin']}><AdminQuestionBank /></ProtectedRoute>} />
            <Route path="/admin/exams" element={<ProtectedRoute roles={['admin']}><AdminMockExams /></ProtectedRoute>} />
            <Route path="/admin/publishing" element={<ProtectedRoute roles={['admin']}><AdminContentPublishing /></ProtectedRoute>} />
            <Route path="/admin/sync" element={<ProtectedRoute roles={['admin']}><AdminSyncMonitoring /></ProtectedRoute>} />

            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </OfflineProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
