import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useAuthStore } from '../store/authStore';
import api from '../store/api';
import './TeacherSessionPage.css';

interface Attendance {
  id: string;
  method: string;
  status: string;
  createdAt: string;
  student: {
    id: string;
    fullName: string;
    studentCode: string;
  };
  evidence?: {
    photoUrl: string;
  };
}

function TeacherSessionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [qrToken, setQrToken] = useState('');
  const [otp, setOtp] = useState('');
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchQR();
      fetchOTP();
      fetchAttendances(true); // initial load shows spinner

      // Refresh QR slightly earlier than rotation (3 minutes)
      const qrInterval = setInterval(fetchQR, 175000);
      // Refresh OTP every 5 seconds
      const otpInterval = setInterval(fetchOTP, 5000);
      // Auto refresh attendances every 2 seconds
      const attInterval = setInterval(() => fetchAttendances(false), 2000);

      return () => {
        clearInterval(qrInterval);
        clearInterval(otpInterval);
        clearInterval(attInterval);
      };
    }
  }, [id]);

  const fetchQR = async () => {
    if (!id) return;
    try {
      const response = await api.get(`/sessions/${id}/qr`);
      const token: string = response.data.token || JSON.stringify(response.data.payload);
      // Prefer backend-provided deepLink (uses current FRONTEND_URL), fallback to env or origin
      const deep = response.data.deepLink as string | undefined;
      if (deep) {
        setQrToken(deep);
      } else {
        const base = (import.meta as any).env?.VITE_FRONTEND_BASE || window.location.origin;
        setQrToken(`${base}/checkin?token=${encodeURIComponent(token)}`);
      }
      setError('');
    } catch (err: any) {
      console.error('Failed to fetch QR:', err);
      setError(err.response?.data?.message || 'Không thể tải QR code');
    }
  };

  const fetchOTP = async () => {
    if (!id) return;
    try {
      const response = await api.get(`/sessions/${id}/otp`);
      setOtp(response.data.otp || '');
      setError('');
    } catch (err: any) {
      console.error('Failed to fetch OTP:', err);
      setError(err.response?.data?.message || 'Không thể tải OTP');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleBackToDashboard = () => {
    navigate('/teacher/dashboard');
  };

  const fetchAttendances = async (showSpinner: boolean = false) => {
    if (!id) return;
    if (showSpinner) setLoading(true);
    try {
      const response = await api.get(`/attendance/session/${id}`);
      setAttendances((prev) => {
        const next = response.data as typeof prev;
        // Avoid unnecessary re-renders: shallow compare by id+status+createdAt
        if (prev.length === next.length) {
          let same = true;
          for (let i = 0; i < prev.length; i++) {
            const a = prev[i];
            const b = next[i];
            if (!b || a.id !== b.id || a.status !== b.status) {
              same = false;
              break;
            }
          }
          if (same) return prev;
        }
        return next;
      });
    } catch (err) {
      console.error('Failed to fetch attendances:', err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  const approveAttendance = async (attendanceId: string) => {
    try {
      await api.patch(`/attendance/${attendanceId}/approve`);
      fetchAttendances();
    } catch (err) {
      console.error('Failed to approve attendance:', err);
    }
  };

  const rejectAttendance = async (attendanceId: string) => {
    try {
      await api.patch(`/attendance/${attendanceId}/reject`);
      fetchAttendances();
    } catch (err) {
      console.error('Failed to reject attendance:', err);
    }
  };

  return (
    <div className="teacher-page">
      <div className="teacher-container">
        <div className="session-header">
          <h1>Quản lý Buổi Học</h1>
          <div className="header-actions">
            <button onClick={handleBackToDashboard} className="back-button">
              ← Về danh sách
            </button>
            <span className="user-info">Xin chào, {user?.fullName}</span>
            <button onClick={handleLogout} className="logout-button">
              Đăng xuất
            </button>
          </div>
        </div>
        {error && <div className="error-message">{error}</div>}
        <div className="cards-grid">
          <div className="card qr-card">
            <h2>QR Code</h2>
            {qrToken ? (
              <div className="qr-display">
                <QRCodeSVG value={qrToken} size={300} />
                <p className="qr-info">QR token tự động đổi mỗi 3 phút</p>
              </div>
            ) : (
              <div className="qr-display">
                <div className="loading">Đang tải QR code...</div>
              </div>
            )}
          </div>
          <div className="card otp-card">
            <h2>OTP Lớp Học</h2>
            <div className="otp-display">
              {otp ? (
                <>
                  <div className="otp-code">{otp}</div>
                  <p className="otp-info">OTP tự động đổi mỗi 1 phút</p>
                </>
              ) : (
                <>
                  <div className="otp-code">Loading...</div>
                  <p className="otp-info">Đang tải OTP...</p>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="attendance-section">
          <h2>Danh Sách Điểm Danh</h2>
          <button onClick={() => fetchAttendances(true)} className="refresh-button">
            Làm mới
          </button>
          {loading ? (
            <div className="loading">Đang tải...</div>
          ) : (
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>MSSV</th>
                  <th>Họ Tên</th>
                  <th>Phương thức</th>
                  <th>Trạng thái</th>
                  <th>Thời gian</th>
                        <th>Ảnh</th>
                        <th>Duyệt</th>
                        <th>Điểm danh thủ công</th>
                </tr>
              </thead>
              <tbody>
                {attendances.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="no-data">
                      Chưa có điểm danh
                    </td>
                  </tr>
                ) : (
                  attendances.map((attendance) => (
                    <tr key={attendance.id}>
                      <td>{attendance.student.studentCode || 'N/A'}</td>
                      <td>{attendance.student.fullName}</td>
                      <td>
                        {attendance.method === 'QR_GPS'
                          ? 'QR + GPS'
                          : attendance.method === 'OTP_PHOTO'
                          ? 'OTP + Ảnh'
                          : 'Tự thêm'}
                      </td>
                      <td>
                        <span
                          className={`status-badge ${
                            attendance.status === 'APPROVED'
                              ? 'approved'
                              : attendance.status === 'PENDING'
                              ? 'pending'
                              : attendance.status === 'NOT_ATTENDED'
                              ? 'neutral'
                              : attendance.status === 'TOO_FAR'
                              ? 'warning'
                              : 'rejected'
                          }`}
                        >
                          {attendance.status === 'APPROVED'
                            ? 'Đã điểm danh'
                            : attendance.status === 'PENDING'
                            ? 'Chờ duyệt'
                            : attendance.status === 'NOT_ATTENDED'
                            ? 'Chưa điểm danh'
                            : attendance.status === 'TOO_FAR'
                            ? 'Ở quá xa'
                            : 'Từ chối'}
                        </span>
                      </td>
                      <td>
                        {new Date(attendance.createdAt).toLocaleString('vi-VN')}
                      </td>
                      <td>
                        {attendance.evidence ? (
                          <a
                            href={`${import.meta.env.VITE_API_BASE || 'http://localhost:8080'}${attendance.evidence.photoUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="photo-link"
                          >
                            Xem ảnh
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>
                        {attendance.status === 'PENDING' ? (
                          <div className="action-buttons">
                            <button className="action-button approve" onClick={() => approveAttendance(attendance.id)}>Duyệt</button>
                            <button className="action-button reject" onClick={() => rejectAttendance(attendance.id)}>Từ chối</button>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>
                        {attendance.status !== 'APPROVED' ? (
                          <button className="action-button approve" onClick={() => approveAttendance(attendance.id)}>
                            Điểm danh thủ công
                          </button>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default TeacherSessionPage;

