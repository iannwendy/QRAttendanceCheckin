import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../store/api';
import { exportToCSV } from '../utils/exportCSV';
import './AdminReports.css';

function AdminReports() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleExportAllReports = async () => {
    try {
      setLoading(true);
      const response = await api.get('/attendance/report/all');
      
      if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
        alert('Không có dữ liệu báo cáo để xuất.');
        return;
      }

      const allRows: any[] = [];
      
      // Add header row
      allRows.push({
        'Lớp học': 'Lớp học',
        'MSSV': 'MSSV',
        'Họ và Tên': 'Họ và Tên',
        'Email': 'Email',
        'Tổng số buổi học': 'Tổng số buổi học',
        'Số buổi có mặt': 'Số buổi có mặt',
        'Tỷ lệ chuyên cần (%)': 'Tỷ lệ chuyên cần (%)',
      });

      // Add data rows for all classes
      response.data.forEach((classReport: any) => {
        if (classReport.students && Array.isArray(classReport.students)) {
          classReport.students.forEach((student: any) => {
            allRows.push({
              'Lớp học': `${classReport.class?.code || ''} - ${classReport.class?.name || ''}`,
              'MSSV': student.studentCode || '',
              'Họ và Tên': student.fullName || '',
              'Email': student.email || '',
              'Tổng số buổi học': student.totalSessions || 0,
              'Số buổi có mặt': student.attendedSessions || 0,
              'Tỷ lệ chuyên cần (%)': student.attendanceRate || 0,
            });
          });
        }
      });

      if (allRows.length <= 1) {
        alert('Không có dữ liệu sinh viên để xuất.');
        return;
      }

      const filename = `BaoCaoChuyenCan_TatCaLop_${new Date().toISOString().split('T')[0]}.csv`;
      exportToCSV(allRows, filename);
    } catch (err: any) {
      console.error('Failed to export reports:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Lỗi không xác định';
      alert(`Không thể xuất báo cáo: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-container">
        <div className="admin-header">
          <div className="admin-header-left">
            <h1>Báo cáo Tổng quan</h1>
            <p className="admin-subtitle">Trang dành cho ADMIN với chức năng xem báo cáo toàn hệ thống</p>
          </div>
          <div className="admin-actions">
            <span className="user-info">Xin chào, {user?.fullName}</span>
            <button onClick={handleLogout} className="logout-button">Đăng xuất</button>
          </div>
        </div>

        <div className="admin-cards">
          <div className="admin-card">
            <h3>Báo cáo hiện diện</h3>
            <p>Biểu đồ tỉ lệ điểm danh theo lớp, theo giảng viên (đang phát triển).</p>
          </div>
          <div className="admin-card">
            <h3>Xuất dữ liệu</h3>
            <p>Xuất báo cáo chuyên cần cho tất cả các lớp học.</p>
            <button 
              onClick={handleExportAllReports}
              disabled={loading}
              className="primary-button full"
            >
              {loading ? 'Đang xuất...' : 'Xuất Báo Cáo Tất Cả Lớp'}
            </button>
          </div>
          <div className="admin-card">
            <h3>Giám sát thời gian thực</h3>
            <p>Thống kê phiên điểm danh đang diễn ra (đang phát triển).</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminReports;


