import { useState, useEffect, useMemo } from 'react';
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
  updatedAt?: string;
  student: {
    id: string;
    fullName: string;
    studentCode: string;
  };
  evidence?: {
    photoUrl: string;
  };
}

interface SessionInfo {
  id: string;
  title: string;
  publicCode: string | null;
  class?: {
    name: string;
    code: string;
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
  const [search, setSearch] = useState('');
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);

  const recentApproved = useMemo(() => {
    const successful = attendances.filter((a) => a.status === 'APPROVED' || a.status === 'TOO_FAR');
    successful.sort((a, b) => {
      const bTime = new Date(b.updatedAt ?? b.createdAt).getTime();
      const aTime = new Date(a.updatedAt ?? a.createdAt).getTime();
      return bTime - aTime;
    });
    return successful.slice(0, 10);
  }, [attendances]);

  const [effectiveId, setEffectiveId] = useState<string | null>(null);

  useEffect(() => {
    const resolveId = async () => {
      if (!id) return;
      const looksLikeCode = /^[A-HJ-NP-Z2-9]{6}$/.test(id);
      if (looksLikeCode) {
        try {
          const res = await api.get(`/sessions/code/${id}`);
          setEffectiveId(res.data.id);
          setSessionInfo(res.data as SessionInfo);
        } catch (e) {
          setEffectiveId(null);
        }
      } else {
        setEffectiveId(id);
      }
    };
    resolveId();
  }, [id]);

  useEffect(() => {
    if (effectiveId) {
      fetchSessionInfo();
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
  }, [effectiveId]);

  const fetchSessionInfo = async () => {
    if (!effectiveId) return;
    try {
      const response = await api.get(`/sessions/${effectiveId}`);
      setSessionInfo(response.data as SessionInfo);
    } catch (err) {
      console.error('Failed to fetch session info:', err);
    }
  };

  const fetchQR = async () => {
    if (!effectiveId) return;
    try {
      const response = await api.get(`/sessions/${effectiveId}/qr`);
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
    if (!effectiveId) return;
    try {
      const response = await api.get(`/sessions/${effectiveId}/otp`);
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
    if (!effectiveId) return;
    if (showSpinner) setLoading(true);
    try {
      const response = await api.get(`/attendance/session/${effectiveId}`);
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
          <div className="session-header-left">
            <h1>{sessionInfo?.title || 'Quản lý Buổi Học'}</h1>
            <div className="session-subtitle">
              {sessionInfo?.class && (
                <span className="session-class-name">
                  {sessionInfo.class.code} · {sessionInfo.class.name}
                </span>
              )}
            </div>
          </div>
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
                  {sessionInfo?.publicCode ? (
                    <div className="session-code-inline">
                      <span className="session-code-label">Mã buổi:</span>
                      <span className="session-code-value">{sessionInfo.publicCode}</span>
                    </div>
                  ) : (
                    <div className="session-code-inline missing">Mã buổi: Chưa có</div>
                  )}
                </>
              ) : (
                <>
                  <div className="otp-code">Loading...</div>
                  <p className="otp-info">Đang tải OTP...</p>
                  {sessionInfo?.publicCode ? (
                    <div className="session-code-inline">
                      <span className="session-code-label">Mã buổi:</span>
                      <span className="session-code-value">{sessionInfo.publicCode}</span>
                    </div>
                  ) : (
                    <div className="session-code-inline missing">Mã buổi: Chưa có</div>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="card recent-card">
            <h2>Sinh viên vừa điểm danh</h2>
            {recentApproved.length > 0 ? (
              <ul className="recent-list">
                {recentApproved.map((attendance) => {
                  const getMethodInfo = () => {
                    // Nếu status là TOO_FAR, hiển thị "Ở xa" với màu đỏ
                    if (attendance.status === 'TOO_FAR') {
                      return { text: 'Ở xa', className: 'method-far' };
                    }
                    // Nếu là QR_GPS, hiển thị "QR" với màu xanh lá
                    if (attendance.method === 'QR_GPS') {
                      return { text: 'QR', className: 'method-qr' };
                    }
                    // Nếu là OTP_PHOTO, hiển thị "OTP + Ảnh" với màu xanh dương
                    if (attendance.method === 'OTP_PHOTO') {
                      return { text: 'OTP + Ảnh', className: 'method-otp' };
                    }
                    // Các trường hợp khác (thủ công)
                    return { text: 'Thủ công', className: 'method-manual' };
                  };
                  const methodInfo = getMethodInfo();
                  return (
                    <li key={attendance.id} className="recent-item">
                      <div className="recent-student">
                        <span className="student-code">{attendance.student.studentCode || 'N/A'}</span>
                        <span className="student-name">{attendance.student.fullName}</span>
                      </div>
                      <span className={`recent-method ${methodInfo.className}`}>
                        {methodInfo.text}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="recent-empty">Chưa có sinh viên điểm danh</div>
            )}
          </div>
        </div>
        <div className="attendance-section">
          <h2>Danh Sách Điểm Danh</h2>
          <div className="attendance-actions">
            <div className="search-wrapper">
              <input
                type="text"
                className="search-input"
                placeholder="Tìm nhanh theo MSSV, họ tên..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button onClick={() => fetchAttendances(true)} className="refresh-button">
              Làm mới
            </button>
          </div>
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
                {attendances
                  .filter((a) => {
                    const q = search.trim().toLowerCase();
                    if (!q) return true;
                    const code = (a.student.studentCode || '').toLowerCase();
                    const name = (a.student.fullName || '').toLowerCase();
                    return code.includes(q) || name.includes(q);
                  })
                  .map((attendance) => (
                    <tr key={attendance.id}>
                      <td>{attendance.student.studentCode || 'N/A'}</td>
                      <td>{attendance.student.fullName}</td>
                      <td>
                        {(() => {
                          // Nếu status là TOO_FAR, hiển thị "Ở xa" với màu đỏ
                          if (attendance.status === 'TOO_FAR') {
                            return (
                              <span className="method-badge method-far">Ở xa</span>
                            );
                          }
                          // Nếu là QR_GPS, hiển thị "QR + GPS" với màu xanh lá
                          if (attendance.method === 'QR_GPS') {
                            return (
                              <span className="method-badge method-qr">QR + GPS</span>
                            );
                          }
                          // Nếu là OTP_PHOTO, hiển thị "OTP + Ảnh" với màu xanh dương
                          if (attendance.method === 'OTP_PHOTO') {
                            return (
                              <span className="method-badge method-otp">OTP + Ảnh</span>
                            );
                          }
                          // Các trường hợp khác (thủ công)
                          return (
                            <span className="method-badge method-manual">Tự thêm</span>
                          );
                        })()}
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
                        {new Date((attendance as any).updatedAt || attendance.createdAt).toLocaleString('vi-VN')}
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
                  ))}
                {attendances.length === 0 && (
                  <tr>
                    <td colSpan={6} className="no-data">
                      Chưa có điểm danh
                    </td>
                  </tr>
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

