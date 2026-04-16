import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MainLayout } from './layouts/MainLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { AppsPage } from './pages/AppsPage';
import { CreateAppPage } from './pages/CreateAppPage';
import { AppDetailsPage } from './pages/AppDetailsPage';
import { ProvidersPage } from './pages/ProvidersPage';
import { SettingsPage } from './pages/SettingsPage';
import './index.css';

function App() {
  const { token, getCurrentUser } = useAuthStore();

  useEffect(() => {
    if (token) {
      getCurrentUser().catch(() => {
        // User fetch failed, they'll be redirected by the interceptor
      });
    }
  }, [token, getCurrentUser]);

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <MainLayout>
                <DashboardPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/apps"
          element={
            <ProtectedRoute>
              <MainLayout>
                <AppsPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/apps/new"
          element={
            <ProtectedRoute>
              <MainLayout>
                <CreateAppPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/apps/:appName"
          element={
            <ProtectedRoute>
              <MainLayout>
                <AppDetailsPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/providers"
          element={
            <ProtectedRoute>
              <MainLayout>
                <ProvidersPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/settings"
          element={
            <ProtectedRoute>
              <MainLayout>
                <SettingsPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Redirect */}
        <Route path="/" element={<Navigate to={token ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </Router>
  );
}

export default App;
