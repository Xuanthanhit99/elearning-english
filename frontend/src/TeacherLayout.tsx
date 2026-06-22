import { Link, Outlet, useNavigate } from "react-router-dom";
import { authApi } from "./api/authApi";
import { clearAccessToken } from "./api/tokenStore";
import NotificationBell from "./components/NotificationBell";

export default function TeacherLayout() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await authApi.logout();

    clearAccessToken();

    navigate("/login");
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside style={{ width: 240, padding: 20, borderRight: "1px solid #ddd" }}>
        <h2>Teacher</h2>

        <nav>
          <p>
            <Link to="/teacher/courses">Khóa học của tôi</Link>
          </p>

          <p>
            <Link to="/teacher/courses/create">Tạo khóa học</Link>
          </p>
          <p>
            <Link to="/teacher/revenue">Doanh thu</Link>
          </p>
          <Link to="/teacher/wallet">Ví giáo viên</Link>
          <button onClick={handleLogout}>Đăng xuất</button>
        </nav>
      </aside>
    <NotificationBell />
      <main style={{ flex: 1, padding: 24 }}>
        <Outlet />
      </main>
    </div>
  );
}
