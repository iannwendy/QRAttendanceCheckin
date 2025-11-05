import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../store/api';
import { useAuthStore } from '../store/authStore';
import './StudentScanPage.css';

function StudentScanPage() {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [location, setLocation] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
  } | null>(null);
  const [locationError, setLocationError] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const { logout, user } = useAuthStore();

  useEffect(() => {
    // Lấy GPS khi component mount
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy || 0,
          });
        },
        (_err) => {
          setLocationError('Không thể lấy vị trí GPS. Vui lòng chuyển sang chế độ OTP.');
        },
      );
    } else {
      setLocationError('Trình duyệt không hỗ trợ GPS. Vui lòng chuyển sang chế độ OTP.');
    }
  }, []);

  const startScan = async () => {
    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          await handleQRCode(decodedText);
          scanner.stop();
          setScanning(false);
        },
        (_errorMessage) => {
          // Ignore scan errors
        },
      );

      setScanning(true);
      setError('');
    } catch (err: any) {
      setError('Không thể khởi động camera: ' + err.message);
    }
  };

  const stopScan = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleQRCode = async (qrToken: string) => {
    if (!location) {
      setError('Không có vị trí GPS. Vui lòng chuyển sang chế độ OTP.');
      return;
    }

    try {
      // Hỗ trợ cả token thuần và deep-link URL ?token=...
      let tokenToUse = qrToken;
      try {
        const url = new URL(qrToken);
        const t = url.searchParams.get('token');
        if (t) tokenToUse = t;
      } catch (_) {
        // not a URL -> keep original
      }

      await api.post('/attendance/checkin-qr', {
        qrToken: tokenToUse,
        lat: location.lat,
        lng: location.lng,
        accuracy: location.accuracy,
      });

      setSuccess(true);
      setError('');
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Điểm danh thất bại');
    }
  };

  useEffect(() => {
    return () => {
      stopScan();
    };
  }, []);

  return (
    <div className="scan-page">
      <div className="scan-container">
        <div className="scan-header" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h1>Quét QR Điểm Danh</h1>
          <button onClick={logout} className="logout-button">Đăng xuất</button>
        </div>
        {user && (
          <div className="location-info" style={{marginTop:10}}>
            <p>MSSV: {user.studentCode || 'N/A'} | Họ tên: {user.fullName}</p>
          </div>
        )}
        {locationError && (
          <div className="location-warning">
            <p>{locationError}</p>
            <a href="/student/otp">Chuyển sang chế độ OTP + Ảnh</a>
          </div>
        )}
        {location && (
          <div className="location-info">
            <p>Vị trí GPS: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}</p>
            <p>Độ chính xác: ±{Math.round(location.accuracy)}m</p>
          </div>
        )}
        <div id="qr-reader" className="qr-reader"></div>
        {!scanning ? (
          <button onClick={startScan} className="scan-button">
            Bắt đầu quét QR
          </button>
        ) : (
          <button onClick={stopScan} className="scan-button stop">
            Dừng quét
          </button>
        )}
        {error && <div className="error-message">{error}</div>}
        {success && (
          <div className="success-message">
            ✅ Điểm danh thành công!
          </div>
        )}
        <div className="scan-actions">
          <a href="/student/otp" className="otp-link">
            Dùng OTP + Ảnh thay thế
          </a>
        </div>
      </div>
    </div>
  );
}

export default StudentScanPage;

