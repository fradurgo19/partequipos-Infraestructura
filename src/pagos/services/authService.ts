import { UserProfile } from '../types';
import { PAGOS_API } from '../config';

const TOKEN_KEY = 'pagos_pagos_auth_token';

const getToken = () => localStorage.getItem(TOKEN_KEY);
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
};
