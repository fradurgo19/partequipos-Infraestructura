import { UserProfile } from '../types';
import { supabase } from '../../lib/supabase';
import { PAGOS_API } from '../config';
import { debugLog } from '../../utils/debugLog';

const TOKEN_KEY = 'pagos_auth_token';

const getToken = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) return token;

  const legacyToken = localStorage.getItem('pagos_pagos_auth_token');
  if (legacyToken) {
    localStorage.setItem(TOKEN_KEY, legacyToken);
    localStorage.removeItem('pagos_pagos_auth_token');
    return legacyToken;
  }

  return null;
};
const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
const removeToken = () => localStorage.removeItem(TOKEN_KEY);

const LOGIN_TIMEOUT_MS = 25_000;

const fetchWithTimeout = async (url: string, options: RequestInit) => {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), LOGIN_TIMEOUT_MS);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
};

export const pagosAuthService = {
  async signUp(email: string, password: string, fullName: string, location: string) {
    const response = await fetch(`${PAGOS_API}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, fullName, location }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Error al crear cuenta');
    setToken(data.token);
    return { user: { id: data.user.id, email: data.user.email } };
  },

  async signIn(email: string, password: string) {
    const loginUrl = `${PAGOS_API}/auth/login`;
    const startedAt = Date.now();
    // #region agent log
    debugLog('authService.ts:signIn:start', 'pagos login fetch start', {
      loginUrl,
      apiBase: PAGOS_API,
      isProd: import.meta.env.PROD,
    }, 'F');
    // #endregion

    let response: Response;
    try {
      response = await fetchWithTimeout(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
    } catch (error) {
      // #region agent log
      debugLog('authService.ts:signIn:fetch-error', 'pagos login fetch failed', {
        loginUrl,
        durationMs: Date.now() - startedAt,
        errorName: error instanceof Error ? error.name : 'unknown',
        errorMessage: error instanceof Error ? error.message : 'unknown',
        isAbort: error instanceof DOMException && error.name === 'AbortError',
      }, 'F');
      // #endregion
      if (error instanceof DOMException && error.name === 'AbortError') {
        const timeoutError = new Error('El servidor tardó demasiado en responder. Intenta de nuevo.');
        (timeoutError as Error & { status?: number }).status = 504;
        throw timeoutError;
      }
      throw error;
    }

    const data = await response.json().catch(() => ({}));
    // #region agent log
    debugLog('authService.ts:signIn:response', 'pagos login fetch response', {
      loginUrl,
      durationMs: Date.now() - startedAt,
      status: response.status,
      ok: response.ok,
      hasToken: typeof data.token === 'string',
      error: typeof data.error === 'string' ? data.error : null,
    }, 'F');
    // #endregion
    if (!response.ok) {
      const loginError = new Error(
        typeof data.error === 'string' ? data.error : 'Error al iniciar sesión'
      );
      (loginError as Error & { status?: number }).status = response.status;
      throw loginError;
    }

    setToken(data.token);
    return { user: { id: data.user.id, email: data.user.email } };
  },

  async signOut() {
    const token = getToken();
    if (token) {
      try {
        await fetch(`${PAGOS_API}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (error) {
        console.error('Error al cerrar sesión pagos:', error);
      }
    }
    removeToken();
  },

  async getCurrentUser() {
    const token = getToken();
    if (!token) return null;
    try {
      const response = await fetch(`${PAGOS_API}/auth/verify`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        removeToken();
        return null;
      }
      const data = await response.json();
      return data.user;
    } catch {
      removeToken();
      return null;
    }
  },

  async getUserProfile(): Promise<UserProfile | null> {
    const token = getToken();
    if (!token) return null;
    try {
      const response = await fetch(`${PAGOS_API}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) removeToken();
        return null;
      }
      const data = await response.json();
      return {
        id: data.id,
        email: data.email,
        fullName: data.fullName,
        role: data.role,
        department: data.department || undefined,
        location: data.location || undefined,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    } catch (error) {
      console.error('Error al obtener perfil pagos:', error);
      return null;
    }
  },

  getAuthToken() {
    return getToken();
  },

  hasPagosSession() {
    return Boolean(getToken());
  },

  async getPagosApiAuthHeaders(includeJson = true): Promise<Record<string, string>> {
    const headers: Record<string, string> = {};
    if (includeJson) {
      headers['Content-Type'] = 'application/json';
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token && session.user?.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profile?.role === 'admin') {
        headers.Authorization = `Bearer ${session.access_token}`;
        return headers;
      }
    }

    const pagosToken = getToken();
    if (pagosToken) {
      headers.Authorization = `Bearer ${pagosToken}`;
      return headers;
    }

    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }

    return headers;
  },
};
