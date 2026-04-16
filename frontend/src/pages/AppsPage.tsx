import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Loader, AlertCircle, Trash2 } from 'lucide-react';
import type { App } from '../types';
import { appsApi } from '../services/api';

export function AppsPage() {
  const navigate = useNavigate();
  const [apps, setApps] = useState<App[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    fetchApps();
  }, []);

  const fetchApps = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await appsApi.list();
      setApps(data);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load apps');
      console.error('Failed to fetch apps:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteApp = async (e: React.MouseEvent, appName: string, appId: number) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${appName}"?`)) {
      return;
    }

    setDeletingId(appId);
    try {
      await appsApi.delete(appName);
      setApps(apps.filter((app) => app.id !== appId));
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to delete app');
      console.error('Failed to delete app:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredApps = apps.filter((app) => app.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-green-100 text-green-800';
      case 'building':
        return 'bg-blue-100 text-blue-800';
      case 'deploying':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'idle':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Applications</h1>
          <p className="mt-2 text-gray-600">Manage and deploy your applications</p>
        </div>
        <button
          onClick={() => navigate('/dashboard/apps/new')}
          className="inline-flex items-center space-x-2 bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 font-semibold transition-colors shadow-md"
        >
          <Plus size={20} />
          <span>New App</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start space-x-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search applications..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader className="animate-spin text-primary-600" size={32} />
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-gray-500">
            {apps.length === 0
              ? 'No applications found. Create one to get started.'
              : 'No applications match your search.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredApps.map((app) => (
            <div
              key={app.id}
              onClick={() => navigate(`/dashboard/apps/${app.name}`)}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 cursor-pointer flex justify-between items-start"
            >
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-medium text-gray-900">{app.name}</h3>
                <p className="text-gray-600 text-sm mt-1">{app.repo_url}</p>
                <div className="mt-4 flex items-center space-x-4 flex-wrap">
                  <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                    Branch: {app.branch}
                  </span>
                  <span className={`text-xs font-medium px-2 py-1 rounded ${getStatusBadgeColor(app.status)}`}>
                    {app.status}
                  </span>
                </div>
              </div>
              <button
                onClick={(e) => handleDeleteApp(e, app.name, app.id)}
                disabled={deletingId === app.id}
                className="ml-4 p-2 text-gray-400 hover:text-red-600 disabled:opacity-50 transition-colors"
                title="Delete app"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
