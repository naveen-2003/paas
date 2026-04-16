import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, Loader } from 'lucide-react';
import { appsApi, gitProvidersApi, registryProvidersApi, clusterProvidersApi } from '../services/api';
import type { GitProvider, RegistryProvider, ClusterProvider } from '../types';

const createAppSchema = z.object({
  name: z
    .string()
    .min(1, 'App name is required')
    .regex(/^[a-z0-9-]+$/, 'Name must contain only lowercase letters, numbers, and hyphens'),
  repo_url: z.string().min(1, 'Repository URL is required').url('Invalid URL'),
  branch: z.string().min(1, 'Branch is required'),
  git_provider_id: z.number().min(1, 'Git provider is required'),
  registry_id: z.number().min(1, 'Docker registry is required'),
  cluster_id: z.number().min(1, 'Kubernetes cluster is required'),
});

type CreateAppFormData = z.infer<typeof createAppSchema>;

export function CreateAppPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gitProviders, setGitProviders] = useState<GitProvider[]>([]);
  const [registries, setRegistries] = useState<RegistryProvider[]>([]);
  const [clusters, setClusters] = useState<ClusterProvider[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateAppFormData>({
    resolver: zodResolver(createAppSchema),
    defaultValues: {
      branch: 'main',
    },
  });

  useEffect(() => {
    const fetchProviders = async () => {
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
        setLoadingProviders(false);
      }
    };

    fetchProviders();
  }, []);

  const onSubmit = async (data: CreateAppFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      await appsApi.create({
        name: data.name,
        repo_url: data.repo_url,
        branch: data.branch,
        git_provider_id: data.git_provider_id,
        registry_id: data.registry_id,
        cluster_id: data.cluster_id,
      });
      navigate('/dashboard/apps');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create app');
    } finally {
      setIsLoading(false);
    }
  };

  if (loadingProviders) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader className="animate-spin text-primary-600" size={32} />
      </div>
    );
  }

  if (gitProviders.length === 0 || registries.length === 0 || clusters.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex space-x-3">
          <AlertCircle className="text-yellow-600 flex-shrink-0" size={20} />
          <div>
            <h3 className="text-lg font-medium text-yellow-800">Setup Required</h3>
            <p className="text-yellow-700 mt-2">
              You need to configure providers before creating apps. Go to Providers to set up:
            </p>
            <ul className="list-disc list-inside text-yellow-700 mt-2 space-y-1">
              {gitProviders.length === 0 && <li>At least one Git Provider</li>}
              {registries.length === 0 && <li>At least one Docker Registry</li>}
              {clusters.length === 0 && <li>At least one Kubernetes Cluster</li>}
            </ul>
            <button
              onClick={() => navigate('/dashboard/providers')}
              className="mt-4 bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700"
            >
              Go to Providers
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Create New Application</h1>
        <p className="mt-2 text-gray-600">Configure your application for deployment</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg shadow-md p-8 space-y-6 max-w-2xl">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start space-x-3">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* App Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700">App Name</label>
          <input
            {...register('name')}
            type="text"
            placeholder="my-app"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Lowercase letters, numbers, and hyphens only
          </p>
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        {/* Repository URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Repository URL</label>
          <input
            {...register('repo_url')}
            type="url"
            placeholder="https://github.com/user/repo.git"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />
          {errors.repo_url && (
            <p className="mt-1 text-sm text-red-600">{errors.repo_url.message}</p>
          )}
        </div>

        {/* Branch */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Branch</label>
          <input
            {...register('branch')}
            type="text"
            placeholder="main"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />
          {errors.branch && (
            <p className="mt-1 text-sm text-red-600">{errors.branch.message}</p>
          )}
        </div>

        {/* Git Provider */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Git Provider</label>
          <select
            {...register('git_provider_id', { valueAsNumber: true })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Select a Git Provider</option>
            {gitProviders.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name} ({provider.provider})
              </option>
            ))}
          </select>
          {errors.git_provider_id && (
            <p className="mt-1 text-sm text-red-600">{errors.git_provider_id.message}</p>
          )}
        </div>

        {/* Docker Registry */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Docker Registry</label>
          <select
            {...register('registry_id', { valueAsNumber: true })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Select a Docker Registry</option>
            {registries.map((registry) => (
              <option key={registry.id} value={registry.id}>
                {registry.name} ({registry.type})
              </option>
            ))}
          </select>
          {errors.registry_id && (
            <p className="mt-1 text-sm text-red-600">{errors.registry_id.message}</p>
          )}
        </div>

        {/* Kubernetes Cluster */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Kubernetes Cluster</label>
          <select
            {...register('cluster_id', { valueAsNumber: true })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Select a Kubernetes Cluster</option>
            {clusters.map((cluster) => (
              <option key={cluster.id} value={cluster.id}>
                {cluster.name} ({cluster.type})
              </option>
            ))}
          </select>
          {errors.cluster_id && (
            <p className="mt-1 text-sm text-red-600">{errors.cluster_id.message}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-emerald-600 text-white py-2 rounded-md font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Creating...' : 'Create Application'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard/apps')}
            className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-md font-medium hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
