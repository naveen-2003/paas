import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle } from 'lucide-react';
import { clusterProvidersApi } from '../../services/api';

const clusterProviderSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['kind', 'k3s', 'eks', 'gke', 'other']),
  namespace_prefix: z.string().min(1, 'Namespace prefix is required'),
  kubeconfig: z.string().min(10, 'Kubeconfig is required'),
});

type ClusterProviderFormData = z.infer<typeof clusterProviderSchema>;

interface AddClusterProviderFormProps {
  onSuccess: () => void;
}

export function AddClusterProviderForm({ onSuccess }: AddClusterProviderFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClusterProviderFormData>({
    resolver: zodResolver(clusterProviderSchema),
    defaultValues: {
      type: 'kind',
      namespace_prefix: 'paas',
    },
  });

  const onSubmit = async (data: ClusterProviderFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      await clusterProvidersApi.add(data);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add cluster');
    } finally {
      setIsLoading(false);
    }
  };

  const kubeconfigInstructions = {
    kind: 'Get with: kubectl config view --raw',
    k3s: 'Located at /etc/rancher/k3s/k3s.yaml on your VPS',
    eks: 'Get with: aws eks update-kubeconfig --name <cluster-name>',
    gke: 'Get with: gcloud container clusters get-credentials <cluster-name>',
    other: 'Paste your cluster kubeconfig YAML',
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start space-x-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">Cluster Name</label>
        <input
          {...register('name')}
          placeholder="my-cluster"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Cluster Type</label>
        <select
          {...register('type')}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="kind">KinD (Local)</option>
          <option value="k3s">K3s (Self-Hosted)</option>
          <option value="eks">AWS EKS</option>
          <option value="gke">Google GKE</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Namespace Prefix</label>
        <input
          {...register('namespace_prefix')}
          placeholder="paas"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        <p className="mt-1 text-xs text-gray-600">Apps will be deployed under this namespace (e.g., paas-myapp)</p>
        {errors.namespace_prefix && <p className="mt-1 text-sm text-red-600">{errors.namespace_prefix.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Kubeconfig</label>
        <textarea
          {...register('kubeconfig')}
          placeholder="Paste your kubeconfig YAML here"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-xs"
          rows={12}
        />
        <p className="mt-1 text-xs text-gray-600">{kubeconfigInstructions.other}</p>
        {errors.kubeconfig && <p className="mt-1 text-sm text-red-600">{errors.kubeconfig.message}</p>}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 shadow-md transition-colors"
      >
        {isLoading ? 'Adding...' : 'Add Cluster'}
      </button>
    </form>
  );
}
