import { Link, Outlet } from "react-router-dom";
import NotificationBell from "./components/NotificationBell";

export default function AdminLayout() {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside style={{ width: 240, padding: 20, borderRight: "1px solid #ddd" }}>
        <h2>Admin</h2>

        <nav>
          <p>
            <Link to="/admin/pending-courses">Khóa học chờ duyệt</Link>
          </p>
          <p>
            <Link to="/admin/revenue">Doanh thu hệ thống</Link>
          </p>
          <Link to="/admin/withdraws">Yêu cầu rút tiền</Link>
          <Link to="/admin/coupons">Mã giảm giá</Link>
        </nav>
      </aside>
      <NotificationBell />
      <main style={{ flex: 1, padding: 24 }}>
        <Outlet />
      </main>
    </div>
  );
}
