import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
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

function SessionDisplayPage() {
  const { id } = useParams<{ id: string }>();
  const [qrToken, setQrToken] = useState('');
  const [otp, setOtp] = useState('');
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
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
      fetchAttendances();

      // Refresh QR slightly earlier than rotation (3 minutes)
      const qrInterval = setInterval(fetchQR, 175000);
      // Refresh OTP every 5 seconds
      const otpInterval = setInterval(fetchOTP, 5000);
      // Auto refresh attendances every 2 seconds
      const attInterval = setInterval(() => fetchAttendances(), 2000);

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
      const deep = response.data.deepLink as string | undefined;
      if (deep) {
        setQrToken(deep);
      } else {
        const base = (import.meta as any).env?.VITE_FRONTEND_BASE || window.location.origin;
        setQrToken(`${base}/checkin?token=${encodeURIComponent(token)}`);
      }
    } catch (err: any) {
      console.error('Failed to fetch QR:', err);
    }
  };

  const fetchOTP = async () => {
    if (!effectiveId) return;
    try {
      const response = await api.get(`/sessions/${effectiveId}/otp`);
      setOtp(response.data.otp || '');
    } catch (err: any) {
      console.error('Failed to fetch OTP:', err);
    }
  };

  const fetchAttendances = async () => {
    if (!effectiveId) return;
    try {
      const response = await api.get(`/attendance/session/${effectiveId}`);
      setAttendances((prev) => {
        const next = response.data as typeof prev;
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
    }
  };

  const recentApproved = useMemo(() => {
    const successful = attendances.filter((a) => a.status === 'APPROVED' || a.status === 'TOO_FAR');
    successful.sort((a, b) => {
      const bTime = new Date(b.updatedAt ?? b.createdAt).getTime();
      const aTime = new Date(a.updatedAt ?? a.createdAt).getTime();
      return bTime - aTime;
    });
    return successful.slice(0, 5);
  }, [attendances]);

  return (
    <div className="session-display-page">
      <div className="maximized-container-fullscreen">
        <div className="maximized-content">
          <div className="maximized-qr-section">
            <h3>
              {sessionInfo?.class ? (
                <>
                  <div className="session-display-class">{sessionInfo.class.name}</div>
                  <div className="session-display-title">{sessionInfo.title || 'Quản lý Buổi Học'}</div>
                </>
              ) : (
                sessionInfo?.title || 'Quản lý Buổi Học'
              )}
            </h3>
            {qrToken ? (
              <div className="qr-display">
                <QRCodeSVG value={qrToken} size={500} />
                <p className="qr-info">QR token tự động đổi mỗi 3 phút</p>
              </div>
            ) : (
              <div className="qr-display">
                <div className="loading">Đang tải QR code...</div>
              </div>
            )}
          </div>
          <div className="maximized-right-section">
            <div className="maximized-otp-section">
              <h3>OTP Lớp Học</h3>
              <div className="otp-display">
                {otp ? (
                  <>
                    <div className="otp-code maximized-otp-code">{otp}</div>
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
                    <div className="otp-code otp-loading maximized-otp-code">Đang tải...</div>
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
            <div className="maximized-recent-section">
              <h3>Sinh viên vừa điểm danh</h3>
              {recentApproved.length > 0 ? (
                <ul className="recent-list">
                  {recentApproved.map((attendance) => {
                    const getMethodInfo = () => {
                      if (attendance.status === 'TOO_FAR') {
                        return { text: 'Ở xa', className: 'method-far' };
                      }
                      if (attendance.method === 'QR_GPS') {
                        return { text: 'QR', className: 'method-qr' };
                      }
                      if (attendance.method === 'OTP_PHOTO') {
                        return { text: 'OTP + Ảnh', className: 'method-otp' };
                      }
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
        </div>
      </div>
    </div>
  );
}

export default SessionDisplayPage;

