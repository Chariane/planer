import { Link, Outlet } from "react-router-dom";

export default function MainLayout() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h2>K-Planer</h2>
        <nav>
          <Link to="/">Dashboard</Link>
          <Link to="/workspace">Workspace</Link>
        </nav>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
