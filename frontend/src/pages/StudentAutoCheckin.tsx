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

  useEffect(() => {
    if (!token || hasCheckedRef.current) {
      setMessage('Thiếu token. Vui lòng quét lại QR.');
      return;
    }
    hasCheckedRef.current = true;

    // Helper: extract sessionId from token (JWT or JSON payload)
    const extractSessionId = (t: string): string | null => {
      try {
        // Try JWT decode
        const parts = t.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          if (payload.sessionId) return payload.sessionId;
        }
      } catch (_) {}
      try {
        const obj = JSON.parse(t);
        if (obj.sessionId) return obj.sessionId;
      } catch (_) {}
      return null;
    };

    const sessionId = extractSessionId(token);

    // Nếu chưa đăng nhập: lưu token (+ sessionId) và chuyển về login
    if (!isAuthenticated) {
      localStorage.setItem('pendingCheckinToken', token);
      if (sessionId) localStorage.setItem('pendingSessionId', sessionId);
      navigate('/login');
      return;
    }

    // Đã đăng nhập: thử lấy GPS và check-in tự động
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
          setMessage('✅ Điểm danh thành công!');
          setTimeout(() => navigate('/student/scan'), 1200);
        })
        .catch((err) => {
          // Không fallback OTP ở đây; chỉ báo lỗi và về trang quét để thử lại
          const msg = err?.response?.data?.message || 'Điểm danh thất bại';
          if (msg.includes('điểm danh rồi') || msg.includes('Điểm danh rồi')) {
            // Trường hợp double-submit (StrictMode/ghi đè), coi như thành công
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
          // Không lấy được GPS -> chuyển sang OTP + Ảnh
          if (sessionId) {
            localStorage.setItem('pendingSessionId', sessionId);
            navigate(`/student/otp?sessionId=${encodeURIComponent(sessionId)}`);
          } else {
            navigate('/student/otp');
          }
        },
        { enableHighAccuracy: true, timeout: 8000 },
      );
    } else {
      // Thiết bị không hỗ trợ GPS -> OTP
      if (sessionId) {
        localStorage.setItem('pendingSessionId', sessionId);
        navigate(`/student/otp?sessionId=${encodeURIComponent(sessionId)}`);
      } else {
        navigate('/student/otp');
      }
    }
  }, [token, isAuthenticated, navigate]);

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div>{message}</div>
    </div>
  );
}

export default StudentAutoCheckin;


