import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from './store/authSlice.js';
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ProjectPage from './pages/ProjectPage.jsx';

function Protected({ children }) {
  const token = useSelector((s) => s.auth.token);
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function Layout({ children }) {
  const user = useSelector((s) => s.auth.user);
  const dispatch = useDispatch();
  return (
    <div className="layout">
      <header className="row" style={{ justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit', fontWeight: 700 }}>
          Workflow Orchestration
        </Link>
        {user && (
          <div className="row">
            <span className="muted">{user.email}</span>
            <button type="button" className="btn secondary" onClick={() => dispatch(logout())}>
              Log out
            </button>
          </div>
        )}
      </header>
      {children}
    </div>
  );
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          path="/"
          element={
            <Protected>
              <DashboardPage />
            </Protected>
          }
        />
        <Route
          path="/projects/:projectId"
          element={
            <Protected>
              <ProjectPage />
            </Protected>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
