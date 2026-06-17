import React from 'react';
import { Select } from '../../atoms/Select';
import { FilterOptions, ServiceType, BillStatus } from '../types';

interface FilterBarProps {
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  locations: string[];
  periods: string[];
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  locations,
  periods
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
    { value: 'other', label: 'Otro' }
  ];

  const statusOptions = [
    { value: 'all', label: 'Todos los Estados' },
    { value: 'draft', label: 'Borrador' },
    { value: 'pending', label: 'Pendiente' },
    { value: 'approved', label: 'Aprobado' },
    { value: 'overdue', label: 'Vencido' },
    { value: 'paid', label: 'Pagado' }
  ];

  const locationOptions = [
    { value: 'all', label: 'Todas las Ubicaciones' },
    ...locations.map(loc => ({ value: loc, label: loc }))
  ];

  const periodOptions = [
    { value: 'all', label: 'Todos los Periodos' },
    ...periods.map(period => ({ value: period, label: period }))
  ];

  const handleChange = (key: keyof FilterOptions, value: string) => {
    onFilterChange({
      ...filters,
      [key]: value
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Select
        label="Periodo"
        value={filters.period || 'all'}
        options={periodOptions}
        onChange={(e) => handleChange('period', e.target.value)}
      />
      <Select
        label="Tipo de Servicio"
        value={filters.serviceType || 'all'}
        options={serviceTypeOptions}
        onChange={(e) => handleChange('serviceType', e.target.value as ServiceType | 'all')}
      />
      <Select
        label="Ubicación"
        value={filters.location || 'all'}
        options={locationOptions}
        onChange={(e) => handleChange('location', e.target.value)}
      />
      <Select
        label="Estado"
        value={filters.status || 'all'}
        options={statusOptions}
        onChange={(e) => handleChange('status', e.target.value as BillStatus | 'all')}
      />
    </div>
  );
};
