import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import LoginPage from './pages/LoginPage';
import StudentScanPage from './pages/StudentScanPage';
import StudentOTPPage from './pages/StudentOTPPage';
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherSessionPage from './pages/TeacherSessionPage';
import CreateSessionPage from './pages/CreateSessionPage';
import StudentAutoCheckin from './pages/StudentAutoCheckin';
import ProtectedRoute from './components/ProtectedRoute';
import AdminReports from './pages/AdminReports';

function App() {
  const { user, isAuthenticated } = useAuthStore();

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
          }
        />
        <Route
          path="/student/scan"
          element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <StudentScanPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/otp"
          element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <StudentOTPPage />
            </ProtectedRoute>
          }
        />
        <Route path="/checkin" element={<StudentAutoCheckin />} />
        <Route
          path="/teacher/dashboard"
          element={
            <ProtectedRoute allowedRoles={['LECTURER']}>
              <TeacherDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/session/:id"
          element={
            <ProtectedRoute allowedRoles={['LECTURER']}>
              <TeacherSessionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/class/:classId/create-session"
          element={
            <ProtectedRoute allowedRoles={['LECTURER']}>
              <CreateSessionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminReports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={
            <Navigate
              to={
                isAuthenticated
                  ? user?.role === 'STUDENT'
                    ? '/student/scan'
                    : user?.role === 'LECTURER'
                    ? '/teacher/dashboard'
                    : '/admin/reports'
                  : '/login'
              }
              replace
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

