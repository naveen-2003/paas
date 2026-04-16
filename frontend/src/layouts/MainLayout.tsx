import type { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { LogOut, Settings, User, Plus } from 'lucide-react';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname.startsWith(path);

  const navLinks = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Apps', path: '/dashboard/apps' },
    { label: 'Providers', path: '/dashboard/providers' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <h1 
                onClick={() => navigate('/dashboard')}
                className="text-2xl font-bold text-primary-600 cursor-pointer hover:text-primary-700"
              >
                Mini PaaS
              </h1>
              <div className="hidden md:flex space-x-6">
                {navLinks.map((link) => (
                  <button
                    key={link.path}
                    onClick={() => navigate(link.path)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive(link.path)
                        ? 'text-primary-600 bg-primary-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="hidden sm:flex items-center space-x-3 mr-4">
              {location.pathname.includes('/apps') && !location.pathname.includes('/apps/new') && (
                <button
                  onClick={() => navigate('/dashboard/apps/new')}
                  className="inline-flex items-center space-x-1 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-md"
                >
                  <Plus size={16} />
                  <span>App</span>
                </button>
              )}
              {location.pathname.includes('/providers') && (
                <button
                  onClick={() => navigate('/dashboard/providers')}
                  className="inline-flex items-center space-x-1 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-md"
                >
                  <Plus size={16} />
                  <span>Provider</span>
                </button>
              )}
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => navigate('/dashboard/settings')}
                className="text-gray-600 hover:text-gray-900"
                title="Settings"
              >
                <Settings size={20} />
              </button>
              <div className="flex items-center space-x-2">
                <User size={20} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-700 hidden sm:inline">{user?.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="text-gray-600 hover:text-red-600 inline-flex items-center space-x-1"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
