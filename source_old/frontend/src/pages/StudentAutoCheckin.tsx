import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../store/api';

function useQuery() {
  const { search } = useLocation();
  return new URLSearchParams(search);
}

function StudentAutoCheckin() {
  const query = useQuery();
  const token = query.get('token') || '';
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [message, setMessage] = useState('Đang xử lý...');
  const hasCheckedRef = useRef(false);
  const [sessionDetails, setSessionDetails] = useState<{
    publicCode?: string | null;
    className?: string | null;
    sessionTitle?: string | null;
  } | null>(null);

  useEffect(() => {
    if (!token) {
      setMessage('Thiếu token. Vui lòng quét lại QR.');
      return;
    }
    if (hasCheckedRef.current) {
      return;
    }

    const parsePayload = (payload: any) => {
      if (!payload) return null;
      return {
        sessionId: payload.sessionId || null,
        publicCode: payload.publicCode || null,
        className: payload.className || null,
        sessionTitle: payload.sessionTitle || null,
      };
    };

    const extractInfo = (t: string) => {
      try {
        const parts = t.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(
            atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')),
          );
          const info = parsePayload(payload);
          if (info?.sessionId) return info;
        }
      } catch (_) {}
      try {
        const obj = JSON.parse(t);
        const info = parsePayload(obj);
        if (info?.sessionId) return info;
      } catch (_) {}
      return null;
    };

    const info = extractInfo(token);
    if (!info || !info.sessionId) {
      setMessage('Thiếu token. Vui lòng quét lại QR.');
      return;
    }

    hasCheckedRef.current = true;
    setSessionDetails({
      publicCode: info.publicCode,
      className: info.className,
      sessionTitle: info.sessionTitle,
    });

    const publicCode = info.publicCode || '';

    const storeMetaForOtp = () => {
      if (publicCode) {
        localStorage.setItem('pendingPublicCode', publicCode);
      }
      if (info.className || info.sessionTitle) {
        localStorage.setItem(
          'pendingSessionMeta',
          JSON.stringify({
            className: info.className || '',
            sessionTitle: info.sessionTitle || '',
          }),
        );
      }
    };

    if (!isAuthenticated) {
      localStorage.setItem('pendingCheckinToken', token);
      storeMetaForOtp();
      navigate('/login');
      return;
    }

    const doCheckin = (lat: number, lng: number, accuracy: number) => {
      api
        .post('/attendance/checkin-qr', {
          qrToken: token,
          lat,
          lng,
          accuracy,
        })
        .then(() => {
          localStorage.removeItem('pendingCheckinToken');
          localStorage.removeItem('pendingPublicCode');
          localStorage.removeItem('pendingSessionMeta');
          setMessage('✅ Điểm danh thành công!');
          setTimeout(() => navigate('/student/scan'), 1200);
        })
        .catch((err) => {
          const msg = err?.response?.data?.message || 'Điểm danh thất bại';
          if (msg.includes('điểm danh rồi') || msg.includes('Điểm danh rồi')) {
            setMessage('✅ Bạn đã điểm danh');
          } else {
            setMessage(`❌ ${msg}`);
          }
          setTimeout(() => navigate('/student/scan'), 1500);
        });
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          doCheckin(
            pos.coords.latitude,
            pos.coords.longitude,
            pos.coords.accuracy || 0,
          );
        },
        () => {
          storeMetaForOtp();
          if (publicCode) {
            navigate(`/student/otp?code=${encodeURIComponent(publicCode)}`);
          } else {
            navigate('/student/otp');
          }
        },
        { enableHighAccuracy: true, timeout: 8000 },
      );
    } else {
      storeMetaForOtp();
      if (publicCode) {
        navigate(`/student/otp?code=${encodeURIComponent(publicCode)}`);
      } else {
        navigate('/student/otp');
      }
    }
  }, [token, isAuthenticated, navigate]);

  const hasDetails =
    sessionDetails &&
    (sessionDetails.className || sessionDetails.sessionTitle || sessionDetails.publicCode);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
        {hasDetails && (
          <div
            style={{
              padding: '14px 20px',
              borderRadius: 16,
              background: 'linear-gradient(135deg, #eef2ff, #dbeafe)',
              boxShadow: '0 12px 30px rgba(30,64,175,0.15)',
              textAlign: 'center',
              minWidth: 260,
            }}
          >
            <div style={{ fontWeight: 700, color: '#1e3a8a', fontSize: 16 }}>
              {(sessionDetails?.className || 'Môn học')} ·{' '}
              {(sessionDetails?.sessionTitle || 'Buổi học')}
            </div>
            {sessionDetails?.publicCode && (
              <div style={{ marginTop: 6, fontSize: 13, color: '#1d4ed8', fontWeight: 600 }}>
                Mã buổi: {sessionDetails.publicCode}
              </div>
            )}
          </div>
        )}
        <div>{message}</div>
      </div>
    </div>
  );
}

export default StudentAutoCheckin;


