export const API_URL =
  import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:3000');

export const PAGOS_API = `${API_URL}/api/pagos`;
