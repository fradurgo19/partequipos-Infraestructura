import axios from 'axios';
import { supabase } from '../lib/supabase';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token de autenticación
api.interceptors.request.use(
  async (config) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expirado, intentar refrescar
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        error.config.headers.Authorization = `Bearer ${session.access_token}`;
        return api.request(error.config);
      }
      // Si no hay sesión, redirigir a login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

