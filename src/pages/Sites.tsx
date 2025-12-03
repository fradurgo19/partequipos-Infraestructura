import { useEffect, useState } from 'react';
import { 
  Plus, MapPin, Image, FileText, Edit, Trash2, Camera, 
  Building2, Droplet, Square, Network, History, 
  AlertCircle, CheckCircle, Clock, ClipboardList, TrendingUp
} from 'lucide-react';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Textarea } from '../atoms/Textarea';
import { Modal } from '../molecules/Modal';
import { FileUpload } from '../molecules/FileUpload';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Site } from '../types';

export const Sites = () => {
  const { profile } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'photos' | 'blueprints' | 'tasks' | 'stats' | 'demand'>('general');
  const [siteTasks, setSiteTasks] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    latitude: '',
    longitude: '',
    area_to_paint: '',
    bathrooms_count: '',
    walls_count: '',
    characteristics: '',
    photos_urls: [] as string[],
    blueprint_urls: [] as string[],
    network_info: '',
  });

  useEffect(() => {
    loadSites();
  }, []);

  const loadSites = async () => {
    setLoading(true);
    
    // Cargar sedes
    const { data: sitesData, error } = await supabase
      .from('sites')
      .select('*, created_by:profiles!sites_created_by_fkey(full_name)')
      .order('created_at', { ascending: false });

    if (!error && sitesData) {
      // Cargar estadísticas de tareas para cada sede
      const sitesWithStats = await Promise.all(
        sitesData.map(async (site) => {
          const { data: tasks } = await supabase
            .from('tasks')
            .select('status')
            .eq('site_id', site.id);

          const pendingTasks = tasks?.filter(t => t.status === 'pending').length || 0;
          const inProgressTasks = tasks?.filter(t => t.status === 'in_progress').length || 0;
          const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0;
          const totalTasks = tasks?.length || 0;

          return {
            ...site,
            stats: {
              pending: pendingTasks,
              inProgress: inProgressTasks,
              completed: completedTasks,
              total: totalTasks,
            },
          };
        })
      );

      setSites(sitesWithStats as any);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const coordinates = formData.latitude && formData.longitude 
      ? { lat: parseFloat(formData.latitude), lng: parseFloat(formData.longitude) }
      : null;

    const siteData = {
      name: formData.name,
      location: formData.location,
      coordinates,
      area_to_paint: formData.area_to_paint ? parseFloat(formData.area_to_paint) : null,
      bathrooms_count: formData.bathrooms_count ? parseInt(formData.bathrooms_count) : 0,
      walls_count: formData.walls_count ? parseInt(formData.walls_count) : 0,
      characteristics: formData.characteristics,
      photos_urls: formData.photos_urls,
      blueprint_urls: formData.blueprint_urls,
      network_info: formData.network_info ? JSON.parse(formData.network_info) : null,
      created_by: profile.id,
    };

    if (editingSite) {
      const { error } = await supabase
        .from('sites')
        .update(siteData)
        .eq('id', editingSite.id);

      if (!error) {
        setShowModal(false);
        resetForm();
        loadSites();
      }
    } else {
      const { error } = await supabase.from('sites').insert([siteData]);

      if (!error) {
        setShowModal(false);
        resetForm();
        loadSites();
      }
    }
  };

  const handleEdit = (site: Site) => {
    setEditingSite(site);
    setFormData({
      name: site.name,
      location: site.location,
      latitude: site.coordinates?.lat?.toString() || '',
      longitude: site.coordinates?.lng?.toString() || '',
      area_to_paint: site.area_to_paint?.toString() || '',
      bathrooms_count: site.bathrooms_count?.toString() || '',
      walls_count: site.walls_count?.toString() || '',
      characteristics: site.characteristics || '',
      photos_urls: site.photos_urls || [],
      blueprint_urls: site.blueprint_urls || [],
      network_info: site.network_info ? JSON.stringify(site.network_info, null, 2) : '',
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      location: '',
      latitude: '',
      longitude: '',
      area_to_paint: '',
      bathrooms_count: '',
      walls_count: '',
      characteristics: '',
      photos_urls: [],
      blueprint_urls: [],
      network_info: '',
    });
    setEditingSite(null);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta sede?')) {
      const { error } = await supabase.from('sites').delete().eq('id', id);

      if (!error) {
        loadSites();
      }
    }
  };

  const handleViewDetails = async (site: Site) => {
    setSelectedSite(site);
    setShowDetailModal(true);
    setActiveTab('general');
    
    // Cargar tareas de la sede
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*, requester:profiles!tasks_requester_id_fkey(full_name), assignee:profiles!tasks_assignee_id_fkey(full_name)')
      .eq('site_id', site.id)
      .order('created_at', { ascending: false });
    
    if (tasks) {
      setSiteTasks(tasks);
    }
  };

  const canManage = profile?.role === 'admin' || profile?.role === 'infrastructure';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#cf1b22]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#50504f]">Sites & Projects</h1>
          <p className="text-gray-600 mt-1">Manage locations and project details</p>
        </div>
        {canManage && (
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-5 h-5 mr-2" />
            Add Site
          </Button>
        )}
      </div>

      {/* Grid de Sedes - 4 por fila */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {sites.map((site: any) => (
          <Card key={site.id} className="hover:shadow-xl transition-all duration-300 border-l-4 border-[#cf1b22]">
            <div className="space-y-4">
              {/* Header con acciones */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-[#50504f] mb-1 line-clamp-2">
                    {site.name}
                  </h3>
                  <div className="flex items-center text-sm text-gray-600 gap-1">
                    <MapPin className="w-4 h-4 text-[#cf1b22]" />
                    <span className="line-clamp-1">{site.location}</span>
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(site)}
                      className="p-1.5 text-gray-400 hover:text-[#cf1b22] hover:bg-red-50 rounded transition-all"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(site.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Estadísticas de Tareas con colores */}
              <div className="grid grid-cols-3 gap-2 py-3 border-t border-b border-gray-100">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-xs text-gray-500">Pendientes</span>
                  </div>
                  <p className="text-xl font-bold text-red-500">{site.stats?.pending || 0}</p>
                </div>
                <div className="text-center border-l border-r border-gray-100">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="text-xs text-gray-500">En Proceso</span>
                  </div>
                  <p className="text-xl font-bold text-orange-500">{site.stats?.inProgress || 0}</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-gray-500">Completadas</span>
                  </div>
                  <p className="text-xl font-bold text-green-500">{site.stats?.completed || 0}</p>
                </div>
              </div>

              {/* Información de la sede */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                  <Square className="w-4 h-4 text-[#cf1b22]" />
                  <div>
                    <p className="text-gray-500">Área Pintar</p>
                    <p className="font-semibold text-[#50504f]">{site.area_to_paint || 0} m²</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                  <Droplet className="w-4 h-4 text-blue-500" />
                  <div>
                    <p className="text-gray-500">Baños</p>
                    <p className="font-semibold text-[#50504f]">{site.bathrooms_count || 0}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                  <Building2 className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-gray-500">Paredes</p>
                    <p className="font-semibold text-[#50504f]">{site.walls_count || 0}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                  <Camera className="w-4 h-4 text-purple-500" />
                  <div>
                    <p className="text-gray-500">Fotos</p>
                    <p className="font-semibold text-[#50504f]">{site.photos_urls?.length || 0}</p>
                  </div>
                </div>
              </div>

              {/* Botón Ver Detalles */}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleViewDetails(site)}
                className="w-full border-[#cf1b22] text-[#cf1b22] hover:bg-[#cf1b22] hover:text-white"
              >
                <FileText className="w-4 h-4 mr-2" />
                Ver Detalles Completos
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {sites.length === 0 && !loading && (
        <Card>
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No hay sedes registradas</h3>
            <p className="text-gray-500 mb-4">Comienza agregando tu primera sede</p>
            {canManage && (
              <Button onClick={() => setShowModal(true)}>
                <Plus className="w-5 h-5 mr-2" />
                Agregar Sede
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Modal Formulario Crear/Editar Sede */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingSite ? 'Editar Sede' : 'Agregar Nueva Sede'}
      >
        <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
          {/* Información General */}
          <div className="space-y-4">
            <h3 className="font-semibold text-[#cf1b22] flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Información General
            </h3>
            
            <Input
              label="Nombre de la Sede *"
              placeholder="Ej: Sede Principal Bogotá"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
            />

            <Textarea
              label="Ubicación/Dirección *"
              placeholder="Dirección completa de la sede"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              fullWidth
              required
              rows={2}
            />

            <Textarea
              label="Características"
              placeholder="Describe las características generales de la sede"
              value={formData.characteristics}
              onChange={(e) => setFormData({ ...formData, characteristics: e.target.value })}
              fullWidth
              rows={3}
            />
          </div>

          {/* Coordenadas */}
          <div className="space-y-4">
            <h3 className="font-semibold text-[#cf1b22] flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Coordenadas GPS
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Latitud"
                type="number"
                step="any"
                placeholder="4.6097100"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                fullWidth
              />
              <Input
                label="Longitud"
                type="number"
                step="any"
                placeholder="-74.0817500"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                fullWidth
              />
            </div>
          </div>

          {/* Métricas */}
          <div className="space-y-4">
            <h3 className="font-semibold text-[#cf1b22] flex items-center gap-2">
              <Square className="w-5 h-5" />
              Métricas de la Sede
            </h3>
            
            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Área a Pintar (m²)"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.area_to_paint}
                onChange={(e) => setFormData({ ...formData, area_to_paint: e.target.value })}
                fullWidth
              />
              <Input
                label="Cantidad de Baños"
                type="number"
                placeholder="0"
                value={formData.bathrooms_count}
                onChange={(e) => setFormData({ ...formData, bathrooms_count: e.target.value })}
                fullWidth
              />
              <Input
                label="Cantidad de Paredes"
                type="number"
                placeholder="0"
                value={formData.walls_count}
                onChange={(e) => setFormData({ ...formData, walls_count: e.target.value })}
                fullWidth
              />
            </div>
          </div>

          {/* Información de Redes */}
          <div className="space-y-4">
            <h3 className="font-semibold text-[#cf1b22] flex items-center gap-2">
              <Network className="w-5 h-5" />
              Información de Redes (Opcional)
            </h3>
            
            <Textarea
              label="Descripción de ubicación de redes"
              placeholder="Describe por dónde van las redes eléctricas, hidráulicas, etc."
              value={formData.network_info}
              onChange={(e) => setFormData({ ...formData, network_info: e.target.value })}
              fullWidth
              rows={3}
            />
            <p className="text-xs text-gray-500">
              💡 Tip: Describe claramente la ubicación de redes para facilitar futuras intervenciones
            </p>
          </div>

          {/* Fotografías */}
          <div className="space-y-4">
            <h3 className="font-semibold text-[#cf1b22] flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Fotografías de la Sede
            </h3>
            
            <FileUpload
              onFileSelected={(url) => {
                setFormData({ 
                  ...formData, 
                  photos_urls: [...formData.photos_urls, url] 
                });
              }}
              accept="image/*"
              label="Subir fotos de la sede"
            />
            
            {formData.photos_urls.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {formData.photos_urls.map((url, idx) => (
                  <div key={idx} className="relative group">
                    <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-24 object-cover rounded" />
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          photos_urls: formData.photos_urls.filter((_, i) => i !== idx),
                        });
                      }}
                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Planos */}
          <div className="space-y-4">
            <h3 className="font-semibold text-[#cf1b22] flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Planos de la Sede
            </h3>
            
            <FileUpload
              onFileSelected={(url) => {
                setFormData({ 
                  ...formData, 
                  blueprint_urls: [...formData.blueprint_urls, url] 
                });
              }}
              accept="image/*,application/pdf"
              label="Subir planos (PDF o imágenes)"
            />
            
            {formData.blueprint_urls.length > 0 && (
              <div className="space-y-2">
                {formData.blueprint_urls.map((url, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span className="text-sm truncate flex-1">{url.split('/').pop()}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          blueprint_urls: formData.blueprint_urls.filter((_, i) => i !== idx),
                        });
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="ghost"
              fullWidth
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" fullWidth className="bg-[#cf1b22] hover:bg-[#a0151a]">
              {editingSite ? 'Actualizar Sede' : 'Crear Sede'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Detalles Completos */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedSite(null);
        }}
        title={`Detalles de ${selectedSite?.name || 'Sede'}`}
      >
        {selectedSite && (
          <div className="space-y-6">
            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
              <button
                onClick={() => setActiveTab('general')}
                className={`px-4 py-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === 'general'
                    ? 'border-b-2 border-[#cf1b22] text-[#cf1b22]'
                    : 'text-gray-600 hover:text-[#50504f]'
                }`}
              >
                <Building2 className="w-4 h-4 inline mr-1" />
                General
              </button>
              <button
                onClick={() => setActiveTab('photos')}
                className={`px-4 py-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === 'photos'
                    ? 'border-b-2 border-[#cf1b22] text-[#cf1b22]'
                    : 'text-gray-600 hover:text-[#50504f]'
                }`}
              >
                <Camera className="w-4 h-4 inline mr-1" />
                Fotos ({selectedSite.photos_urls?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('blueprints')}
                className={`px-4 py-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === 'blueprints'
                    ? 'border-b-2 border-[#cf1b22] text-[#cf1b22]'
                    : 'text-gray-600 hover:text-[#50504f]'
                }`}
              >
                <FileText className="w-4 h-4 inline mr-1" />
                Planos ({selectedSite.blueprint_urls?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('tasks')}
                className={`px-4 py-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === 'tasks'
                    ? 'border-b-2 border-[#cf1b22] text-[#cf1b22]'
                    : 'text-gray-600 hover:text-[#50504f]'
                }`}
              >
                <ClipboardList className="w-4 h-4 inline mr-1" />
                Tareas ({selectedSite.stats?.total || 0})
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`px-4 py-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === 'stats'
                    ? 'border-b-2 border-[#cf1b22] text-[#cf1b22]'
                    : 'text-gray-600 hover:text-[#50504f]'
                }`}
              >
                <History className="w-4 h-4 inline mr-1" />
                Estadísticas
              </button>
              <button
                onClick={() => setActiveTab('demand')}
                className={`px-4 py-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === 'demand'
                    ? 'border-b-2 border-[#cf1b22] text-[#cf1b22]'
                    : 'text-gray-600 hover:text-[#50504f]'
                }`}
              >
                <TrendingUp className="w-4 h-4 inline mr-1" />
                Análisis de Demanda
              </button>
            </div>

            {/* Contenido de Tabs */}
            <div className="max-h-[60vh] overflow-y-auto">
              {/* Tab: General */}
              {activeTab === 'general' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white border border-gray-200 p-4 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Nombre</p>
                      <p className="font-semibold text-[#50504f]">{selectedSite.name}</p>
                    </div>
                    <div className="bg-white border border-gray-200 p-4 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Ubicación</p>
                      <p className="font-semibold text-[#50504f]">{selectedSite.location}</p>
                    </div>
                  </div>

                  {selectedSite.characteristics && (
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                      <p className="text-xs text-blue-700 font-medium mb-2">CARACTERÍSTICAS</p>
                      <p className="text-sm text-[#50504f]">{selectedSite.characteristics}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-red-50 to-white border border-red-200 p-4 rounded-lg text-center">
                      <Square className="w-6 h-6 text-[#cf1b22] mx-auto mb-2" />
                      <p className="text-xs text-gray-500 mb-1">Área a Pintar</p>
                      <p className="text-2xl font-bold text-[#cf1b22]">{selectedSite.area_to_paint || 0}</p>
                      <p className="text-xs text-gray-500">m²</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-200 p-4 rounded-lg text-center">
                      <Droplet className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                      <p className="text-xs text-gray-500 mb-1">Baños</p>
                      <p className="text-2xl font-bold text-blue-600">{selectedSite.bathrooms_count || 0}</p>
                    </div>
                    <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 p-4 rounded-lg text-center">
                      <Building2 className="w-6 h-6 text-[#50504f] mx-auto mb-2" />
                      <p className="text-xs text-gray-500 mb-1">Paredes</p>
                      <p className="text-2xl font-bold text-[#50504f]">{selectedSite.walls_count || 0}</p>
                    </div>
                  </div>

                  {selectedSite.network_info && (
                    <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Network className="w-5 h-5 text-purple-600" />
                        <p className="text-sm text-purple-700 font-medium">INFORMACIÓN DE REDES</p>
                      </div>
                      <p className="text-sm text-[#50504f] whitespace-pre-line">{selectedSite.network_info}</p>
                    </div>
                  )}

                  {selectedSite.coordinates && (
                    <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-5 h-5 text-green-600" />
                        <p className="text-sm text-green-700 font-medium">COORDENADAS GPS</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Latitud:</p>
                          <p className="font-mono font-semibold text-[#50504f]">{selectedSite.coordinates.lat}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Longitud:</p>
                          <p className="font-mono font-semibold text-[#50504f]">{selectedSite.coordinates.lng}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Fotos */}
              {activeTab === 'photos' && (
                <div className="space-y-4">
                  {selectedSite.photos_urls && selectedSite.photos_urls.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      {selectedSite.photos_urls.map((url, idx) => (
                        <div key={idx} className="relative group">
                          <img 
                            src={url} 
                            alt={`Foto ${idx + 1}`} 
                            className="w-full h-48 object-cover rounded-lg border-2 border-gray-200 hover:border-[#cf1b22] transition-colors cursor-pointer"
                            onClick={() => window.open(url, '_blank')}
                          />
                          <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                            Foto {idx + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <Camera className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500">No hay fotografías disponibles</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Planos */}
              {activeTab === 'blueprints' && (
                <div className="space-y-4">
                  {selectedSite.blueprint_urls && selectedSite.blueprint_urls.length > 0 ? (
                    <div className="space-y-3">
                      {selectedSite.blueprint_urls.map((url, idx) => (
                        <div 
                          key={idx} 
                          className="flex items-center justify-between bg-white border-2 border-gray-200 hover:border-[#cf1b22] p-4 rounded-lg cursor-pointer transition-colors group"
                          onClick={() => window.open(url, '_blank')}
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="w-8 h-8 text-[#cf1b22]" />
                            <div>
                              <p className="font-semibold text-[#50504f]">Plano {idx + 1}</p>
                              <p className="text-xs text-gray-500">{url.split('/').pop()}</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                            Ver
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500">No hay planos disponibles</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Tareas de la Sede */}
              {activeTab === 'tasks' && (
                <div className="space-y-4">
                  {siteTasks.length > 0 ? (
                    <div className="space-y-3">
                      {siteTasks.map((task: any) => (
                        <div 
                          key={task.id} 
                          className={`border-l-4 p-4 rounded-lg bg-white shadow-sm ${
                            task.status === 'pending' ? 'border-red-500' :
                            task.status === 'in_progress' ? 'border-orange-500' :
                            'border-green-500'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-bold text-[#50504f] mb-1">{task.title}</h4>
                              <p className="text-sm text-gray-600 line-clamp-2">{task.description}</p>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              task.status === 'pending' ? 'bg-red-100 text-red-700' :
                              task.status === 'in_progress' ? 'bg-orange-100 text-orange-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {task.status === 'pending' ? '🔴 Pendiente' :
                               task.status === 'in_progress' ? '🟠 En Proceso' :
                               '🟢 Completada'}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                            <div>
                              <p className="text-gray-500 text-xs">Tipo</p>
                              <p className="font-medium text-[#50504f]">{task.task_type}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs">Área Solicitante</p>
                              <p className="font-medium text-[#50504f]">{task.requesting_area}</p>
                            </div>
                            {task.budget_amount && (
                              <div>
                                <p className="text-gray-500 text-xs">Presupuesto</p>
                                <p className="font-semibold text-[#cf1b22]">
                                  ${new Intl.NumberFormat('es-CO').format(task.budget_amount)}
                                </p>
                              </div>
                            )}
                            <div>
                              <p className="text-gray-500 text-xs">Asignada a</p>
                              <p className="font-medium text-[#50504f]">{task.assignee?.full_name || 'Sin asignar'}</p>
                            </div>
                          </div>

                          {/* Fotos de la tarea */}
                          {task.photo_urls && task.photo_urls.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs text-gray-500 mb-2 font-medium">📸 Fotos de la Tarea</p>
                              <div className="grid grid-cols-4 gap-2">
                                {task.photo_urls.slice(0, 4).map((url: string, idx: number) => (
                                  <img
                                    key={idx}
                                    src={url}
                                    alt={`Foto tarea ${idx + 1}`}
                                    className="w-full h-20 object-cover rounded border-2 border-gray-200 hover:border-[#cf1b22] cursor-pointer transition-colors"
                                    onClick={() => window.open(url, '_blank')}
                                  />
                                ))}
                              </div>
                              {task.photo_urls.length > 4 && (
                                <p className="text-xs text-gray-500 mt-1">
                                  +{task.photo_urls.length - 4} fotos más
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500">No hay tareas registradas en esta sede</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Estadísticas */}
              {activeTab === 'stats' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-[#50504f] mb-4">Tareas por Estado</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-gradient-to-br from-red-50 to-white border-2 border-red-200 p-6 rounded-lg text-center">
                        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                        <p className="text-3xl font-bold text-red-500 mb-1">{selectedSite.stats?.pending || 0}</p>
                        <p className="text-sm font-medium text-gray-600">Tareas Pendientes</p>
                        <div className="mt-2 w-full bg-red-200 rounded-full h-2">
                          <div 
                            className="bg-red-500 h-2 rounded-full transition-all" 
                            style={{ width: `${((selectedSite.stats?.pending || 0) / (selectedSite.stats?.total || 1)) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-orange-50 to-white border-2 border-orange-200 p-6 rounded-lg text-center">
                        <Clock className="w-10 h-10 text-orange-500 mx-auto mb-3" />
                        <p className="text-3xl font-bold text-orange-500 mb-1">{selectedSite.stats?.inProgress || 0}</p>
                        <p className="text-sm font-medium text-gray-600">En Proceso</p>
                        <div className="mt-2 w-full bg-orange-200 rounded-full h-2">
                          <div 
                            className="bg-orange-500 h-2 rounded-full transition-all" 
                            style={{ width: `${((selectedSite.stats?.inProgress || 0) / (selectedSite.stats?.total || 1)) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-white border-2 border-green-200 p-6 rounded-lg text-center">
                        <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
                        <p className="text-3xl font-bold text-green-500 mb-1">{selectedSite.stats?.completed || 0}</p>
                        <p className="text-sm font-medium text-gray-600">Completadas</p>
                        <div className="mt-2 w-full bg-green-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full transition-all" 
                            style={{ width: `${((selectedSite.stats?.completed || 0) / (selectedSite.stats?.total || 1)) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-[#cf1b22] to-[#a0151a] text-white p-6 rounded-lg">
                    <h4 className="font-bold text-lg mb-2">Total de Tareas</h4>
                    <p className="text-5xl font-bold">{selectedSite.stats?.total || 0}</p>
                    <p className="text-sm opacity-90 mt-2">Tareas registradas en esta sede</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white border border-gray-200 p-4 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Creado por</p>
                      <p className="font-semibold text-[#50504f]">{selectedSite.created_by?.full_name || 'N/A'}</p>
                    </div>
                    <div className="bg-white border border-gray-200 p-4 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Fecha de Creación</p>
                      <p className="font-semibold text-[#50504f]">
                        {new Date(selectedSite.created_at).toLocaleDateString('es-CO')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Análisis de Demanda */}
              {activeTab === 'demand' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-[#50504f] mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-[#cf1b22]" />
                      Mayor Demanda de Solicitudes
                    </h4>
                    
                    {(() => {
                      // Análisis de tipos de tareas más solicitadas
                      const tasksByType = siteTasks.reduce((acc: any, task) => {
                        acc[task.task_type] = (acc[task.task_type] || 0) + 1;
                        return acc;
                      }, {});

                      const sortedTypes = Object.entries(tasksByType)
                        .sort((a: any, b: any) => b[1] - a[1])
                        .slice(0, 5);

                      return sortedTypes.length > 0 ? (
                        <div className="space-y-3">
                          {sortedTypes.map(([type, count]: any, idx) => (
                            <div key={type} className="bg-white border border-gray-200 p-4 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                                    idx === 0 ? 'bg-[#cf1b22]' :
                                    idx === 1 ? 'bg-orange-500' :
                                    idx === 2 ? 'bg-yellow-500' :
                                    'bg-gray-400'
                                  }`}>
                                    {idx + 1}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-[#50504f]">{type}</p>
                                    <p className="text-xs text-gray-500">Tipo de tarea</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-2xl font-bold text-[#cf1b22]">{count}</p>
                                  <p className="text-xs text-gray-500">solicitudes</p>
                                </div>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                <div 
                                  className="bg-[#cf1b22] h-2 rounded-full transition-all" 
                                  style={{ width: `${(count / siteTasks.length) * 100}%` }}
                                ></div>
                              </div>
                              <p className="text-xs text-gray-500 mt-1 text-right">
                                {((count / siteTasks.length) * 100).toFixed(1)}% del total
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                          <p className="text-gray-500">No hay datos suficientes para análisis</p>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Análisis por área solicitante */}
                  <div>
                    <h4 className="font-semibold text-[#50504f] mb-4">Solicitudes por Área</h4>
                    {(() => {
                      const tasksByArea = siteTasks.reduce((acc: any, task) => {
                        acc[task.requesting_area] = (acc[task.requesting_area] || 0) + 1;
                        return acc;
                      }, {});

                      const sortedAreas = Object.entries(tasksByArea)
                        .sort((a: any, b: any) => b[1] - a[1]);

                      return sortedAreas.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3">
                          {sortedAreas.map(([area, count]: any) => (
                            <div key={area} className="bg-gradient-to-br from-blue-50 to-white border border-blue-200 p-4 rounded-lg text-center">
                              <p className="text-2xl font-bold text-blue-600">{count}</p>
                              <p className="text-sm font-medium text-[#50504f] mt-1">{area}</p>
                            </div>
                          ))}
                        </div>
                      ) : null;
                    })()}
                  </div>

                  {/* Resumen general */}
                  <div className="bg-gradient-to-r from-[#cf1b22] to-[#a0151a] text-white p-6 rounded-lg">
                    <h4 className="font-bold text-lg mb-4">📊 Resumen de Demanda</h4>
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <p className="text-3xl font-bold">{siteTasks.length}</p>
                        <p className="text-sm opacity-90">Total Solicitudes</p>
                      </div>
                      <div>
                        <p className="text-3xl font-bold">
                          {siteTasks.filter(t => t.status === 'pending').length}
                        </p>
                        <p className="text-sm opacity-90">Solicitudes Activas</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
