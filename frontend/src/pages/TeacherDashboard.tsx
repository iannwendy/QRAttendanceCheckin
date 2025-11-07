import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../store/api';
import { exportAttendanceReportToCSV } from '../utils/exportCSV';
import './TeacherDashboard.css';

interface Class {
  id: string;
  code: string;
  name: string;
  sessions: Array<{
    id: string;
    title: string;
    startTime: string;
    endTime: string;
  }>;
}

function TeacherDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const response = await api.get('/classes');
      setClasses(response.data);
    } catch (err: any) {
      console.error('Failed to fetch classes:', err);
      setError('Không thể tải danh sách lớp học');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCreateSession = (classId: string) => {
    navigate(`/teacher/class/${classId}/create-session`);
  };

  const handleViewSession = (sessionId: string) => {
    navigate(`/teacher/session/${sessionId}`);
  };

  const handleToggleClass = (classId: string) => {
    setExpandedClasses((prev) => ({
      ...prev,
      [classId]: !prev[classId],
    }));
  };

  const handleExportReport = async (classId: string, className: string) => {
    try {
      const response = await api.get(`/attendance/report/class/${classId}`);
      if (!response.data || !response.data.report) {
        alert('Không có dữ liệu báo cáo để xuất.');
        return;
      }
      const filename = `BaoCaoChuyenCan_${className}_${new Date().toISOString().split('T')[0]}.csv`;
      exportAttendanceReportToCSV(response.data, filename);
    } catch (err: any) {
      console.error('Failed to export report:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Lỗi không xác định';
      alert(`Không thể xuất báo cáo: ${errorMessage}`);
    }
  };

  return (
    <div className="teacher-dashboard">
      <div className="dashboard-header">
        <h1>Quản lý Lớp Học</h1>
        <div className="header-actions">
          <button
            onClick={() => navigate('/teacher/create-class')}
            className="create-class-button"
          >
            + Tạo Lớp Mới
          </button>
          <span className="user-info">Xin chào, {user?.fullName}</span>
          <button onClick={handleLogout} className="logout-button">
            Đăng xuất
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Đang tải...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <div className="classes-list">
          {classes.map((classItem) => {
            const isExpanded = !!expandedClasses[classItem.id];
            return (
              <div key={classItem.id} className={`class-card ${isExpanded ? 'expanded' : 'collapsed'}`}>
                <div className="class-header">
                  <button
                    type="button"
                    className={`class-title-button ${isExpanded ? 'expanded' : ''}`}
                    onClick={() => handleToggleClass(classItem.id)}
                    aria-expanded={isExpanded}
                  >
                    <span className="class-title-arrow" aria-hidden="true" />
                    <span>{classItem.code} - {classItem.name}</span>
                  </button>
                  <div className="class-header-actions">
                    <button
                      onClick={() => handleExportReport(classItem.id, classItem.code)}
                      className="export-report-button"
                    >
                      Xuất Báo Cáo
                    </button>
                    <button
                      onClick={() => handleCreateSession(classItem.id)}
                      className="create-session-button"
                    >
                      + Tạo Buổi Học
                    </button>
                  </div>
                </div>
                {isExpanded && (
                  <div className="sessions-list">
                    <h3>Danh sách Buổi Học</h3>
                    {classItem.sessions && classItem.sessions.length > 0 ? (
                      <table className="sessions-table">
                        <thead>
                          <tr>
                            <th>Tiêu đề</th>
                            <th>Thời gian bắt đầu</th>
                            <th>Thời gian kết thúc</th>
                            <th>Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {classItem.sessions.map((session) => (
                            <tr key={session.id}>
                              <td>{session.title}</td>
                              <td>
                                {new Date(session.startTime).toLocaleString('vi-VN')}
                              </td>
                              <td>
                                {new Date(session.endTime).toLocaleString('vi-VN')}
                              </td>
                              <td>
                                <button
                                  onClick={() => handleViewSession(session.id)}
                                  className="view-session-button"
                                >
                                  Xem chi tiết
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="no-sessions">Chưa có buổi học nào. Hãy tạo buổi học đầu tiên!</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TeacherDashboard;

