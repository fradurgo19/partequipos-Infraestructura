import { UtilityBill, FilterOptions } from '../types';
import { pagosAuthService } from './authService';
import { PAGOS_API } from '../config';

const mapDbRowToBill = (row: Record<string, unknown>): UtilityBill => row as unknown as UtilityBill;

export const billService = {
  async getAll(filters?: FilterOptions): Promise<UtilityBill[]> {
    const params = new URLSearchParams();
    if (filters?.period) params.append('period', filters.period);
    if (filters?.serviceType && filters.serviceType !== 'all') {
      params.append('serviceType', filters.serviceType);
    }
    if (filters?.location && filters.location !== 'all') {
      params.append('location', filters.location);
    }
    if (filters?.status && filters.status !== 'all') {
      params.append('status', filters.status);
    }
    if (filters?.search) params.append('search', filters.search);

    const queryString = params.toString();
    const url = queryString ? `${PAGOS_API}/bills?${queryString}` : `${PAGOS_API}/bills`;

    const response = await fetch(url, { headers: await pagosAuthService.getPagosApiAuthHeaders() });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al obtener facturas');
    }
    const data = await response.json();
    return data.map(mapDbRowToBill);
  },

  async getById(id: string): Promise<UtilityBill | null> {
    const response = await fetch(`${PAGOS_API}/bills/${id}`, {
      headers: await pagosAuthService.getPagosApiAuthHeaders(),
    });
    if (!response.ok) {
      if (response.status === 404) return null;
      const error = await response.json();
      throw new Error(error.error || 'Error al obtener factura');
    }
    return mapDbRowToBill(await response.json());
  },

  async create(bill: Partial<UtilityBill>): Promise<UtilityBill> {
    const response = await fetch(`${PAGOS_API}/bills`, {
      method: 'POST',
      headers: await pagosAuthService.getPagosApiAuthHeaders(),
      body: JSON.stringify(bill),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al crear factura');
    }
    return mapDbRowToBill(await response.json());
  },

  async update(id: string, updates: Partial<UtilityBill>): Promise<UtilityBill> {
    const response = await fetch(`${PAGOS_API}/bills/${id}`, {
      method: 'PUT',
      headers: await pagosAuthService.getPagosApiAuthHeaders(),
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al actualizar factura');
    }
    return mapDbRowToBill(await response.json());
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`${PAGOS_API}/bills/${id}`, {
      method: 'DELETE',
      headers: await pagosAuthService.getPagosApiAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al eliminar factura');
    }
  },

  async bulkDelete(ids: string[]): Promise<void> {
    const response = await fetch(`${PAGOS_API}/bills/bulk-delete`, {
      method: 'POST',
      headers: await pagosAuthService.getPagosApiAuthHeaders(),
      body: JSON.stringify({ ids }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al eliminar facturas');
    }
  },

  async approve(id: string): Promise<UtilityBill> {
    const response = await fetch(`${PAGOS_API}/bills/${id}/approve`, {
      method: 'POST',
      headers: await pagosAuthService.getPagosApiAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al aprobar factura');
    }
    return mapDbRowToBill(await response.json());
  },

  async updateStatus(id: string, status: string): Promise<UtilityBill> {
    const response = await fetch(`${PAGOS_API}/bills/${id}/status`, {
      method: 'PATCH',
      headers: await pagosAuthService.getPagosApiAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al actualizar estado de factura');
    }
    return mapDbRowToBill(await response.json());
  },
};

export const uploadBillDocument = async (file: File): Promise<{ url: string; filename: string }> => {
  const headers = await pagosAuthService.getPagosApiAuthHeaders(false);
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${PAGOS_API}/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al subir archivo');
  }

  return response.json();
};
