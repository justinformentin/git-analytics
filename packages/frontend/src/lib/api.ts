const API_BASE = import.meta.env.VITE_API_URL || '';

function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem('auth_token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

// Auth
export const authApi = {
  initOAuth: () => request<{ url: string; state: string }>('/api/auth/github', { method: 'POST' }),
  getMe: () => request<{ id: string; username: string; display_name?: string; avatar_url?: string }>('/api/auth/me'),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
};

// Repos
export const reposApi = {
  list: () => request<any[]>('/api/repos'),
  search: () => request<any[]>('/api/repos/search'),
  add: (data: any) => request('/api/repos', { method: 'POST', body: JSON.stringify(data) }),
  remove: (owner: string, repo: string) => request(`/api/repos/${owner}/${repo}`, { method: 'DELETE' }),
  sync: (owner: string, repo: string) => request(`/api/repos/${owner}/${repo}/sync`, { method: 'POST' }),
  stats: (owner: string, repo: string) => request<any>(`/api/repos/${owner}/${repo}/stats`),
};

// PRs
export const pullsApi = {
  list: (params?: {
    readiness?: string;
    repo?: string;
    author?: string;
    state?: string;
    search?: string;
    sort?: string;
    dir?: string;
    page?: number;
    per_page?: number;
  }) => {
    const qs = new URLSearchParams(
      Object.entries(params || {})
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => [k, String(v)])
    ).toString();
    return request<{ data: any[]; total: number }>(`/api/pulls${qs ? `?${qs}` : ''}`);
  },
  get: (owner: string, repo: string, number: number) =>
    request<any>(`/api/pulls/${owner}/${repo}/${number}`),
};

// Commits
export const commitsApi = {
  list: (params?: {
    repo?: string;
    author?: string;
    since?: string;
    until?: string;
    page?: number;
    per_page?: number;
  }) => {
    const qs = new URLSearchParams(
      Object.entries(params || {})
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => [k, String(v)])
    ).toString();
    return request<{ data: any[]; total: number }>(`/api/commits${qs ? `?${qs}` : ''}`);
  },
};

// Authors
export const authorsApi = {
  list: () => request<any[]>('/api/authors'),
};

// Dashboard
export const dashboardApi = {
  get: () => request<any>('/api/dashboard'),
  trend: (days?: number) => request<any[]>(`/api/dashboard/trend${days ? `?days=${days}` : ''}`),
  distribution: () => request<any>('/api/dashboard/distribution'),
};
