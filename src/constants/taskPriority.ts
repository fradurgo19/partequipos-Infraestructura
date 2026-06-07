export type TaskPriority = 'emergency' | 'high' | 'medium' | 'low';

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  emergency: 'EMERGENCIA',
  high: 'ALTA',
  medium: 'MEDIA',
  low: 'BAJA',
};

export const PRIORITY_STYLES: Record<TaskPriority, string> = {
  emergency: 'bg-red-700 text-white ring-1 ring-red-900',
  high: 'bg-orange-500 text-white',
  medium: 'bg-amber-400 text-amber-950',
  low: 'bg-slate-500 text-white',
};

export const PRIORITY_ORDER: Record<TaskPriority, number> = {
  emergency: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export const PRIORITY_ROW_BORDER: Record<TaskPriority, string> = {
  emergency: 'border-l-4 border-l-red-600',
  high: 'border-l-4 border-l-orange-500',
  medium: 'border-l-4 border-l-amber-400',
  low: 'border-l-4 border-l-slate-400',
};

export const PRIORITY_OPTIONS = (Object.keys(PRIORITY_LABELS) as TaskPriority[]).map((value) => ({
  value,
  label: PRIORITY_LABELS[value],
}));

export const normalizePriority = (value?: string | null): TaskPriority => {
  if (value === 'emergency' || value === 'high' || value === 'medium' || value === 'low') {
    return value;
  }
  return 'medium';
};

export const comparePriority = (a?: string | null, b?: string | null): number =>
  PRIORITY_ORDER[normalizePriority(a)] - PRIORITY_ORDER[normalizePriority(b)];

export const getPriorityRowClass = (priority?: string | null): string =>
  PRIORITY_ROW_BORDER[normalizePriority(priority)];
