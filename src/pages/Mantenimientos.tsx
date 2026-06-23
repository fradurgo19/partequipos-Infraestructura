import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, Wrench, Calendar, AlertTriangle } from 'lucide-react';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Select } from '../atoms/Select';
import { Textarea } from '../atoms/Textarea';
import { Modal } from '../molecules/Modal';
import { Badge } from '../atoms/Badge';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Maintenance, Site, Contractor } from '../types';
import { getMaintenanceComponentLabel } from '../constants/siteComponents';
import { syncMaintenanceAlerts } from '../services/maintenanceAlerts';

const MAINTENANCE_KIND_OPTIONS = [
  { value: 'preventive', label: 'Preventivo' },
  { value: 'corrective', label: 'Correctivo' },
];

const COMPONENT_STATUS_OPTIONS = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Baja' },
];

const emptyForm = {
  site_id: '',
  component_name: '',
  component_id: '',
  contractor_id: '',
  maintenance_kind: 'preventive' as const,
  last_maintenance_date: '',
  next_maintenance_date: '',
  last_maintenance_cost: '',
  component_status: 'active' as const,
  notes: '',
};

const formatCurrency = (value?: number | null): string =>
  value == null ? '—' : `$${value.toLocaleString('es-CO')}`;

const parseOptionalCost = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
};

