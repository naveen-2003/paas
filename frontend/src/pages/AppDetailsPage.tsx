import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, Loader, ArrowLeft, Copy } from 'lucide-react';
import { appsApi } from '../services/api';
import type { App, DeploymentLog } from '../types';

export function AppDetailsPage() {
  const { appName } = useParams<{ appName: string }>();
  const navigate = useNavigate();
  const [app, setApp] = useState<App | null>(null);
  const [logs, setLogs] = useState<DeploymentLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAppData = async () => {
      if (!appName) return;
      try {
        const [appData, appLogs] = await Promise.all([
          appsApi.get(appName),
          appsApi.getLogs(appName),
        ]);
        setApp(appData);
        setLogs(appLogs);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load app details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAppData();
  }, [appName]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader className="animate-spin text-primary-600" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/dashboard/apps')}
          className="inline-flex items-center space-x-2 text-emerald-600 hover:text-emerald-700 font-semibold mb-4 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back to Apps</span>
        </button>

        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex space-x-3">
            <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
            <div>
              <h3 className="text-lg font-medium text-red-800">Error</h3>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">App not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/dashboard/apps')}
          className="text-emerald-600 hover:text-emerald-700 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{app.name}</h1>
          <p className="mt-1 text-gray-600">{app.repo_url}</p>
        </div>
      </div>

      {/* App Details Card */}
      <div className="bg-white rounded-lg shadow-md p-8 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Application Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <div className="mt-1 flex items-center space-x-2">
                <span className={`text-xs font-medium px-3 py-1 rounded ${getStatusBadgeColor(app.status)}`}>
                  {app.status}
                </span>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600">Branch</p>
              <p className="mt-1 text-lg font-medium text-gray-900">{app.branch}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Repository URL</p>
              <div className="mt-1 flex items-center space-x-2">
                <code className="text-sm bg-gray-100 px-3 py-2 rounded text-gray-800 flex-1 overflow-auto">
                  {app.repo_url}
                </code>
                <button
                  onClick={() => handleCopy(app.repo_url)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <Copy size={18} />
                </button>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600">Created</p>
              <p className="mt-1 text-lg font-medium text-gray-900">
                {new Date(app.createdAt).toLocaleDateString()}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Git Provider ID</p>
              <p className="mt-1 text-lg font-medium text-gray-900">{app.git_provider_id}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Registry ID</p>
              <p className="mt-1 text-lg font-medium text-gray-900">{app.registry_id}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Cluster ID</p>
              <p className="mt-1 text-lg font-medium text-gray-900">{app.cluster_id}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Deployment Logs */}
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Build Logs</h2>

        {logs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No build logs available yet</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto bg-gray-900 rounded p-4 font-mono text-sm text-gray-100">
            {logs.map((log, index) => (
              <div
                key={index}
                className={`${
                  log.type === 'error'
                    ? 'text-red-400'
                    : log.type === 'warning'
                      ? 'text-yellow-400'
                      : 'text-green-400'
                }`}
              >
                <span className="text-gray-500">[{log.type}]</span> {log.message}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Latest Deployment */}
      {app.latestDeployment && (
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Latest Deployment</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <div className="mt-1 flex items-center space-x-2">
                <span
                  className={`text-xs font-medium px-3 py-1 rounded ${getStatusBadgeColor(app.latestDeployment.status)}`}
                >
                  {app.latestDeployment.status}
                </span>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600">Commit ID</p>
              <code className="mt-1 text-sm bg-gray-100 px-3 py-2 rounded text-gray-800 block">
                {app.latestDeployment.commitId.substring(0, 8)}
              </code>
            </div>

            <div>
              <p className="text-sm text-gray-600">Created</p>
              <p className="mt-1 text-lg font-medium text-gray-900">
                {new Date(app.latestDeployment.createdAt).toLocaleString()}
              </p>
            </div>

            {app.latestDeployment.completedAt && (
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="mt-1 text-lg font-medium text-gray-900">
                  {new Date(app.latestDeployment.completedAt).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
