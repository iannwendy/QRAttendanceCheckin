import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../store/api';
import { exportToCSV } from '../utils/exportCSV';
import './AdminReports.css';

interface LecturerInfo {
  id: string | null;
  fullName: string;
  email: string | null;
}

interface ClassStat {
  classId: string;
  classCode: string;
  className: string;
  lecturer: LecturerInfo | null;
  totalSessions: number;
  totalStudents: number;
  averageAttendance: number;
}

interface LecturerStat {
  lecturerId: string | null;
  lecturerName: string;
  lecturerEmail: string | null;
  totalClasses: number;
  totalStudents: number;
  averageAttendance: number;
}

interface LiveSessionStat {
  sessionId: string;
  title: string;
  startTime: string;
  endTime: string;
  class: {
    id: string;
    code: string;
    name: string;
    lecturer?: LecturerInfo | null;
  };
  approved: number;
  pending: number;
  rejected: number;
  notCheckedIn: number;
  total: number;
  attendanceRate: number;
}

interface AnalyticsOverview {
  summary: {
    totalClasses: number;
    activeLecturers: number;
    averageAttendance: number;
    liveSessions: number;
  };
  classStats: ClassStat[];
  lecturerStats: LecturerStat[];
  liveSessions: LiveSessionStat[];
}

