import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../store/api';
import './CreateSessionPage.css';

function CreateSessionPage() {
  const navigate = useNavigate();
  const { classId } = useParams<{ classId: string }>();
  const [formData, setFormData] = useState({
    title: '',
    startTime: '',
    endTime: '',
    latitude: '',
    longitude: '',
    geofenceRadius: '100',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/sessions', {
        classId: classId!,
        title: formData.title,
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        geofenceRadius: parseInt(formData.geofenceRadius),
      });

      navigate(`/teacher/session/${response.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể tạo buổi học');
    } finally {
      setLoading(false);
    }
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString(),
          });
        },
        () => {
          alert('Không thể lấy vị trí hiện tại');
        },
      );
    } else {
      alert('Trình duyệt không hỗ trợ Geolocation');
    }
  };

  return (
    <div className="create-session-page">
      <div className="create-session-container">
        <h1>Tạo Buổi Học Mới</h1>
        <form onSubmit={handleSubmit} className="session-form">
          <div className="form-group">
            <label>Tiêu đề buổi học *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="VD: Buổi học 1 - Giới thiệu"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Thời gian bắt đầu *</label>
              <input
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Thời gian kết thúc *</label>
              <input
                type="datetime-local"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-section">
            <h3>GPS Location</h3>
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              className="location-button"
            >
              📍 Lấy vị trí hiện tại
            </button>
            <div className="form-row">
              <div className="form-group">
                <label>Vĩ độ (Latitude) *</label>
                <input
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  placeholder="VD: 10.762622"
                required />
              </div>
              <div className="form-group">
                <label>Kinh độ (Longitude) *</label>
                <input
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  placeholder="VD: 106.660172"
                required />
              </div>
              <div className="form-group">
                <label>Bán kính địa rào (m) ≥ 10 *</label>
                <input
                  type="number"
                  value={formData.geofenceRadius}
                  onChange={(e) => setFormData({ ...formData, geofenceRadius: e.target.value })}
                  placeholder="100"
                  min={10}
                  required
                />
              </div>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="cancel-button"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="submit-button"
            >
              {loading ? 'Đang tạo...' : 'Tạo Buổi Học'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateSessionPage;

