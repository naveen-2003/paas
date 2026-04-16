import { useState, useEffect } from 'react';
import { Plus, Loader, AlertCircle, Trash2 } from 'lucide-react';
import { gitProvidersApi, registryProvidersApi, clusterProvidersApi } from '../services/api';
import type { GitProvider, RegistryProvider, ClusterProvider } from '../types';
import { AddGitProviderForm } from '../components/providers/AddGitProviderForm';
import { AddRegistryProviderForm } from '../components/providers/AddRegistryProviderForm';
import { AddClusterProviderForm } from '../components/providers/AddClusterProviderForm';

type Tab = 'git' | 'registry' | 'cluster';

export function ProvidersPage() {
  const [activeTab, setActiveTab] = useState<Tab>('git');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Git Providers
  const [gitProviders, setGitProviders] = useState<GitProvider[]>([]);
  const [deletingGit, setDeletingGit] = useState<number | null>(null);

  // Registry Providers
  const [registries, setRegistries] = useState<RegistryProvider[]>([]);
  const [deletingRegistry, setDeletingRegistry] = useState<number | null>(null);

  // Cluster Providers
  const [clusters, setClusters] = useState<ClusterProvider[]>([]);
  const [deletingCluster, setDeletingCluster] = useState<number | null>(null);

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [git, reg, clust] = await Promise.all([
        gitProvidersApi.list(),
        registryProvidersApi.list(),
        clusterProvidersApi.list(),
      ]);
      setGitProviders(git);
      setRegistries(reg);
      setClusters(clust);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load providers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteGitProvider = async (id: number, name: string) => {
    if (!confirm(`Delete git provider "${name}"?`)) return;
    setDeletingGit(id);
    try {
      await gitProvidersApi.delete(id);
      setGitProviders(gitProviders.filter((p) => p.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete provider');
    } finally {
      setDeletingGit(null);
    }
  };

  const handleDeleteRegistry = async (id: number, name: string) => {
    if (!confirm(`Delete registry "${name}"?`)) return;
    setDeletingRegistry(id);
    try {
      await registryProvidersApi.delete(id);
      setRegistries(registries.filter((p) => p.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete registry');
    } finally {
      setDeletingRegistry(null);
    }
  };

  const handleDeleteCluster = async (id: number, name: string) => {
    if (!confirm(`Delete cluster "${name}"?`)) return;
    setDeletingCluster(id);
    try {
      await clusterProvidersApi.delete(id);
      setClusters(clusters.filter((p) => p.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete cluster');
    } finally {
      setDeletingCluster(null);
    }
  };

  const handleProviderAdded = () => {
    setShowForm(false);
    fetchProviders();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader className="animate-spin text-primary-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Providers</h1>
          <p className="mt-2 text-gray-600">Manage Git, Registry, and Cluster providers</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center space-x-2 bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 font-semibold transition-colors shadow-md"
        >
          <Plus size={20} />
          <span>Add Provider</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start space-x-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="space-y-6">
            <div className="flex space-x-2 border-b">
              <button
                onClick={() => setActiveTab('git')}
                className={`px-4 py-2 font-medium ${
                  activeTab === 'git'
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Git Provider
              </button>
              <button
                onClick={() => setActiveTab('registry')}
                className={`px-4 py-2 font-medium ${
                  activeTab === 'registry'
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Docker Registry
              </button>
              <button
                onClick={() => setActiveTab('cluster')}
                className={`px-4 py-2 font-medium ${
                  activeTab === 'cluster'
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Kubernetes Cluster
              </button>
            </div>

            {activeTab === 'git' && <AddGitProviderForm onSuccess={handleProviderAdded} />}
            {activeTab === 'registry' && <AddRegistryProviderForm onSuccess={handleProviderAdded} />}
            {activeTab === 'cluster' && <AddClusterProviderForm onSuccess={handleProviderAdded} />}
          </div>
        </div>
      )}

      {/* Git Providers */}
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Git Providers</h2>
        {gitProviders.length === 0 ? (
          <p className="text-gray-500">No git providers configured</p>
        ) : (
          <div className="space-y-3">
            {gitProviders.map((provider) => (
              <div key={provider.id} className="flex items-center justify-between bg-gray-50 p-4 rounded">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{provider.name}</h3>
                  <p className="text-sm text-gray-600">
                    {provider.provider} • {provider.username}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteGitProvider(provider.id, provider.name)}
                  disabled={deletingGit === provider.id}
                  className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-50"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Registry Providers */}
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Docker Registries</h2>
        {registries.length === 0 ? (
          <p className="text-gray-500">No registries configured</p>
        ) : (
          <div className="space-y-3">
            {registries.map((registry) => (
              <div key={registry.id} className="flex items-center justify-between bg-gray-50 p-4 rounded">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{registry.name}</h3>
                  <p className="text-sm text-gray-600">{registry.type}</p>
                </div>
                <button
                  onClick={() => handleDeleteRegistry(registry.id, registry.name)}
                  disabled={deletingRegistry === registry.id}
                  className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-50"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cluster Providers */}
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Kubernetes Clusters</h2>
        {clusters.length === 0 ? (
          <p className="text-gray-500">No clusters configured</p>
        ) : (
          <div className="space-y-3">
            {clusters.map((cluster) => (
              <div key={cluster.id} className="flex items-center justify-between bg-gray-50 p-4 rounded">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{cluster.name}</h3>
                  <p className="text-sm text-gray-600">
                    {cluster.type} • {cluster.namespace_prefix}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteCluster(cluster.id, cluster.name)}
                  disabled={deletingCluster === cluster.id}
                  className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-50"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
