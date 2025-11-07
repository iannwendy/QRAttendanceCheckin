import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../store/api';
import { CLASS_CODES, getClassNameByCode } from '../constants/classCodes';
import './CreateClassPage.css';

function CreateClassPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    code: '',
    name: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCode = e.target.value;
    const className = getClassNameByCode(selectedCode);
    
    setFormData({
      code: selectedCode,
      name: className || '',
    });
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      name: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!formData.code || !formData.name) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }

    setLoading(true);

    try {
      await api.post('/classes', {
        code: formData.code,
        name: formData.name,
      });

      navigate('/teacher/dashboard');
    } catch (err: any) {
      console.error('Failed to create class:', err);
      setError(err.response?.data?.message || 'Không thể tạo lớp học');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-class-page">
      <div className="create-class-container">
        <h1>Tạo Lớp Học Mới</h1>
        <form onSubmit={handleSubmit} className="class-form">
          <div className="form-group">
            <label>Mã lớp học *</label>
            <select
              value={formData.code}
              onChange={handleCodeChange}
              required
              className="code-select"
            >
              <option value="">-- Chọn mã lớp --</option>
              {CLASS_CODES.map((classCode) => (
                <option key={classCode.code} value={classCode.code}>
                  {classCode.code} - {classCode.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Tên môn học *</label>
            <input
              type="text"
              value={formData.name}
              onChange={handleNameChange}
              required
              placeholder="Tên môn học sẽ tự động điền khi chọn mã lớp"
              className="name-input"
            />
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
              {loading ? 'Đang tạo...' : 'Tạo Lớp Học'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateClassPage;

