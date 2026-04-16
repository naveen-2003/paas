import { useState, useEffect } from 'react';
import { Plus, Loader, AlertCircle, Trash2, Copy } from 'lucide-react';
import { authApi } from '../services/api';
import type { ApiKey } from '../types';
import { AddApiKeyForm } from '../components/AddApiKeyForm';

export function SettingsPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await authApi.listApiKeys();
      setApiKeys(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load API keys');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteKey = async (id: number, name: string) => {
    if (!confirm(`Delete API key "${name}"?`)) return;

    setDeletingId(id);
    try {
      await authApi.revokeApiKey(id);
      setApiKeys(apiKeys.filter((key) => key.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete API key');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleKeyAdded = (keyValue: string) => {
    setNewKey(keyValue);
    setShowForm(false);
    fetchApiKeys();
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
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-gray-600">Manage your API keys and preferences</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center space-x-2 bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 font-semibold transition-colors shadow-md"
        >
          <Plus size={20} />
          <span>Generate API Key</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start space-x-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {newKey && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 space-y-4">
          <div>
            <h3 className="font-medium text-green-900">API Key Generated Successfully</h3>
            <p className="text-sm text-green-700 mt-1">
              Save this key now. You won't be able to see it again!
            </p>
          </div>
          <div className="bg-white rounded p-4 flex items-center space-x-2">
            <code className="text-sm font-mono flex-1 break-all">{newKey}</code>
            <button
              onClick={() => handleCopy(newKey)}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <Copy size={18} />
            </button>
          </div>
          <button
            onClick={() => setNewKey(null)}
            className="text-sm text-green-600 hover:text-green-700 font-medium"
          >
            Done
          </button>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-8">
          <AddApiKeyForm onSuccess={handleKeyAdded} />
        </div>
      )}

      {/* API Keys Section */}
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">API Keys</h2>

        {apiKeys.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No API keys created yet</p>
            <p className="text-sm text-gray-400">Generate one to use the API programmatically</p>
          </div>
        ) : (
          <div className="space-y-3">
            {apiKeys.map((key) => (
              <div key={key.id} className="flex items-center justify-between bg-gray-50 p-4 rounded">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{key.name}</h3>
                  <p className="text-xs text-gray-600 mt-1">
                    Created: {new Date(key.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteKey(key.id, key.name)}
                  disabled={deletingId === key.id}
                  className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-50 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* API Documentation Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-8">
        <h2 className="text-xl font-bold text-blue-900 mb-4">Using API Keys</h2>
        <div className="space-y-4 text-blue-800">
          <p>
            Include your API key in the <code className="bg-blue-100 px-2 py-1 rounded">Authorization</code> header:
          </p>
          <div className="bg-white rounded p-4 font-mono text-sm overflow-auto">
            <div>Authorization: ApiKey &lt;your-api-key&gt;</div>
          </div>
          <p className="text-sm">
            This allows you to authenticate API requests without using JWT tokens. Perfect for CI/CD pipelines and
            automated workflows.
          </p>
        </div>
      </div>
    </div>
  );
}
