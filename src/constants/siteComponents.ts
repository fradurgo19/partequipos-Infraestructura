import { Site } from '../types';

export const SITE_COMPONENT_FIELDS = [
  { key: 'air_conditioners', label: 'Aires acondicionados', countField: 'air_conditioners_count' as const },
  { key: 'water_tanks', label: 'Tanques de agua', countField: 'water_tanks_count' as const },
  { key: 'water_pumps', label: 'Bombas de agua', countField: 'water_pumps_count' as const },
  { key: 'rci_pumps', label: 'Bombas RCI', countField: 'rci_pumps_count' as const },
  { key: 'electrical_plants', label: 'Plantas eléctricas', countField: 'electrical_plants_count' as const },
  { key: 'bathrooms', label: 'Baños', countField: 'bathrooms_count' as const },
  { key: 'urinals', label: 'Urinales', countField: 'urinals_count' as const },
];

export const COMPONENT_LABELS: Record<string, string> = Object.fromEntries(
  SITE_COMPONENT_FIELDS.map((c) => [c.key, c.label])
);

export const getSiteComponentOptions = (site: Site | null): { value: string; label: string }[] => {
  if (!site) return [];

  const fromCounts = SITE_COMPONENT_FIELDS.filter((c) => {
    const count = site[c.countField];
    return typeof count === 'number' && count > 0;
  }).map((c) => ({ value: c.key, label: c.label }));

  if (fromCounts.length > 0) {
    return fromCounts;
  }

  return SITE_COMPONENT_FIELDS.map((c) => ({ value: c.key, label: c.label }));
};

export const getComponentLabel = (componentType: string): string =>
  COMPONENT_LABELS[componentType] ?? componentType;

export const getMaintenanceComponentLabel = (maintenance: {
  component_name?: string | null;
  component_type?: string | null;
}): string =>
  maintenance.component_name?.trim() || getComponentLabel(maintenance.component_type ?? '');
