import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Building2, Mail, Phone, MapPin, Globe, FileText } from 'lucide-react';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Textarea } from '../atoms/Textarea';
import { Modal } from '../molecules/Modal';
import { Badge } from '../atoms/Badge';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Contractor } from '../types';

const SPECIALTIES = [
  'Pintura',
  'Plomería',
  'Electricidad',
  'Carpintería',
  'Albañilería',
  'Limpieza',
  'Mantenimiento',
  'Reparación',
  'Instalación',
  'Demolición',
  'Impermeabilización',
  'Acabados',
  'Construcción',
  'Diseño',
  'Otro'
];

export const Contractors = () => {
  const { profile } = useAuth();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    specialty: [] as string[],
    rating: '',
    nit: '',
    address: '',
    city: '',
    country: 'Colombia',
    website: '',
    tax_id: '',
    bank_account: '',
    bank_name: '',
    notes: '',
    is_active: true,
  });

  useEffect(() => {
    loadContractors();
  }, []);

  const loadContractors = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('contractors')
      .select('*')
      .order('company_name');

    if (!error && data) {
      setContractors(data as Contractor[]);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const contractorData = {
      ...formData,
      rating: formData.rating ? parseFloat(formData.rating) : null,
      is_active: formData.is_active,
    };

    if (editingContractor) {
      const { error } = await supabase
        .from('contractors')
        .update(contractorData)
        .eq('id', editingContractor.id);

      if (!error) {
        setShowModal(false);
        resetForm();
        loadContractors();
      }
    } else {
      const { error } = await supabase.from('contractors').insert([contractorData]);

      if (!error) {
        setShowModal(false);
        resetForm();
        loadContractors();
      }
    }
  };

  const handleEdit = (contractor: Contractor) => {
    setEditingContractor(contractor);
    setFormData({
      company_name: contractor.company_name,
      contact_name: contractor.contact_name,
      email: contractor.email,
      phone: contractor.phone,
      specialty: contractor.specialty || [],
      rating: contractor.rating?.toString() || '',
      nit: contractor.nit || '',
      address: contractor.address || '',
      city: contractor.city || '',
      country: contractor.country || 'Colombia',
      website: contractor.website || '',
      tax_id: contractor.tax_id || '',
      bank_account: contractor.bank_account || '',
      bank_name: contractor.bank_name || '',
      notes: contractor.notes || '',
      is_active: contractor.is_active !== false,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este contratista?')) {
      const { error } = await supabase.from('contractors').delete().eq('id', id);

      if (!error) {
        loadContractors();
      }
    }
  };

  const resetForm = () => {
    setFormData({
      company_name: '',
      contact_name: '',
      email: '',
      phone: '',
      specialty: [],
      rating: '',
      nit: '',
      address: '',
      city: '',
      country: 'Colombia',
      website: '',
      tax_id: '',
      bank_account: '',
      bank_name: '',
      notes: '',
      is_active: true,
    });
    setEditingContractor(null);
  };

  const toggleSpecialty = (specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialty: prev.specialty.includes(specialty)
        ? prev.specialty.filter(s => s !== specialty)
        : [...prev.specialty, specialty],
    }));
  };

  const canManage = profile?.role === 'admin' || profile?.role === 'infrastructure' || profile?.role === 'supervision';

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
          <h1 className="text-2xl sm:text-3xl font-bold text-[#50504f]">Contratistas</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Base de datos de contratistas con información completa</p>
        </div>
        {canManage && (
          <Button onClick={() => {
            resetForm();
            setShowModal(true);
          }} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            <span className="text-sm sm:text-base">Nuevo Contratista</span>
          </Button>
        )}
      </div>

      {/* Lista de contratistas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
        {contractors.map((contractor) => (
          <Card key={contractor.id} hover className="border-l-4 border-blue-500">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold text-lg text-[#50504f]">{contractor.company_name}</h3>
                    {contractor.is_active === false && (
                      <Badge variant="default" size="sm">Inactivo</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{contractor.contact_name}</p>
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(contractor)}
                      className="p-1.5 text-gray-400 hover:text-[#cf1b22] hover:bg-red-50 rounded transition-all"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(contractor.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="w-4 h-4 text-[#cf1b22]" />
                  <span className="truncate">{contractor.email}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-4 h-4 text-[#cf1b22]" />
                  <span>{contractor.phone}</span>
                </div>
                {contractor.nit && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <FileText className="w-4 h-4 text-[#cf1b22]" />
                    <span>NIT: {contractor.nit}</span>
                  </div>
                )}
                {contractor.address && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-4 h-4 text-[#cf1b22]" />
                    <span className="truncate">{contractor.address}</span>
                  </div>
                )}
                {contractor.city && (
                  <p className="text-xs text-gray-500">{contractor.city}, {contractor.country || 'Colombia'}</p>
                )}
                {contractor.rating && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">Calificación:</span>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={i < contractor.rating! ? 'text-yellow-400' : 'text-gray-300'}>
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {contractor.specialty && contractor.specialty.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-2 border-t border-gray-200">
                  {contractor.specialty.map((spec, idx) => (
                    <Badge key={idx} variant="default" size="sm">
                      {spec}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {contractors.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No hay contratistas registrados</h3>
            <p className="text-gray-500 mb-4">Agrega tu primer contratista para comenzar</p>
            {canManage && (
              <Button onClick={() => {
                resetForm();
                setShowModal(true);
              }}>
                <Plus className="w-5 h-5 mr-2" />
                Agregar Contratista
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
        title={editingContractor ? 'Editar Contratista' : 'Nuevo Contratista'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Razón Social"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              required
              fullWidth
            />
            <Input
              label="Nombre de Contacto"
              value={formData.contact_name}
              onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
              required
              fullWidth
            />
            <Input
              label="NIT"
              value={formData.nit}
              onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
              fullWidth
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              fullWidth
            />
            <Input
              label="Teléfono"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
              fullWidth
            />
            <Input
              label="Dirección"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              fullWidth
            />
            <Input
              label="Ciudad"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              fullWidth
            />
            <Input
              label="País"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              fullWidth
            />
            <Input
              label="Sitio Web"
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              fullWidth
            />
            <Input
              label="ID Tributario Adicional"
              value={formData.tax_id}
              onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
              fullWidth
            />
            <Input
              label="Cuenta Bancaria"
              value={formData.bank_account}
              onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
              fullWidth
            />
            <Input
              label="Banco"
              value={formData.bank_name}
              onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
              fullWidth
            />
            <Input
              label="Calificación (0-5)"
              type="number"
              min="0"
              max="5"
              step="0.1"
              value={formData.rating}
              onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
              fullWidth
            />
          </div>

          {/* Especialidades */}
          <div>
            <label className="block text-sm font-medium text-[#50504f] mb-2">Especialidades</label>
            <div className="flex flex-wrap gap-2">
              {SPECIALTIES.map((spec) => (
                <button
                  key={spec}
                  type="button"
                  onClick={() => toggleSpecialty(spec)}
                  className={`px-3 py-1 rounded-lg text-sm transition-all ${
                    formData.specialty.includes(spec)
                      ? 'bg-[#cf1b22] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {spec}
                </button>
              ))}
            </div>
          </div>

          <Textarea
            label="Notas"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            fullWidth
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-[#cf1b22] border-gray-300 rounded focus:ring-[#cf1b22]"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700">
              Contratista activo
            </label>
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
              {editingContractor ? 'Actualizar' : 'Crear'} Contratista
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

