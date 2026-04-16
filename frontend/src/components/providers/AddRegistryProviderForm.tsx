import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle } from 'lucide-react';
import { registryProvidersApi } from '../../services/api';

const registryProviderSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    type: z.enum(['dockerhub', 'ghcr', 'ecr', 'gcr', 'self-hosted']),
    username: z.string().optional(),
    password_or_token: z.string().optional(),
    host: z.string().optional(),
    aws_region: z.string().optional(),
    aws_access_key: z.string().optional(),
    aws_secret_key: z.string().optional(),
    gcp_project: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.type === 'self-hosted') return !!data.host;
      if (data.type === 'ecr') return !!data.aws_access_key && !!data.aws_secret_key && !!data.aws_region;
      if (data.type === 'gcr') return !!data.gcp_project && !!data.password_or_token;
      return !!data.username && !!data.password_or_token;
    },
    { message: 'Missing required fields for this registry type' }
  );

type RegistryProviderFormData = z.infer<typeof registryProviderSchema>;

interface AddRegistryProviderFormProps {
  onSuccess: () => void;
}

export function AddRegistryProviderForm({ onSuccess }: AddRegistryProviderFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegistryProviderFormData>({
    resolver: zodResolver(registryProviderSchema),
    defaultValues: {
      type: 'dockerhub',
    },
  });

  const selectedType = watch('type');

  const onSubmit = async (data: RegistryProviderFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      await registryProvidersApi.add(data);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add registry');
    } finally {
      setIsLoading(false);
    }
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
        <label className="block text-sm font-medium text-gray-700">Registry Type</label>
        <select
          {...register('type')}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="dockerhub">Docker Hub</option>
          <option value="ghcr">GitHub Container Registry (GHCR)</option>
          <option value="ecr">AWS Elastic Container Registry (ECR)</option>
          <option value="gcr">Google Container Registry (GCR)</option>
          <option value="self-hosted">Self-Hosted Registry</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Registry Name</label>
        <input
          {...register('name')}
          placeholder="My Registry"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
      </div>

      {/* Docker Hub / GHCR */}
      {(selectedType === 'dockerhub' || selectedType === 'ghcr') && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700">Username</label>
            <input
              {...register('username')}
              placeholder={selectedType === 'ghcr' ? 'github-username' : 'dockerhub-username'}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            {errors.username && <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {selectedType === 'ghcr' ? 'Access Token' : 'Password or Access Token'}
            </label>
            <input
              {...register('password_or_token')}
              type="password"
              placeholder="your-token"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            {errors.password_or_token && <p className="mt-1 text-sm text-red-600">{errors.password_or_token.message}</p>}
          </div>
        </>
      )}

      {/* AWS ECR */}
      {selectedType === 'ecr' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700">ECR Host</label>
            <input
              {...register('host')}
              placeholder="123456789.dkr.ecr.us-east-1.amazonaws.com"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">AWS Region</label>
            <input
              {...register('aws_region')}
              placeholder="us-east-1"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            {errors.aws_region && <p className="mt-1 text-sm text-red-600">{errors.aws_region.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">AWS Access Key</label>
            <input
              {...register('aws_access_key')}
              type="password"
              placeholder="AKIA..."
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            {errors.aws_access_key && <p className="mt-1 text-sm text-red-600">{errors.aws_access_key.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">AWS Secret Key</label>
            <input
              {...register('aws_secret_key')}
              type="password"
              placeholder="your-secret-key"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            {errors.aws_secret_key && <p className="mt-1 text-sm text-red-600">{errors.aws_secret_key.message}</p>}
          </div>
        </>
      )}

      {/* Google GCR */}
      {selectedType === 'gcr' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700">GCP Project</label>
            <input
              {...register('gcp_project')}
              placeholder="your-gcp-project-id"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            {errors.gcp_project && <p className="mt-1 text-sm text-red-600">{errors.gcp_project.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Service Account JSON</label>
            <textarea
              {...register('password_or_token')}
              placeholder="Paste your GCP service account JSON"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={6}
            />
            {errors.password_or_token && <p className="mt-1 text-sm text-red-600">{errors.password_or_token.message}</p>}
          </div>
        </>
      )}

      {/* Self-Hosted */}
      {selectedType === 'self-hosted' && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Registry Host</label>
          <input
            {...register('host')}
            placeholder="registry.local:5000"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          <p className="mt-1 text-xs text-gray-600">No authentication required for local KinD registry</p>
          {errors.host && <p className="mt-1 text-sm text-red-600">{errors.host.message}</p>}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 shadow-md transition-colors"
      >
        {isLoading ? 'Adding...' : 'Add Registry'}
      </button>
    </form>
  );
}