function AdminReports() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState('');
  const [attendanceView, setAttendanceView] = useState<'class' | 'lecturer'>(
    'class',
  );

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleExportAllReports = async () => {
    try {
      setLoading(true);
      const response = await api.get('/attendance/report/all');
      
      if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
        alert('Không có dữ liệu báo cáo để xuất.');
        return;
      }

      const allRows: any[] = [];
      
      // Add header row
      allRows.push({
        'Lớp học': 'Lớp học',
        'MSSV': 'MSSV',
        'Họ và Tên': 'Họ và Tên',
        'Email': 'Email',
        'Tổng số buổi học': 'Tổng số buổi học',
        'Số buổi có mặt': 'Số buổi có mặt',
        'Tỷ lệ chuyên cần (%)': 'Tỷ lệ chuyên cần (%)',
      });

      // Add data rows for all classes
      response.data.forEach((classReport: any) => {
        if (classReport.students && Array.isArray(classReport.students)) {
          classReport.students.forEach((student: any) => {
            allRows.push({
              'Lớp học': `${classReport.class?.code || ''} - ${classReport.class?.name || ''}`,
              'MSSV': student.studentCode || '',
              'Họ và Tên': student.fullName || '',
              'Email': student.email || '',
              'Tổng số buổi học': student.totalSessions || 0,
              'Số buổi có mặt': student.attendedSessions || 0,
              'Tỷ lệ chuyên cần (%)': student.attendanceRate || 0,
            });
          });
        }
      });

      if (allRows.length <= 1) {
        alert('Không có dữ liệu sinh viên để xuất.');
        return;
      }

      const filename = `BaoCaoChuyenCan_TatCaLop_${new Date().toISOString().split('T')[0]}.csv`;
      exportToCSV(allRows, filename);
    } catch (err: any) {
      console.error('Failed to export reports:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Lỗi không xác định';
      alert(`Không thể xuất báo cáo: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      setAnalyticsError('');
      const response = await api.get('/attendance/analytics/overview');
      setAnalytics(response.data);
    } catch (err: any) {
      console.error('Failed to load analytics overview:', err);
      const errorMessage =
        err.response?.data?.message || 'Không thể tải thống kê';
      setAnalyticsError(errorMessage);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const renderClassStats = () => {
    if (!analytics || analytics.classStats.length === 0) {
      return <p className="empty-state">Chưa có dữ liệu lớp học.</p>;
    }

    return (
      <div className="stat-grid">
        {analytics.classStats.map((item) => (
          <div key={item.classId} className="stat-card">
            <div className="stat-card-header">
              <div>
                <p className="stat-title">{item.classCode}</p>
                <span className="stat-subtitle">{item.className}</span>
              </div>
              <span className="stat-rate">
                {item.averageAttendance.toFixed(1)}%
              </span>
            </div>
            <div className="stat-meta">
              <span>{item.totalSessions} buổi</span>
              <span>{item.totalStudents} SV</span>
              {item.lecturer?.fullName && (
                <span>GV: {item.lecturer.fullName}</span>
              )}
            </div>
            <div className="stat-progress">
              <div
                className="stat-progress-fill"
                style={{ width: `${Math.min(item.averageAttendance, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderLecturerStats = () => {
    if (!analytics || analytics.lecturerStats.length === 0) {
      return <p className="empty-state">Chưa có dữ liệu giảng viên.</p>;
    }

    return (
      <div className="stat-grid">
        {analytics.lecturerStats.map((lecturer) => (
          <div key={lecturer.lecturerId || lecturer.lecturerName} className="stat-card">
            <div className="stat-card-header">
              <div>
                <p className="stat-title">{lecturer.lecturerName}</p>
                <span className="stat-subtitle">
                  {lecturer.lecturerEmail || 'Chưa có email'}
                </span>
              </div>
              <span className="stat-rate">
                {lecturer.averageAttendance.toFixed(1)}%
              </span>
            </div>
            <div className="stat-meta">
              <span>{lecturer.totalClasses} lớp</span>
              <span>{lecturer.totalStudents} SV</span>
            </div>
            <div className="stat-progress">
              <div
                className="stat-progress-fill"
                style={{ width: `${Math.min(lecturer.averageAttendance, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderLiveSessions = () => {
    if (!analytics || analytics.liveSessions.length === 0) {
      return (
        <div className="empty-state">
          Không có buổi học nào đang diễn ra. Hãy quay lại sau.
        </div>
      );
    }

    return (
      <div className="live-session-list">
        {analytics.liveSessions.map((session) => (
          <div key={session.sessionId} className="live-session-card">
            <div className="live-session-header">
              <div>
                <p className="live-session-title">{session.title}</p>
                <span className="live-session-subtitle">
                  {session.class.code} - {session.class.name}
                </span>
              </div>
              <span className="live-session-badge">
                {new Date(session.startTime).toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                -{' '}
                {new Date(session.endTime).toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <div className="live-session-stats">
              <span>Đã duyệt: {session.approved}</span>
              <span>Chờ duyệt: {session.pending}</span>
              <span>Từ chối: {session.rejected}</span>
              <span>Chưa điểm danh: {session.notCheckedIn}</span>
            </div>
            <div className="stat-progress">
              <div
                className="stat-progress-fill live"
                style={{ width: `${Math.min(session.attendanceRate, 100)}%` }}
              />
            </div>
            <div className="live-session-footer">
              <span>{session.attendanceRate}% chuyên cần</span>
              {session.class.lecturer?.fullName && (
                <span>GV: {session.class.lecturer.fullName}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="admin-page">
      <div className="admin-container">
        <div className="admin-header">
          <div className="admin-header-left">
            <h1>Báo cáo Tổng quan</h1>
            <p className="admin-subtitle">Trang dành cho ADMIN với chức năng xem báo cáo toàn hệ thống</p>
          </div>
          <div className="admin-actions">
            <span className="user-info">Xin chào, {user?.fullName}</span>
            <button onClick={handleLogout} className="logout-button">Đăng xuất</button>
          </div>
        </div>

        <div className="admin-cards">
          <div className="admin-card admin-card-full">
            <div className="card-header">
              <div>
                <h3>Báo cáo hiện diện</h3>
                <p>Biểu đồ tỉ lệ điểm danh theo lớp và theo giảng viên.</p>
              </div>
              <button
                onClick={handleExportAllReports}
                disabled={loading}
                className="header-export-button"
              >
                {loading ? 'Đang xuất CSV...' : 'Xuất CSV toàn hệ thống'}
              </button>
            </div>
            <div className="analytics-layout">
              <div className="analytics-main">
                <div className="attendance-tabs">
                  <button
                    className={attendanceView === 'class' ? 'active' : ''}
                    onClick={() => setAttendanceView('class')}
                  >
                    Theo lớp
                  </button>
                  <button
                    className={attendanceView === 'lecturer' ? 'active' : ''}
                    onClick={() => setAttendanceView('lecturer')}
                  >
                    Theo giảng viên
                  </button>
                </div>
                <div className="analytics-content">
                  {analyticsLoading ? (
                    <div className="analytics-loading">Đang tải thống kê...</div>
                  ) : analyticsError ? (
                    <div className="analytics-error">{analyticsError}</div>
                  ) : attendanceView === 'class' ? (
                    renderClassStats()
                  ) : (
                    renderLecturerStats()
                  )}
                </div>
              </div>
              {analytics && (
                <div className="analytics-summary">
                  <div className="summary-grid">
                    <div className="summary-tile">
                      <span>Tổng lớp</span>
                      <strong>{analytics.summary.totalClasses}</strong>
                    </div>
                    <div className="summary-tile">
                      <span>Giảng viên hoạt động</span>
                      <strong>{analytics.summary.activeLecturers}</strong>
                    </div>
                    <div className="summary-tile">
                      <span>Tỷ lệ trung bình</span>
                      <strong>
                        {analytics.summary.averageAttendance.toFixed(1)}%
                      </strong>
                    </div>
                    <div className="summary-tile">
                      <span>Buổi đang diễn ra</span>
                      <strong>{analytics.summary.liveSessions}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="admin-card admin-card-full">
            <div className="card-header">
              <div>
                <h3>Giám sát thời gian thực</h3>
                <p>Thống kê nhanh các phiên điểm danh đang diễn ra.</p>
              </div>
            </div>
            <div className="analytics-content">
              {analyticsLoading ? (
                <div className="analytics-loading">Đang tải dữ liệu...</div>
              ) : analyticsError ? (
                <div className="analytics-error">{analyticsError}</div>
              ) : (
                renderLiveSessions()
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default AdminReports;


