import React from 'react';
import { Select } from '../../atoms/Select';
import { FilterOptions } from '../types';

interface FilterBarProps {
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  cities: string[];
  businessGroups: string[];
  locations: string[];
  periods: string[];
}

const truncateLabel = (value: string, maxLength = 36) =>
  value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;

const toSelectOptions = (values: string[], allLabel: string, truncate = false) => [
  { value: 'all', label: allLabel },
  ...values.map((value) => ({
    value,
    label: truncate ? truncateLabel(value) : value,
    title: value,
  })),
];

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  cities,
  businessGroups,
  locations,
  periods,
}) => {
  const serviceTypeOptions = [
    { value: 'all', label: 'Todos los Servicios' },
    { value: 'electricity', label: 'Energía' },
    { value: 'water', label: 'Agua' },
    { value: 'gas', label: 'Gas' },
    { value: 'internet', label: 'Internet' },
    { value: 'phone', label: 'Teléfono' },
    { value: 'cellular', label: 'Celular' },
    { value: 'waste', label: 'Aseo' },
    { value: 'sewer', label: 'Alcantarillado' },
    { value: 'public_lighting', label: 'Alumbrado Público' },
    { value: 'security', label: 'Seguridad' },
    { value: 'administration', label: 'Administración' },
    { value: 'rent', label: 'Arrendamiento' },
    { value: 'other', label: 'Otro' },
  ];

  const statusOptions = [
    { value: 'all', label: 'Todos los Estados' },
    { value: 'draft', label: 'Borrador' },
    { value: 'pending', label: 'Pendiente' },
    { value: 'approved', label: 'Aprobado' },
    { value: 'overdue', label: 'Vencido' },
    { value: 'paid', label: 'Pagado' },
  ];

  const handleChange = (key: keyof FilterOptions, value: string) => {
    const next: FilterOptions = { ...filters, [key]: value };

    if (key === 'city') {
      next.businessGroup = 'all';
      next.location = 'all';
    } else if (key === 'businessGroup') {
      next.location = 'all';
    }

    onFilterChange(next);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-3">
      <div className="min-w-0">
        <Select
          fullWidth
          label="Periodo"
          value={filters.period || 'all'}
          options={toSelectOptions(periods, 'Todos los Periodos')}
          onChange={(e) => handleChange('period', e.target.value)}
          className="w-full max-w-full"
        />
      </div>
      <div className="min-w-0">
        <Select
          fullWidth
          label="Tipo de Servicio"
          value={filters.serviceType || 'all'}
          options={serviceTypeOptions}
          onChange={(e) => handleChange('serviceType', e.target.value)}
          className="w-full max-w-full"
        />
      </div>
      <div className="min-w-0">
        <Select
          fullWidth
          label="Ciudad"
          value={filters.city || 'all'}
          options={toSelectOptions(cities, 'Todas las Ciudades')}
          onChange={(e) => handleChange('city', e.target.value)}
          className="w-full max-w-full"
        />
      </div>
      <div className="min-w-0">
        <Select
          fullWidth
          label="Grupo"
          value={filters.businessGroup || 'all'}
          options={toSelectOptions(businessGroups, 'Todos los Grupos', true)}
          onChange={(e) => handleChange('businessGroup', e.target.value)}
          className="w-full max-w-full"
        />
      </div>
      <div className="min-w-0 max-w-full">
        <Select
          fullWidth
          label="Ubicación"
          value={filters.location || 'all'}
          options={toSelectOptions(locations, 'Todas las Ubicaciones', true)}
          onChange={(e) => handleChange('location', e.target.value)}
          className="w-full max-w-full truncate"
        />
      </div>
      <div className="min-w-0">
        <Select
          fullWidth
          label="Estado"
          value={filters.status || 'all'}
          options={statusOptions}
          onChange={(e) => handleChange('status', e.target.value)}
          className="w-full max-w-full"
        />
      </div>
    </div>
  );
};
