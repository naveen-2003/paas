// ============ Auth & User ============
export interface User {
  id: number;
  email: string;
  isAdmin: boolean;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ApiKey {
  id: number;
  name: string;
  key: string;
  createdAt: string;
}

// ============ Apps ============
export interface AppRequest {
  name: string;
  repo_url: string;
  branch: string;
  git_provider_id: number;
  registry_id: number;
  cluster_id: number;
}

export interface App {
  id: number;
  name: string;
  repo_url: string;
  branch: string;
  git_provider_id: number;
  registry_id: number;
  cluster_id: number;
  status: 'idle' | 'building' | 'deploying' | 'running' | 'failed';
  createdAt: string;
  updatedAt: string;
  latestDeployment?: Deployment;
}

export interface Deployment {
  id: number;
  appId: number;
  commitId: string;
  status: 'pending' | 'building' | 'deploying' | 'running' | 'failed';
  createdAt: string;
  completedAt?: string;
}

export interface DeploymentLog {
  id: number;
  deploymentId: number;
  message: string;
  type: 'info' | 'error' | 'warning';
  createdAt: string;
}

// ============ Git Providers ============
export type GitProviderType = 'github' | 'gitlab' | 'bitbucket' | 'gitea';

export interface GitProviderRequest {
  provider: GitProviderType;
  name: string;
  username: string;
  access_token: string;
  base_url?: string; // For Gitea self-hosted
}

export interface GitProvider {
  id: number;
  provider: GitProviderType;
  name: string;
  username: string;
  createdAt: string;
}

// ============ Registry Providers ============
export type RegistryType = 'dockerhub' | 'ghcr' | 'ecr' | 'gcr' | 'self-hosted';

export interface RegistryProviderRequest {
  name: string;
  type: RegistryType;
  username?: string;
  password_or_token?: string;
  host?: string;
  aws_region?: string;
  aws_access_key?: string;
  aws_secret_key?: string;
  gcp_project?: string;
}

export interface RegistryProvider {
  id: number;
  name: string;
  type: RegistryType;
  host?: string;
  createdAt: string;
}

// ============ Cluster Providers ============
export type ClusterType = 'kind' | 'k3s' | 'eks' | 'gke' | 'other';

export interface ClusterProviderRequest {
  name: string;
  type: ClusterType;
  namespace_prefix: string;
  kubeconfig: string;
}

export interface ClusterProvider {
  id: number;
  name: string;
  type: ClusterType;
  namespace_prefix: string;
  createdAt: string;
}

// ============ Errors & Responses ============
export interface ApiError {
  message: string;
  status?: number;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
