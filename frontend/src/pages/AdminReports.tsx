import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

function AdminReports() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{minHeight:'100vh',background:'#f5f5f5',padding:'24px'}}>
      <div style={{maxWidth:900,margin:'0 auto',background:'#fff',padding:24,borderRadius:8,boxShadow:'0 2px 10px rgba(0,0,0,0.08)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <h1 style={{margin:0}}>Báo cáo Tổng quan</h1>
          <div style={{display:'flex',gap:12,alignItems:'center'}}>
            <span style={{color:'#555'}}>Xin chào, {user?.fullName}</span>
            <button onClick={handleLogout} style={{padding:'10px 16px',background:'#dc3545',color:'#fff',border:'none',borderRadius:6,fontWeight:600,cursor:'pointer'}}>Đăng xuất</button>
          </div>
        </div>

        <p style={{color:'#666',marginTop:0}}>Trang dành cho ADMIN với chức năng xem báo cáo tổng quan toàn hệ thống.</p>

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:16,marginTop:16}}>
          <div style={{border:'1px solid #eee',borderRadius:8,padding:16}}>
            <h3 style={{marginTop:0}}>Báo cáo hiện diện</h3>
            <p style={{color:'#666'}}>Sắp có: biểu đồ tỉ lệ điểm danh, theo lớp, theo giảng viên.</p>
          </div>
          <div style={{border:'1px solid #eee',borderRadius:8,padding:16}}>
            <h3 style={{marginTop:0}}>Xuất dữ liệu</h3>
            <p style={{color:'#666'}}>Sắp có: tải CSV/Excel các báo cáo tổng hợp.</p>
          </div>
          <div style={{border:'1px solid #eee',borderRadius:8,padding:16}}>
            <h3 style={{marginTop:0}}>Giám sát thời gian thực</h3>
            <p style={{color:'#666'}}>Sắp có: thống kê phiên điểm danh đang diễn ra.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminReports;