const daysUntilDate = (dateStr: string): number => {
  const target = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const getDueBadge = (nextDate: string, status: string) => {
  if (status === 'inactive') {
    return { variant: 'default' as const, label: 'Baja' };
  }
  const days = daysUntilDate(nextDate);
  if (days < 0) {
    return { variant: 'danger' as const, label: `Vencido (${Math.abs(days)}d)` };
  }
  if (days <= 10) {
    return { variant: 'pending' as const, label: `Próximo (${days}d)` };
  }
  return { variant: 'success' as const, label: 'Al día' };
};

export const Mantenimientos = () => {
  const { profile } = useAuth();
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Maintenance | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [filterSite, setFilterSite] = useState('');
  const [filterKind, setFilterKind] = useState('');

  useEffect(() => {
    if (profile?.role === 'admin') {
      loadData();
    }
  }, [profile]);

  const loadData = async () => {
    setLoading(true);
    const [maintenancesResult, sitesResult, contractorsResult] = await Promise.all([
      supabase
        .from('maintenances')
        .select(
          '*, site:sites(id, name, city), contractor:contractors(id, company_name, contact_name)'
        )
        .order('next_maintenance_date', { ascending: true }),
      supabase.from('sites').select('id, name, city').order('name'),
      supabase
        .from('contractors')
        .select('id, company_name, contact_name, is_active')
        .order('company_name'),
    ]);

    if (!maintenancesResult.error && maintenancesResult.data) {
      setMaintenances(maintenancesResult.data as Maintenance[]);
    }
    if (!sitesResult.error && sitesResult.data) {
      setSites(sitesResult.data as Site[]);
    }
    if (!contractorsResult.error && contractorsResult.data) {
      setContractors(
        (contractorsResult.data as Contractor[]).filter((contractor) => contractor.is_active !== false)
      );
    }
    await syncMaintenanceAlerts();
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const payload = {
      site_id: formData.site_id,
      component_type: 'manual',
      component_name: formData.component_name.trim(),
      component_id: formData.component_id.trim(),
      contractor_id: formData.contractor_id || null,
      maintenance_kind: formData.maintenance_kind,
      last_maintenance_date: formData.last_maintenance_date,
      next_maintenance_date: formData.next_maintenance_date,
      last_maintenance_cost: parseOptionalCost(formData.last_maintenance_cost),
      component_status: formData.component_status,
      notes: formData.notes.trim() || null,
    };

    if (editingItem) {
      const { error } = await supabase.from('maintenances').update(payload).eq('id', editingItem.id);
      if (!error) {
        setShowModal(false);
        resetForm();
        loadData();
      }
    } else {
      const { error } = await supabase.from('maintenances').insert([{ ...payload, created_by: profile.id }]);
      if (!error) {
        setShowModal(false);
        resetForm();
        loadData();
      }
    }
  };

  const handleEdit = (item: Maintenance) => {
    setEditingItem(item);
    setFormData({
      site_id: item.site_id,
      component_name: item.component_name ?? getMaintenanceComponentLabel(item),
      component_id: item.component_id,
      contractor_id: item.contractor_id ?? '',
      maintenance_kind: item.maintenance_kind,
      last_maintenance_date: item.last_maintenance_date,
      next_maintenance_date: item.next_maintenance_date,
      last_maintenance_cost: item.last_maintenance_cost?.toString() ?? '',
      component_status: item.component_status,
      notes: item.notes ?? '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!globalThis.confirm('¿Eliminar este registro de mantenimiento?')) return;
    const { error } = await supabase.from('maintenances').delete().eq('id', id);
    if (!error) loadData();
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingItem(null);
  };

  const handleSiteChange = (siteId: string) => {
    setFormData((prev) => ({
      ...prev,
      site_id: siteId,
    }));
  };

  const contractorOptions = useMemo(
    () => [
      { value: '', label: 'Sin contratista asignado' },
      ...contractors.map((contractor) => ({
        value: contractor.id,
        label: contractor.company_name,
      })),
    ],
    [contractors]
  );

  const filteredMaintenances = maintenances.filter((m) => {
    if (filterSite && m.site_id !== filterSite) return false;
    if (filterKind && m.maintenance_kind !== filterKind) return false;
    return true;
  });

  const siteOptions = [
    { value: '', label: 'Todas las sedes' },
    ...sites.map((s) => ({ value: s.id, label: s.name })),
  ];

  const formSiteOptions = [
    { value: '', label: 'Seleccionar sede...' },
    ...sites.map((s) => ({ value: s.id, label: s.name })),
  ];

  if (profile?.role !== 'admin') {
    return (
      <Card>
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold text-gray-600 mb-2">Acceso denegado</h3>
          <p className="text-gray-500">El módulo de Mantenimientos está disponible solo para administradores</p>
        </div>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#cf1b22]" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#50504f] flex items-center gap-2">
            <Wrench className="w-7 h-7 text-[#cf1b22]" />
            Mantenimientos
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Control de mantenimientos preventivos y correctivos por componente de sede
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo mantenimiento
        </Button>
      </div>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Filtrar por sede"
            options={siteOptions}
            value={filterSite}
            onChange={(e) => setFilterSite(e.target.value)}
            fullWidth
          />
          <Select
            label="Filtrar por tipo"
            options={[
              { value: '', label: 'Todos los tipos' },
              ...MAINTENANCE_KIND_OPTIONS,
            ]}
            value={filterKind}
            onChange={(e) => setFilterKind(e.target.value)}
            fullWidth
          />
        </div>
      </Card>

      {filteredMaintenances.length === 0 ? (
        <Card>
          <div className="text-center py-12 text-gray-500">
            <Wrench className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No hay registros de mantenimiento</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredMaintenances.map((item) => {
            const dueBadge = getDueBadge(item.next_maintenance_date, item.component_status);
            const kindLabel = item.maintenance_kind === 'preventive' ? 'Preventivo' : 'Correctivo';

            return (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="font-semibold text-[#50504f] truncate">
                        {item.site?.name ?? 'Sede'}
                      </h3>
                      <Badge variant={dueBadge.variant}>{dueBadge.label}</Badge>
                      <Badge variant={item.component_status === 'active' ? 'success' : 'default'}>
                        {item.component_status === 'active' ? 'Activo' : 'Baja'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700 font-medium">
                      {getMaintenanceComponentLabel(item)} · ID: {item.component_id}
                    </p>
                    {item.contractor && (
                      <p className="text-sm text-gray-600 mt-1">
                        Contratista: {item.contractor.company_name}
                      </p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">{kindLabel}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Último: {item.last_maintenance_date}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Próximo: {item.next_maintenance_date}</span>
                      </div>
                      {item.last_maintenance_cost != null && (
                        <div className="col-span-2 text-[#50504f] font-medium">
                          Costo último mtto (ref. próximo): {formatCurrency(item.last_maintenance_cost)}
                        </div>
                      )}
                    </div>
                    {item.notes && (
                      <p className="text-xs text-gray-500 mt-2 line-clamp-2">{item.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button size="sm" variant="secondary" onClick={() => handleEdit(item)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingItem ? 'Editar mantenimiento' : 'Nuevo mantenimiento'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Sede *"
            options={formSiteOptions}
            value={formData.site_id}
            onChange={(e) => handleSiteChange(e.target.value)}
            required
            fullWidth
          />

          <Input
            label="Componente *"
            value={formData.component_name}
            onChange={(e) => setFormData({ ...formData, component_name: e.target.value })}
            placeholder="Ej: Aire acondicionado split, Bomba hidráulica"
            required
            fullWidth
          />

          <Input
            label="Número ID del componente *"
            value={formData.component_id}
            onChange={(e) => setFormData({ ...formData, component_id: e.target.value })}
            placeholder="Ej: AC-001, BOMBA-12"
            required
            fullWidth
          />

          <Select
            label="Contratista"
            options={contractorOptions}
            value={formData.contractor_id}
            onChange={(e) => setFormData({ ...formData, contractor_id: e.target.value })}
            fullWidth
          />

          <Input
            label="Valor último mantenimiento (COP)"
            type="number"
            min="0"
            step="0.01"
            value={formData.last_maintenance_cost}
            onChange={(e) => setFormData({ ...formData, last_maintenance_cost: e.target.value })}
            placeholder="0.00"
            fullWidth
          />

          {formData.last_maintenance_cost.trim() && (
            <p className="text-sm text-gray-600 -mt-2">
              Referencia para el próximo mantenimiento ({formData.next_maintenance_date || 'sin fecha'}):{' '}
              <span className="font-semibold text-[#50504f]">
                {formatCurrency(parseOptionalCost(formData.last_maintenance_cost))}
              </span>
            </p>
          )}

          <Select
            label="Tipo de mantenimiento *"
            options={MAINTENANCE_KIND_OPTIONS}
            value={formData.maintenance_kind}
            onChange={(e) =>
              setFormData({
                ...formData,
                maintenance_kind: e.target.value as 'preventive' | 'corrective',
              })
            }
            required
            fullWidth
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Fecha último mantenimiento *"
              type="date"
              value={formData.last_maintenance_date}
              onChange={(e) => setFormData({ ...formData, last_maintenance_date: e.target.value })}
              required
              fullWidth
            />
            <div>
              <Input
                label="Fecha próximo mantenimiento *"
                type="date"
                value={formData.next_maintenance_date}
                onChange={(e) => setFormData({ ...formData, next_maintenance_date: e.target.value })}
                required
                fullWidth
              />
              {formData.last_maintenance_cost.trim() && (
                <p className="mt-1 text-xs text-gray-500">
                  Costo referencia último mtto: {formatCurrency(parseOptionalCost(formData.last_maintenance_cost))}
                </p>
              )}
            </div>
          </div>

          <Select
            label="Estado del componente *"
            options={COMPONENT_STATUS_OPTIONS}
            value={formData.component_status}
            onChange={(e) =>
              setFormData({
                ...formData,
                component_status: e.target.value as 'active' | 'inactive',
              })
            }
            required
            fullWidth
          />

          <Textarea
            label="Notas"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            fullWidth
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button type="submit">{editingItem ? 'Guardar cambios' : 'Crear registro'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
