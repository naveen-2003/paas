import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle } from 'lucide-react';
import { authApi } from '../services/api';

const apiKeySchema = z.object({
  name: z.string().min(1, 'Key name is required').min(3, 'Name must be at least 3 characters'),
});

type ApiKeyFormData = z.infer<typeof apiKeySchema>;

interface AddApiKeyFormProps {
  onSuccess: (keyValue: string) => void;
}

export function AddApiKeyForm({ onSuccess }: AddApiKeyFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ApiKeyFormData>({
    resolver: zodResolver(apiKeySchema),
  });

  const onSubmit = async (data: ApiKeyFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await authApi.generateApiKey(data.name);
      reset();
      onSuccess(result.key);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate API key');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start space-x-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">API Key Name</label>
        <input
          {...register('name')}
          placeholder="e.g., CI/CD Pipeline, Local Development"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 shadow-md transition-colors"
      >
        {isLoading ? 'Generating...' : 'Generate API Key'}
      </button>
    </form>
  );
}
