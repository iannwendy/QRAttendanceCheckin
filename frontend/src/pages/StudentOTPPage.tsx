import { useState, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../store/api';
import dayjs from 'dayjs';
import './StudentOTPPage.css';
import { useLocation } from 'react-router-dom';

function StudentOTPPage() {
  const { search } = useLocation();
  const urlParams = new URLSearchParams(search);
  const initialSessionId = urlParams.get('sessionId') || localStorage.getItem('pendingSessionId') || '';
  const [sessionId, setSessionId] = useState(initialSessionId);
  const [otp, setOtp] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { user, logout } = useAuthStore();

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      setError('Không thể truy cập camera: ' + err.message);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !user) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Vẽ ảnh
    ctx.drawImage(video, 0, 0);

    // Vẽ watermark
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, canvas.height - 100, canvas.width, 100);

    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px Arial';
    const watermarkText = `${user.studentCode || 'N/A'} - ${sessionId || 'N/A'} - ${otp || 'N/A'} - ${dayjs().format('YYYY-MM-DD HH:mm:ss')}`;
    ctx.fillText(watermarkText, 10, canvas.height - 50);

    // Lưu ảnh
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setPhoto(dataUrl);

    // Dừng camera
    if (video.srcObject) {
      const stream = video.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photo || !sessionId || !otp || !user) {
      setError('Vui lòng điền đầy đủ thông tin và chụp ảnh');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Convert base64 to blob
      const response = await fetch(photo);
      const blob = await response.blob();

      // Resize image if needed
      const img = new Image();
      img.src = photo;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      let finalBlob = blob;
      if (img.width > 1200 || img.height > 1200) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const ratio = Math.min(1200 / img.width, 1200 / img.height);
          canvas.width = img.width * ratio;
          canvas.height = img.height * ratio;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((b) => {
            if (b) finalBlob = b;
          }, 'image/jpeg', 0.8);
        }
      }

      const formData = new FormData();
      formData.append('file', finalBlob, 'photo.jpg');
      formData.append('sessionId', sessionId);
      formData.append('otp', otp);
      formData.append(
        'meta',
        JSON.stringify({
          studentCode: user.studentCode || 'N/A',
          timestamp: dayjs().toISOString(),
        }),
      );

      await api.post('/attendance/checkin-otp', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setPhoto(null);
        setSessionId('');
        setOtp('');
        localStorage.removeItem('pendingSessionId');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Điểm danh thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="otp-page">
      <div className="otp-container">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h1>Điểm Danh bằng OTP + Ảnh</h1>
          <button onClick={logout} className="logout-otp">Đăng xuất</button>
        </div>
        {user && (
          <div className="location-info" style={{background:'#eef5ff',border:'1px solid #dee5ff',padding:12,borderRadius:4,margin:'10px 0'}}>
            MSSV: {user.studentCode || 'N/A'} | Họ tên: {user.fullName}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Session ID</label>
            <input
              type="text"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              required
              placeholder="Nhập Session ID"
            />
          </div>
          <div className="form-group">
            <label>OTP</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              placeholder="Nhập OTP từ màn hình lớp"
              maxLength={6}
            />
          </div>
          <div className="camera-section">
            {!photo ? (
              <>
                <video ref={videoRef} autoPlay playsInline className="video-preview"></video>
                <div className="camera-actions">
                  <button type="button" onClick={startCamera} className="camera-button">
                    Bật Camera
                  </button>
                  <button type="button" onClick={capturePhoto} className="camera-button">
                    Chụp Ảnh
                  </button>
                </div>
              </>
            ) : (
              <div className="photo-preview">
                <img src={photo} alt="Captured" />
                <button
                  type="button"
                  onClick={() => setPhoto(null)}
                  className="retake-button"
                >
                  Chụp lại
                </button>
              </div>
            )}
          </div>
          <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
          {error && <div className="error-message">{error}</div>}
          {success && (
            <div className="success-message">
              ✅ Điểm danh thành công! Đang chờ duyệt.
            </div>
          )}
          <button type="submit" disabled={loading || !photo} className="submit-button">
            {loading ? 'Đang gửi...' : 'Gửi điểm danh'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default StudentOTPPage;

