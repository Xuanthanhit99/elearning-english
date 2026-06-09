import { Link, Outlet } from 'react-router-dom';

export default function AdminLayout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: 240, padding: 20, borderRight: '1px solid #ddd' }}>
        <h2>Admin</h2>

        <nav>
          <p>
            <Link to="/admin/pending-courses">Khóa học chờ duyệt</Link>
          </p>
        </nav>
      </aside>

      <main style={{ flex: 1, padding: 24 }}>
        <Outlet />
      </main>
    </div>
  );
}