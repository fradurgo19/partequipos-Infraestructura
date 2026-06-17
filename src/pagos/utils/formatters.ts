export const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '$ 0';
  
  try {
    // Formatear manualmente para mayor compatibilidad
    const formatted = value.toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
    return `$ ${formatted}`;
  } catch (error) {
    console.error('Error formateando moneda:', error);
    // Fallback: formateo manual
    return `$ ${value.toString().replaceAll(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
  }
};

export const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return '-';
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    
    // Verificar que la fecha es válida
    if (Number.isNaN(d.getTime())) return '-';
    
    // Usar toLocaleDateString en lugar de Intl.DateFormat
    return d.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Error formateando fecha:', error);
    return '-';
  }
};

export const formatPeriod = (period: string): string => {
  const [year, month] = period.split('-');
  const date = new Date(Number.parseInt(year, 10), Number.parseInt(month, 10) - 1);
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long'
  });
};

/**
 * Parsea números en formato colombiano (punto como miles, coma como decimal)
 * o formato internacional (punto como decimal).
 */
export const parseColombianNumber = (value: string): number => {
  const val = (value?.trim() ?? '').replaceAll(/\s/g, '');
  if (!val) return 0;
  if (val.includes(',')) {
    const parts = val.split(',');
    const intPart = (parts[0] || '0').replaceAll('.', '');
    const decPart = (parts[1] || '0').replaceAll(/\D/g, '');
    return Number.parseFloat(intPart + '.' + decPart) || 0;
  }
  const dotCount = val.match(/\./g)?.length ?? 0;
  if (dotCount === 0) return Number.parseFloat(val.replaceAll(/\D/g, '')) || 0;
  if (dotCount >= 1) {
    const afterLastDot = val.split('.').pop() ?? '';
    const isThousandsSeparator = afterLastDot.length === 3 && /^\d{3}$/.test(afterLastDot);
    if (isThousandsSeparator || dotCount > 1) {
      return Number.parseFloat(val.replaceAll('.', '')) || 0;
    }
  }
  return Number.parseFloat(val.replaceAll(/[^0-9.]/g, '')) || 0;
};

export const parseCurrencyInput = (value: string): number => {
  const val = value?.trim() ?? '';
  if (!val) return 0;
  if (val.includes(',')) {
    return parseColombianNumber(val);
  }
  const dotCount = val.match(/\./g)?.length ?? 0;
  if (dotCount > 1) {
    return Number.parseFloat(val.replaceAll('.', '')) || 0;
  }
  if (dotCount === 1) {
    const after = val.substring(val.indexOf('.') + 1).replaceAll(/\D/g, '');
    if (after.length === 3 && /^\d{3}$/.test(after)) {
      return Number.parseFloat(val.replaceAll('.', '')) || 0;
    }
  }
  const cleaned = val.replaceAll(/[^0-9.]/g, '');
  return Number.parseFloat(cleaned) || 0;
};

export const formatNumberInput = (value: string): string => {
  const num = parseCurrencyInput(value);
  return num.toFixed(2);
};

export const getCurrentPeriod = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export const getPreviousPeriod = (period: string): string => {
  const [year, month] = period.split('-').map(Number);
  const date = new Date(year, month - 2);
  const prevYear = date.getFullYear();
  const prevMonth = String(date.getMonth() + 1).padStart(2, '0');
  return `${prevYear}-${prevMonth}`;
};

export const getMonthName = (monthNumber: number): string => {
  const date = new Date(2000, monthNumber - 1);
  return date.toLocaleDateString('es-ES', { month: 'long' });
};

export const isOverdue = (dueDate: Date | string | null | undefined): boolean => {
  if (!dueDate) return false;
  
  try {
    const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
    if (Number.isNaN(due.getTime())) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  } catch {
    return false;
  }
};

// Traducir tipos de servicio a español
export const translateServiceType = (serviceType: string): string => {
  const translations: Record<string, string> = {
    'electricity': 'Energía',
    'water': 'Agua',
    'gas': 'Gas',
    'internet': 'Internet',
    'phone': 'Teléfono',
    'cellular': 'Celular',
    'waste': 'Aseo',
    'sewer': 'Alcantarillado',
    'public_lighting': 'Alumbrado Público',
    'security': 'Seguridad',
    'administration': 'Administración',
    'rent': 'Arrendamiento',
    'other': 'Otro'
  };
  
  return translations[serviceType] || serviceType;
};

// Traducir estados a español
export const translateStatus = (status: string): string => {
  const translations: Record<string, string> = {
    'draft': 'Borrador',
    'pending': 'Pendiente',
    'approved': 'Aprobado',
    'overdue': 'Vencido',
    'paid': 'Pagado'
  };
  
  return translations[status] || status;
};
