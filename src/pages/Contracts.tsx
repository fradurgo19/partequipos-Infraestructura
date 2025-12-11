import { useState, useEffect } from 'react';
import { Plus, Download, FileText, Edit, Trash2, CheckCircle, Clock, DollarSign } from 'lucide-react';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Select } from '../atoms/Select';
import { Textarea } from '../atoms/Textarea';
import { Modal } from '../molecules/Modal';
import { Badge } from '../atoms/Badge';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Contract, Contractor, Site, ContractAddendum } from '../types';

const CONTRACT_TYPES = [
  { value: 'labor', label: 'Mano de Obra' },
  { value: 'supply', label: 'Suministro' },
  { value: 'mixed', label: 'Mixto' },
];

const INTERNAL_CLIENT_TYPES = [
  'Maquinaria',
  'Repuestos',
  'Bienes inmuebles',
];

const ACTIVITY_TYPES = [
  'Reparaciones Locativas',
  'Mantenimiento',
  'Construcción',
  'Equipos',
  'Limpieza',
  'Pintura',
  'Plomería',
  'Electricidad',
  'Otro',
];

export const Contracts = () => {
  const { profile } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [addendums, setAddendums] = useState<Record<string, ContractAddendum[]>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAddendumModal, setShowAddendumModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [formData, setFormData] = useState({
    contractor_id: '',
    contract_type: 'labor' as 'labor' | 'supply' | 'mixed',
    description: '',
    total_amount: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    activity_type: '',
    cost_center: '',
    internal_client_type: '',
    project_name: '',
    payment_terms: '',
    warranty_period: '',
    warranty_terms: '',
    site_id: '',
    activities: [] as Array<{ description: string; amount: string }>,
    deliverables: [] as string[],
    payment_schedule: [] as Array<{ date: string; amount: string; description: string }>,
  });

  const [addendumData, setAddendumData] = useState({
    description: '',
    additional_amount: '',
    additional_activities: [] as Array<{ description: string; amount: string }>,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [contractsResult, contractorsResult, sitesResult] = await Promise.all([
      supabase
        .from('contracts')
        .select(`
          *,
          contractor:contractors(id, company_name, contact_name, email, phone, nit),
          site:sites(id, name, location)
        `)
        .order('created_at', { ascending: false }),
      supabase.from('contractors').select('*').order('company_name'),
      supabase.from('sites').select('*').order('name'),
    ]);

    if (!contractsResult.error && contractsResult.data) {
      setContracts(contractsResult.data as any);
      
      // Cargar addendums para cada contrato
      const addendumsMap: Record<string, ContractAddendum[]> = {};
      for (const contract of contractsResult.data) {
        const { data: addendumsData } = await supabase
          .from('contract_addendums')
          .select('*')
          .eq('contract_id', contract.id)
          .order('addendum_number', { ascending: true });
        
        if (addendumsData) {
          addendumsMap[contract.id] = addendumsData as any;
        }
      }
      setAddendums(addendumsMap);
    }
    if (!contractorsResult.error && contractorsResult.data) {
      setContractors(contractorsResult.data);
    }
    if (!sitesResult.error && sitesResult.data) {
      setSites(sitesResult.data);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    // Generar número de contrato usando función SQL o fallback
    let contractNumber = '';
    try {
      const { data: contractNumberData } = await supabase.rpc('generate_contract_number', {
        contract_type_param: formData.contract_type,
      });
      contractNumber = contractNumberData || '';
    } catch (error) {
      console.log('RPC function not available, using fallback');
    }
    
    if (!contractNumber) {
      // Fallback: generar número manualmente
      const prefix = formData.contract_type === 'labor' ? 'CON-MO-' :
                     formData.contract_type === 'supply' ? 'CON-SUM-' : 'CON-MIX-';
      const year = new Date().getFullYear();
      const { data: lastContract } = await supabase
        .from('contracts')
        .select('contract_number')
        .like('contract_number', `${prefix}${year}%`)
        .order('contract_number', { ascending: false })
        .limit(1)
        .single();
      
      if (lastContract?.contract_number) {
        const lastNum = parseInt(lastContract.contract_number.slice(-4)) || 0;
        contractNumber = `${prefix}${year}${String(lastNum + 1).padStart(4, '0')}`;
      } else {
        contractNumber = `${prefix}${year}0001`;
      }
    }

    const activities = formData.activities
      .filter(a => a.description && a.amount)
      .map(a => ({
        description: a.description,
        amount: parseFloat(a.amount) || 0,
      }));

    const budgetControl = {
      total_budget: parseFloat(formData.total_amount) || 0,
      spent: 0,
      remaining: parseFloat(formData.total_amount) || 0,
      items: activities,
    };

    const contractData = {
      contract_number: contractNumber,
      contractor_id: formData.contractor_id,
      contract_type: formData.contract_type,
      description: formData.description,
      total_amount: parseFloat(formData.total_amount) || 0,
      start_date: formData.start_date,
      end_date: formData.end_date || null,
      activity_type: formData.activity_type || null,
      cost_center: formData.cost_center || null,
      internal_client_type: formData.internal_client_type || null,
      project_name: formData.project_name || null,
      payment_terms: formData.payment_terms || null,
      warranty_period: formData.warranty_period ? parseInt(formData.warranty_period) : null,
      warranty_terms: formData.warranty_terms || null,
      site_id: formData.site_id || null,
      activities: activities.length > 0 ? activities : null,
      deliverables: formData.deliverables.length > 0 ? formData.deliverables : null,
      payment_schedule: formData.payment_schedule.length > 0 ? formData.payment_schedule.map(p => ({
        date: p.date,
        amount: parseFloat(p.amount) || 0,
        description: p.description,
      })) : null,
      budget_control,
      status: 'draft',
      legal_review_status: 'pending',
      created_by: profile.id,
    };

    if (editingContract) {
      const { error } = await supabase
        .from('contracts')
        .update(contractData)
        .eq('id', editingContract.id);

      if (!error) {
        setShowModal(false);
        resetForm();
        loadData();
      }
    } else {
      const { error } = await supabase.from('contracts').insert([contractData]);

      if (!error) {
        setShowModal(false);
        resetForm();
        loadData();
      }
    }
  };

  const handleAddAddendum = async () => {
    if (!selectedContract || !profile) return;

    const contractAddendums = addendums[selectedContract.id] || [];
    const nextNumber = contractAddendums.length + 1;

    const additionalActivities = addendumData.additional_activities
      .filter(a => a.description && a.amount)
      .map(a => ({
        description: a.description,
        amount: parseFloat(a.amount) || 0,
      }));

    const addendumDataToSave = {
      contract_id: selectedContract.id,
      addendum_number: nextNumber,
      description: addendumData.description,
      additional_amount: parseFloat(addendumData.additional_amount) || 0,
      additional_activities: additionalActivities.length > 0 ? additionalActivities : null,
      created_by: profile.id,
    };

    const { error } = await supabase.from('contract_addendums').insert([addendumDataToSave]);

    if (!error) {
      setShowAddendumModal(false);
      setAddendumData({
        description: '',
        additional_amount: '',
        additional_activities: [],
      });
      loadData();
    }
  };

  const handleEdit = (contract: Contract) => {
    setEditingContract(contract);
    setFormData({
      contractor_id: contract.contractor_id,
      contract_type: contract.contract_type,
      description: contract.description,
      total_amount: contract.total_amount.toString(),
      start_date: contract.start_date,
      end_date: contract.end_date || '',
      activity_type: contract.activity_type || '',
      cost_center: contract.cost_center || '',
      internal_client_type: contract.internal_client_type || '',
      project_name: contract.project_name || '',
      payment_terms: contract.payment_terms || '',
      warranty_period: contract.warranty_period?.toString() || '',
      warranty_terms: contract.warranty_terms || '',
      site_id: contract.site_id || '',
      activities: contract.budget_control?.items?.map(item => ({
        description: item.description,
        amount: item.amount.toString(),
      })) || [],
      deliverables: contract.deliverables || [],
      payment_schedule: contract.payment_schedule || [],
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      contractor_id: '',
      contract_type: 'labor',
      description: '',
      total_amount: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      activity_type: '',
      cost_center: '',
      internal_client_type: '',
      project_name: '',
      payment_terms: '',
      warranty_period: '',
      warranty_terms: '',
      site_id: '',
      activities: [],
      deliverables: [],
      payment_schedule: [],
    });
    setEditingContract(null);
  };

  const addActivity = () => {
    setFormData(prev => ({
      ...prev,
      activities: [...prev.activities, { description: '', amount: '' }],
    }));
  };

  const removeActivity = (index: number) => {
    setFormData(prev => ({
      ...prev,
      activities: prev.activities.filter((_, i) => i !== index),
    }));
  };

  const updateActivity = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      activities: prev.activities.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const canManage = profile?.role === 'admin' || profile?.role === 'infrastructure' || profile?.role === 'supervision';
  const canReviewLegal = profile?.role === 'admin';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#cf1b22]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#50504f]">Contratos</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Gestión de contratos de mano de obra y suministro</p>
        </div>
        {canManage && (
          <Button onClick={() => {
            resetForm();
            setShowModal(true);
          }} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            <span className="text-sm sm:text-base">Nuevo Contrato</span>
          </Button>
        )}
      </div>

      {/* Lista de contratos */}
      <div className="grid grid-cols-1 gap-4">
        {contracts.map((contract: any) => (
          <Card key={contract.id} hover>
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg text-[#50504f]">
                      {contract.contract_number}
                    </h3>
                    <Badge variant={
                      contract.status === 'active' ? 'success' :
                      contract.status === 'completed' ? 'default' :
                      contract.status === 'cancelled' ? 'danger' : 'pending'
                    }>
                      {contract.status}
                    </Badge>
                    <Badge variant="default" size="sm">
                      {CONTRACT_TYPES.find(t => t.value === contract.contract_type)?.label}
                    </Badge>
                  </div>

                  <p className="text-gray-600 text-sm mb-3">{contract.description}</p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs">Contratista</p>
                      <p className="font-medium text-[#50504f]">
                        {contract.contractor?.company_name || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Monto Total</p>
                      <p className="font-medium text-[#50504f]">
                        ${(contract.total_amount || 0).toLocaleString('es-CO')}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Fecha Inicio</p>
                      <p className="font-medium text-[#50504f]">
                        {new Date(contract.start_date).toLocaleDateString('es-CO')}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Sede</p>
                      <p className="font-medium text-[#50504f]">
                        {contract.site?.name || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {contract.activity_type && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {contract.activity_type && (
                        <Badge variant="default" size="sm">
                          {contract.activity_type}
                        </Badge>
                      )}
                      {contract.cost_center && (
                        <Badge variant="default" size="sm">
                          CC: {contract.cost_center}
                        </Badge>
                      )}
                      {contract.internal_client_type && (
                        <Badge variant="default" size="sm">
                          {contract.internal_client_type}
                        </Badge>
                      )}
                    </div>
                  )}

                  {contract.budget_control && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Control de Presupuesto</p>
                      <div className="flex items-center gap-4 text-sm">
                        <span>Total: <strong>${(contract.budget_control.total_budget || 0).toLocaleString('es-CO')}</strong></span>
                        <span>Ejecutado: <strong>${(contract.budget_control.spent || 0).toLocaleString('es-CO')}</strong></span>
                        <span>Disponible: <strong>${(contract.budget_control.remaining || 0).toLocaleString('es-CO')}</strong></span>
                      </div>
                    </div>
                  )}

                  {addendums[contract.id] && addendums[contract.id].length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-500 mb-1">Otros Sí:</p>
                      <div className="flex flex-wrap gap-2">
                        {addendums[contract.id].map((addendum) => (
                          <Badge key={addendum.id} variant="default" size="sm">
                            Otro Sí #{addendum.addendum_number}: ${(addendum.additional_amount || 0).toLocaleString('es-CO')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {contract.legal_review_status && (
                    <div className="mt-3">
                      <Badge variant={contract.legal_review_status === 'approved' ? 'success' : 'pending'} size="sm">
                        Revisión Jurídica: {contract.legal_review_status}
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {canManage && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(contract)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                  {canManage && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setSelectedContract(contract);
                        setShowAddendumModal(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Otro Sí
                    </Button>
                  )}
                  {canReviewLegal && contract.legal_review_status === 'pending' && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={async () => {
                        await supabase
                          .from('contracts')
                          .update({
                            legal_review_status: 'approved',
                            legal_reviewed_by: profile?.id,
                            legal_reviewed_at: new Date().toISOString(),
                          })
                          .eq('id', contract.id);
                        loadData();
                      }}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Aprobar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {contracts.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No hay contratos registrados</h3>
            <p className="text-gray-500 mb-4">Crea tu primer contrato para comenzar</p>
            {canManage && (
              <Button onClick={() => {
                resetForm();
                setShowModal(true);
              }}>
                <Plus className="w-5 h-5 mr-2" />
                Crear Contrato
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Modal de creación/edición */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingContract ? 'Editar Contrato' : 'Nuevo Contrato'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Tipo de Contrato"
              value={formData.contract_type}
              onChange={(e) => setFormData({ ...formData, contract_type: e.target.value as any })}
              options={CONTRACT_TYPES}
              required
              fullWidth
            />
            <Select
              label="Contratista"
              value={formData.contractor_id}
              onChange={(e) => setFormData({ ...formData, contractor_id: e.target.value })}
              options={[
                { value: '', label: 'Seleccione un contratista' },
                ...contractors.map(c => ({ value: c.id, label: c.company_name })),
              ]}
              required
              fullWidth
            />
            <Select
              label="Tipo de Actividad"
              value={formData.activity_type}
              onChange={(e) => setFormData({ ...formData, activity_type: e.target.value })}
              options={[
                { value: '', label: 'Seleccione' },
                ...ACTIVITY_TYPES.map(type => ({ value: type, label: type })),
              ]}
              fullWidth
            />
            <Input
              label="Centro de Costos"
              value={formData.cost_center}
              onChange={(e) => setFormData({ ...formData, cost_center: e.target.value })}
              fullWidth
            />
            <Select
              label="Cliente Interno"
              value={formData.internal_client_type}
              onChange={(e) => setFormData({ ...formData, internal_client_type: e.target.value })}
              options={[
                { value: '', label: 'Seleccione' },
                ...INTERNAL_CLIENT_TYPES.map(type => ({ value: type, label: type })),
              ]}
              fullWidth
            />
            <Input
              label="Nombre del Proyecto"
              value={formData.project_name}
              onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
              fullWidth
            />
            <Select
              label="Sede"
              value={formData.site_id}
              onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
              options={[
                { value: '', label: 'Seleccione una sede' },
                ...sites.map(site => ({ value: site.id, label: site.name })),
              ]}
              fullWidth
            />
            <Input
              label="Monto Total"
              type="number"
              value={formData.total_amount}
              onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
              required
              fullWidth
            />
            <Input
              label="Fecha Inicio"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              required
              fullWidth
            />
            <Input
              label="Fecha Fin"
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              fullWidth
            />
            <Input
              label="Período de Garantía (días)"
              type="number"
              value={formData.warranty_period}
              onChange={(e) => setFormData({ ...formData, warranty_period: e.target.value })}
              fullWidth
            />
          </div>

          <Textarea
            label="Descripción"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
            rows={3}
            fullWidth
          />

          <Textarea
            label="Términos de Pago"
            value={formData.payment_terms}
            onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
            rows={2}
            fullWidth
          />

          <Textarea
            label="Términos de Garantía"
            value={formData.warranty_terms}
            onChange={(e) => setFormData({ ...formData, warranty_terms: e.target.value })}
            rows={2}
            fullWidth
          />

          {/* Actividades */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-[#50504f]">Actividades del Contrato</label>
              <Button type="button" variant="ghost" size="sm" onClick={addActivity}>
                <Plus className="w-4 h-4 mr-1" />
                Agregar
              </Button>
            </div>
            {formData.activities.map((activity, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                <div className="col-span-12 sm:col-span-8">
                  <Input
                    placeholder="Descripción de la actividad"
                    value={activity.description}
                    onChange={(e) => updateActivity(index, 'description', e.target.value)}
                    fullWidth
                  />
                </div>
                <div className="col-span-8 sm:col-span-3">
                  <Input
                    type="number"
                    placeholder="Monto"
                    value={activity.amount}
                    onChange={(e) => updateActivity(index, 'amount', e.target.value)}
                    fullWidth
                  />
                </div>
                <div className="col-span-4 sm:col-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeActivity(index)}
                    className="w-full"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button type="submit">
              {editingContract ? 'Actualizar' : 'Crear'} Contrato
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Otro Sí */}
      <Modal
        isOpen={showAddendumModal}
        onClose={() => {
          setShowAddendumModal(false);
          setAddendumData({
            description: '',
            additional_amount: '',
            additional_activities: [],
          });
        }}
        title={`Otro Sí - ${selectedContract?.contract_number}`}
        size="lg"
      >
        <form onSubmit={(e) => {
          e.preventDefault();
          handleAddAddendum();
        }} className="space-y-4">
          <Textarea
            label="Descripción de las Actividades Adicionales"
            value={addendumData.description}
            onChange={(e) => setAddendumData({ ...addendumData, description: e.target.value })}
            required
            rows={3}
            fullWidth
          />

          <Input
            label="Monto Adicional"
            type="number"
            value={addendumData.additional_amount}
            onChange={(e) => setAddendumData({ ...addendumData, additional_amount: e.target.value })}
            required
            fullWidth
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowAddendumModal(false);
                setAddendumData({
                  description: '',
                  additional_amount: '',
                  additional_activities: [],
                });
              }}
            >
              Cancelar
            </Button>
            <Button type="submit">
              Crear Otro Sí
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

