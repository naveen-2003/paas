import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { appsApi, gitProvidersApi, registryProvidersApi, clusterProvidersApi } from '../services/api';
import { Plus, Zap, Globe, Settings2, AlertCircle } from 'lucide-react';

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    totalApps: 0,
    totalDeployments: 0,
    totalProviders: 0,
    loading: true,
    error: null as string | null,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [apps, gitProviders, registryProviders, clusterProviders] = await Promise.all([
          appsApi.list(),
          gitProvidersApi.list(),
          registryProvidersApi.list(),
          clusterProvidersApi.list(),
        ]);

        const deploymentCount = apps.reduce((sum) => sum + 1, 0);
        const providerCount = gitProviders.length + registryProviders.length + clusterProviders.length;

        setStats({
          totalApps: apps.length,
          totalDeployments: deploymentCount,
          totalProviders: providerCount,
          loading: false,
          error: null,
        });
      } catch (error: any) {
        setStats((prev) => ({
          ...prev,
          loading: false,
          error: error.response?.data?.message || 'Failed to load stats',
        }));
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.email}!</h1>
        <p className="mt-2 text-gray-600">Manage your applications and deployments</p>
      </div>

      {stats.error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start space-x-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{stats.error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => navigate('/dashboard/apps')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Apps</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalApps}</p>
            </div>
            <Zap size={32} className="text-primary-600" />
          </div>
        </div>

        <div
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => navigate('/dashboard/apps')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Deployments</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalDeployments}</p>
            </div>
            <Globe size={32} className="text-green-600" />
          </div>
        </div>

        <div
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => navigate('/dashboard/providers')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Providers</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalProviders}</p>
            </div>
            <Settings2 size={32} className="text-orange-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Get Started</h2>
          <p className="text-gray-600">Create your first application to start deploying</p>
          <button
            onClick={() => navigate('/dashboard/apps/new')}
            className="inline-flex items-center space-x-2 bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 font-semibold transition-colors shadow-md"
          >
            <Plus size={20} />
            <span>Create New App</span>
          </button>
        </div>
      </div>
    </div>
  );
}
