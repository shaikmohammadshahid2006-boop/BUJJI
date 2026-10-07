import { supabase } from '../lib/supabase';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { requiresAuth = true, headers = {}, ...rest } = options;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  if (requiresAuth) {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
      } else {
        // Look in localStorage as fallback
        const localToken = localStorage.getItem('jarvis_auth_token');
        if (localToken) {
          requestHeaders['Authorization'] = `Bearer ${localToken}`;
        }
      }
    } catch (err) {
      console.warn('Could not retrieve Supabase session token:', err);
    }
  }

  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    const response = await fetch(url, {
      ...rest,
      headers: requestHeaders,
    });

    if (response.status === 401) {
      localStorage.removeItem('jarvis_auth_token');
      if (!requiresAuth) {
        return {} as T;
      }
      throw new Error('Your session has expired. Please log in again.');
    }

    if (!response.ok) {
      let errorMsg = `Server error (${response.status})`;
      try {
        const errorData = await response.json();
        errorMsg = errorData.detail || errorData.error || errorMsg;
      } catch {
        // non-JSON error
      }
      throw new Error(errorMsg);
    }

    return (await response.json()) as T;
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Unable to connect to BUJJI backend. Please ensure the server is running.');
    }
    throw error;
  }
}
