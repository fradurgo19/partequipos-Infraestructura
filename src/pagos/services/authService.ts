import { UserProfile } from '../types';
import { supabase } from '../../lib/supabase';
import { PAGOS_API } from '../config';

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
    const response = await fetch(`${PAGOS_API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Error al iniciar sesión');
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

    const pagosToken = getToken();
    if (pagosToken) {
      headers.Authorization = `Bearer ${pagosToken}`;
      return headers;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }

    return headers;
  },
};
