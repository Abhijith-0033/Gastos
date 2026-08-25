import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoadingScreen from './components/ui/LoadingScreen';

// Layouts
import PublicLayout from './components/layout/PublicLayout';
import DeveloperLayout from './components/layout/DeveloperLayout';
import AdminLayout from './components/layout/AdminLayout';

// Public Pages
import HomePage from './pages/HomePage';
import AppDetailPage from './pages/AppDetailPage';
import SearchPage from './pages/SearchPage';
import CategoryPage from './pages/CategoryPage';
import DeveloperProfilePage from './pages/DeveloperProfilePage';
import NotFoundPage from './pages/NotFoundPage';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Developer Pages
import DeveloperDashboard from './pages/developer/DeveloperDashboard';
import SubmitAppPage from './pages/developer/SubmitAppPage';
import AppAnalyticsPage from './pages/developer/AppAnalyticsPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminPendingApps from './pages/admin/AdminPendingApps';
import AdminAppReview from './pages/admin/AdminAppReview';
import AdminAllApps from './pages/admin/AdminAllApps';
import AdminPendingVersions from './pages/admin/AdminPendingVersions';
import AdminUsers from './pages/admin/AdminUsers';
import AdminReviews from './pages/admin/AdminReviews';
import AdminDownloads from './pages/admin/AdminDownloads';
import AdminSettings from './pages/admin/AdminSettings';
import AdminActionLog from './pages/admin/AdminActionLog';

// Route Guards
function RequireAuth({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

function RequireDeveloper({ children }) {
  const { isDeveloper, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!isDeveloper) return <Navigate to="/" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { isAdmin, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* ── Public Store Routes ── */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/app/:slug" element={<AppDetailPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/category/:slug" element={<CategoryPage />} />
        <Route path="/developer/:username" element={<DeveloperProfilePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* ── Developer Portal Routes ── */}
      <Route
        path="/developer"
        element={
          <RequireAuth>
            <RequireDeveloper>
              <DeveloperLayout />
            </RequireDeveloper>
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/developer/dashboard" replace />} />
        <Route path="dashboard" element={<DeveloperDashboard />} />
        <Route path="submit" element={<SubmitAppPage />} />
        <Route path="analytics/:appId" element={<AppAnalyticsPage />} />
      </Route>

      {/* ── Admin Management Routes ── */}
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          </RequireAuth>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="apps/pending" element={<AdminPendingApps />} />
        <Route path="apps/:id/review" element={<AdminAppReview />} />
        <Route path="apps" element={<AdminAllApps />} />
        <Route path="versions/pending" element={<AdminPendingVersions />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="reviews" element={<AdminReviews />} />
        <Route path="downloads" element={<AdminDownloads />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="actions" element={<AdminActionLog />} />
      </Route>
    </Routes>
  );
}
