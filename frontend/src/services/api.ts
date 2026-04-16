import axios from 'axios';
import type {
  AuthResponse,
  User,
  ApiKey,
  App,
  AppRequest,
  Deployment,
  DeploymentLog,
  GitProvider,
  GitProviderRequest,
  RegistryProvider,
  RegistryProviderRequest,
  ClusterProvider,
  ClusterProviderRequest,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============ Auth Endpoints ============
export const authApi = {
  register: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/register', {
      email,
      password,
    });
    return response.data;
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },

  generateApiKey: async (name: string): Promise<ApiKey> => {
    const response = await apiClient.post<ApiKey>('/auth/api-keys', { name });
    return response.data;
  },

  listApiKeys: async (): Promise<ApiKey[]> => {
    const response = await apiClient.get<ApiKey[]>('/auth/api-keys');
    return response.data;
  },

  revokeApiKey: async (keyId: number): Promise<void> => {
    await apiClient.delete(`/auth/api-keys/${keyId}`);
  },
};

// ============ Apps Endpoints ============
export const appsApi = {
  create: async (appData: AppRequest): Promise<App> => {
    const response = await apiClient.post<App>('/apps', appData);
    return response.data;
  },

  list: async (): Promise<App[]> => {
    const response = await apiClient.get<App[]>('/apps');
    return response.data;
  },

  get: async (appName: string): Promise<App> => {
    const response = await apiClient.get<App>(`/apps/${appName}`);
    return response.data;
  },

  delete: async (appName: string): Promise<void> => {
    await apiClient.delete(`/apps/${appName}`);
  },

  getLogs: async (appName: string): Promise<DeploymentLog[]> => {
    const response = await apiClient.get<DeploymentLog[]>(`/apps/${appName}/logs`);
    return response.data;
  },

  getDeployments: async (appName: string): Promise<Deployment[]> => {
    const response = await apiClient.get<Deployment[]>(`/apps/${appName}/deployments`);
    return response.data;
  },
};

// ============ Git Providers Endpoints ============
export const gitProvidersApi = {
  add: async (providerData: GitProviderRequest): Promise<GitProvider> => {
    const response = await apiClient.post<GitProvider>('/providers/git', providerData);
    return response.data;
  },

  list: async (): Promise<GitProvider[]> => {
    const response = await apiClient.get<GitProvider[]>('/providers/git');
    return response.data;
  },

  delete: async (providerId: number): Promise<void> => {
    await apiClient.delete(`/providers/git/${providerId}`);
  },
};

// ============ Registry Providers Endpoints ============
export const registryProvidersApi = {
  add: async (providerData: RegistryProviderRequest): Promise<RegistryProvider> => {
    const response = await apiClient.post<RegistryProvider>('/providers/registry', providerData);
    return response.data;
  },

  list: async (): Promise<RegistryProvider[]> => {
    const response = await apiClient.get<RegistryProvider[]>('/providers/registry');
    return response.data;
  },

  delete: async (providerId: number): Promise<void> => {
    await apiClient.delete(`/providers/registry/${providerId}`);
  },
};

// ============ Cluster Providers Endpoints ============
export const clusterProvidersApi = {
  add: async (providerData: ClusterProviderRequest): Promise<ClusterProvider> => {
    const response = await apiClient.post<ClusterProvider>('/providers/cluster', providerData);
    return response.data;
  },

  list: async (): Promise<ClusterProvider[]> => {
    const response = await apiClient.get<ClusterProvider[]>('/providers/cluster');
    return response.data;
  },

  delete: async (providerId: number): Promise<void> => {
    await apiClient.delete(`/providers/cluster/${providerId}`);
  },
};

export default apiClient;
