'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useDispatch } from 'react-redux';
import axios, { AxiosError } from 'axios';
import { setPermissions } from '@/store/slices/permissionSlice';
import type { Permission as ApiPermission } from '@/store/slices/permissionSlice';
import { setPrimaryColor } from '@/store/slices/uiSlice';
import { URLS } from './urls';

type Role = { id: string; name: string; slug: string };

type UserProfile = {
  user_id: string;
  company_id: string | null;
  photo: string | null;
  name: string;
  email: string;
  phone: string;
  role_id: string;
  theme_color: string;
  company?: {
    theme_color: string;
  };
  [k: string]: unknown;
};

type LoginResponse = {
  token: string;
  user: {
    type: 'user';
    role: Role;
    company_id: string | null;
    profile: UserProfile;
    brandColor: string;
  };
  permissions: ApiPermission[];
};

type AuthContextType = {
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);
AuthContext.displayName = 'AuthContext';

function parseJwt<T = Record<string, unknown>>(token: string): T | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = typeof window !== 'undefined' ? window.atob(base64) : '';
    return json ? (JSON.parse(json) as T) : null;
  } catch {
    return null;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function isApiPermission(v: unknown): v is ApiPermission {
  if (!isRecord(v)) return false;
  return (
    typeof v.screen === 'string' &&
    typeof v.view === 'boolean' &&
    typeof v.add === 'boolean' &&
    typeof v.edit === 'boolean' &&
    typeof v.delete === 'boolean'
  );
}

function looksLikeApiPermissions(v: unknown): v is ApiPermission[] {
  return Array.isArray(v) && v.every(isApiPermission);
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const dispatch = useDispatch();

  useEffect(() => {
    try {
      const token =
        typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const storedColor =
        (typeof window !== 'undefined' &&
          localStorage.getItem('primaryColor')) ||
        '';
      dispatch(setPrimaryColor(storedColor));

      if (token) {
        const payload = parseJwt<{ exp?: number }>(token);
        const nowSec = Math.floor(Date.now() / 1000);
        if (payload?.exp && payload.exp <= nowSec) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('permissions');
            localStorage.removeItem('user');
          }
          setIsAuthenticated(false);
        } else {
          setIsAuthenticated(true);

          const raw =
            typeof window !== 'undefined'
              ? localStorage.getItem('permissions')
              : null;
          if (raw) {
            const parsed = JSON.parse(raw) as unknown;
            if (looksLikeApiPermissions(parsed)) {
              dispatch(setPermissions(parsed)); // store expects API shape
            }
          }
        }
      }
    } catch {
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  const login = async (username: string, password: string): Promise<void> => {
    setLoading(true);
    try {
      console.log(URLS.LOGIN,"---------------08")
      const { data } = await axios.post<LoginResponse>(URLS.LOGIN, {
        email: username,
        password,
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('permissions', JSON.stringify(data.permissions)); // keep API shape
        localStorage.setItem(
          'primaryColor',
          data.user.profile?.company?.theme_color || '#1814F3'
        );
      }

      dispatch(setPermissions(data.permissions));
      dispatch(
        setPrimaryColor(data.user.profile?.company?.theme_color || '#1814F3')
      );

      setIsAuthenticated(true);
      toast.success('Logged in successfully');
      router.push('/');
    } catch (err) {
      let message = 'Login failed. Please try again.';
      if (axios.isAxiosError(err)) {
        const ax = err as AxiosError<{ message?: string }>;
        if (ax.code === 'ERR_NETWORK')
          message = 'Cannot reach server. Check API URL or network.';
        message =
          ax.response?.data?.message ||
          ax.response?.statusText ||
          ax.message ||
          message;
      }
      toast.error(message);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const logout = (): void => {
    setIsAuthenticated(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('permissions');
    }
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
