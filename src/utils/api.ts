import axios from 'axios';

const api = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_API_URL || 'https://itrack-be.onrender.com/api',
  withCredentials: false,
  timeout: 15000, // fail fast to avoid long hangs on first load
});

export const setAuthToken = (token?: string | null) => {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem('token', token);
  else localStorage.removeItem('token');
};

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem('token') || localStorage.getItem('auth');
    let token = raw || '';
    // if you store {token: "..."} in "auth"
    if (!raw?.startsWith('ey') && raw) {
      try {
        token = JSON.parse(raw).token || '';
      } catch {}
    }
    if (token) {
      const headers: any = config.headers ?? {};
      headers.Authorization = `Bearer ${token}`;
      config.headers = headers;
    }
  }
  return config;
});

export default api;
