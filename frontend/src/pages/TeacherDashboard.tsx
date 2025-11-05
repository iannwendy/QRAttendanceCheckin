import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../store/api';
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

  return (
    <div className="teacher-dashboard">
      <div className="dashboard-header">
        <h1>Quản lý Lớp Học</h1>
        <div className="header-actions">
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
          {classes.map((classItem) => (
            <div key={classItem.id} className="class-card">
              <div className="class-header">
                <h2>{classItem.code} - {classItem.name}</h2>
                <button
                  onClick={() => handleCreateSession(classItem.id)}
                  className="create-session-button"
                >
                  + Tạo Buổi Học
                </button>
              </div>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TeacherDashboard;

