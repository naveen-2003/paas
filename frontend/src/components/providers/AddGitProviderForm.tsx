import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle } from 'lucide-react';
import { gitProvidersApi } from '../../services/api';

const gitProviderSchema = z.object({
  provider: z.enum(['github', 'gitlab', 'bitbucket', 'gitea']),
  name: z.string().min(1, 'Name is required'),
  username: z.string().min(1, 'Username is required'),
  access_token: z.string().min(1, 'Access token is required'),
  base_url: z.string().optional(),
});

type GitProviderFormData = z.infer<typeof gitProviderSchema>;

interface AddGitProviderFormProps {
  onSuccess: () => void;
}

export function AddGitProviderForm({ onSuccess }: AddGitProviderFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<GitProviderFormData>({
    resolver: zodResolver(gitProviderSchema),
    defaultValues: {
      provider: 'github',
    },
  });

  const selectedProvider = watch('provider');

  const onSubmit = async (data: GitProviderFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      await gitProvidersApi.add(data);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add git provider');
    } finally {
      setIsLoading(false);
    }
  };

  const providerInfo = {
    github: 'Generate a token at https://github.com/settings/tokens with repo scope',
    gitlab: 'Generate a token at https://gitlab.com/-/profile/personal_access_tokens',
    bitbucket: 'Generate an app password at https://bitbucket.org/account/settings/app-passwords',
    gitea: 'Use your Gitea instance API token',
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
        <label className="block text-sm font-medium text-gray-700">Provider Type</label>
        <select
          {...register('provider')}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="github">GitHub</option>
          <option value="gitlab">GitLab</option>
          <option value="bitbucket">Bitbucket</option>
          <option value="gitea">Gitea (Self-Hosted)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Provider Name</label>
        <input
          {...register('name')}
          placeholder="My GitHub"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Username</label>
        <input
          {...register('username')}
          placeholder="your-username"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        {errors.username && <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>}
      </div>

      {selectedProvider === 'gitea' && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Base URL</label>
          <input
            {...register('base_url')}
            placeholder="http://gitea.local"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          {errors.base_url && <p className="mt-1 text-sm text-red-600">{errors.base_url.message}</p>}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">Access Token</label>
        <input
          {...register('access_token')}
          type="password"
          placeholder="your-access-token"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        <p className="mt-1 text-xs text-gray-600">{providerInfo[selectedProvider]}</p>
        {errors.access_token && <p className="mt-1 text-sm text-red-600">{errors.access_token.message}</p>}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 shadow-md transition-colors"
      >
        {isLoading ? 'Adding...' : 'Add Git Provider'}
      </button>
    </form>
  );
}
