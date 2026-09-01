import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, TrendingUp, MapPin, DollarSign, Calendar, FilterX } from 'lucide-react';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { Select } from '../atoms/Select';
import { Modal } from '../molecules/Modal';
import { Badge } from '../atoms/Badge';
import { ImageLightbox } from '../molecules/ImageLightbox';
import { InternalRequestForm } from '../organisms/InternalRequestForm';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { InternalRequest, Site } from '../types';
import { createEmptyInternalRequestForm } from '../types/internalRequestForm';

interface Indicators {
  requestsBySite: Array<{ site_name: string; count: number }>;
  investmentBySite: Array<{ site_name: string; amount: number }>;
  totalRequests: number;
  totalInvestment: number;
}

type InternalRequestWithRelations = InternalRequest & {
  site?: { id?: string; name: string; location?: string; city?: string };
  task?: { id?: string; title: string; status?: string; budget_amount?: number };
  requester?: { id?: string; full_name: string };
};

const buildIndicators = (requestsData: InternalRequestWithRelations[]): Indicators => {
  const requestsBySiteMap = new Map<string, number>();
  const investmentBySiteMap = new Map<string, number>();

  requestsData.forEach((request) => {
    if (request.site?.name) {
      const siteName = request.site.name;
      requestsBySiteMap.set(siteName, (requestsBySiteMap.get(siteName) || 0) + 1);

      if (request.task?.budget_amount) {
        investmentBySiteMap.set(
          siteName,
          (investmentBySiteMap.get(siteName) || 0) + (request.task.budget_amount || 0)
        );
      }
    }
  });

  const requestsBySite = Array.from(requestsBySiteMap.entries()).map(([site_name, count]) => ({
    site_name,
    count,
  }));

  const investmentBySite = Array.from(investmentBySiteMap.entries()).map(([site_name, amount]) => ({
    site_name,
    amount,
  }));

  const totalInvestment = Array.from(investmentBySiteMap.values()).reduce((sum, amount) => sum + amount, 0);

  return {
    requestsBySite,
    investmentBySite,
    totalRequests: requestsData.length,
    totalInvestment,
  };
};

const isImageUrl = (url: string): boolean => /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i.test(url);

interface RequestAttachmentsGalleryProps {
  photoUrls?: string[];
  designUrls?: string[];
  onPreview: (url: string) => void;
}

const RequestAttachmentsGallery: React.FC<RequestAttachmentsGalleryProps> = ({
  photoUrls = [],
  designUrls = [],
  onPreview,
}) => {
  const attachments = [...photoUrls, ...designUrls];
  if (attachments.length === 0) return null;

  return (
    <div className="mt-3">
      <p className="text-gray-500 text-xs mb-2">Adjuntos ({attachments.length})</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {attachments.map((url) => (
          <button
            key={url}
            type="button"
            onClick={() => onPreview(url)}
            className="group relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50 hover:border-[#cf1b22] focus:outline-none focus:ring-2 focus:ring-[#cf1b22]"
            title="Ampliar adjunto"
          >
            {isImageUrl(url) ? (
              <img src={url} alt="" className="w-full h-24 sm:h-28 object-cover" />
            ) : (
              <div className="flex items-center justify-center h-24 sm:h-28 p-2 text-xs text-[#50504f]">
                Ver archivo
              </div>
            )}
            <span className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
};

export const InternalRequests = () => {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<InternalRequestWithRelations[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [cityFilter, setCityFilter] = useState('all');
  const [siteFilter, setSiteFilter] = useState('all');
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState(() =>
    createEmptyInternalRequestForm({
      department: profile?.department || '',
      requester_name: profile?.full_name || '',
    })
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    const [requestsResult, sitesResult] = await Promise.all([
      supabase
        .from('internal_requests')
        .select('*, site:sites(id, name, location, city), task:tasks(id, title, status), requester:profiles!internal_requests_created_by_fkey(id, full_name)')
        .order('created_at', { ascending: false }),
      supabase.from('sites').select('*').order('name'),
    ]);

    if (!requestsResult.error && requestsResult.data) {
      setRequests(requestsResult.data as InternalRequestWithRelations[]);
    }
    if (!sitesResult.error && sitesResult.data) {
      setSites(sitesResult.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openNewRequestModal = () => {
    setFormData((prev) => ({
      ...prev,
      requester_name: profile?.full_name || prev.requester_name || '',
    }));
    setShowModal(true);
  };

  const cityOptions = useMemo(() => {
    const cities = sites
      .map((site) => site.city?.trim())
      .filter((city): city is string => Boolean(city));
    return [...new Set(cities)].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  }, [sites]);

  const siteFilterOptions = useMemo(() => {
    const scopedSites =
      cityFilter === 'all' ? sites : sites.filter((site) => site.city?.trim() === cityFilter);
    return [...scopedSites].sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
  }, [sites, cityFilter]);

  const filteredRequests = useMemo(
    () =>
      requests.filter((request) => {
        if (siteFilter !== 'all' && request.site_id !== siteFilter) {
          return false;
        }
        if (cityFilter !== 'all') {
          const requestCity =
            request.site?.city?.trim() ||
            sites.find((site) => site.id === request.site_id)?.city?.trim();
          if (requestCity !== cityFilter) {
            return false;
          }
        }
        return true;
      }),
    [requests, siteFilter, cityFilter, sites]
  );

  const indicators = useMemo(() => buildIndicators(filteredRequests), [filteredRequests]);

  const filtersActive = cityFilter !== 'all' || siteFilter !== 'all';

  const handleCityFilterChange = (value: string) => {
    setCityFilter(value);
    if (siteFilter === 'all') return;

    const selectedSite = sites.find((site) => site.id === siteFilter);
    if (value !== 'all' && selectedSite?.city?.trim() !== value) {
      setSiteFilter('all');
    }
  };

  const handleClearFilters = () => {
    setCityFilter('all');
    setSiteFilter('all');
  };

  const handlePreviewAttachment = (url: string) => {
    if (isImageUrl(url)) {
      setPreviewImageUrl(url);
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const requesterName = formData.requester_name.trim();
    if (!requesterName) {
      alert('Ingrese el nombre de quien solicita');
      return;
    }

    const requestDate = formData.request_date || new Date().toISOString().split('T')[0];

    const requestData: Record<string, unknown> = {
      title: formData.title,
      description: formData.description,
      department: formData.department,
      site_id: formData.site_id || null,
      request_date: requestDate,
      requester_name: requesterName,
      photo_urls: formData.photo_urls,
      measurement_length: formData.measurement_length ? Number.parseFloat(formData.measurement_length) : null,
      measurement_height: formData.measurement_height ? Number.parseFloat(formData.measurement_height) : null,
      measurement_depth: formData.measurement_depth ? Number.parseFloat(formData.measurement_depth) : null,
      design_urls: formData.design_urls,
      created_by: profile.id,
      status: 'pending',
    };

    // Agregar requester_id si existe la columna
    if (profile.id) {
      requestData.requester_id = profile.id;
    }

    const { data: insertedRequest, error: requestError } = await supabase
      .from('internal_requests')
      .insert([requestData])
      .select()
      .single();

    if (requestError) {
      console.error('Error creating request:', requestError);
      alert('Error al crear la solicitud');
      return;
    }

    const taskData: Record<string, unknown> = {
      title: `Solicitud: ${formData.title}`,
      description: `Solicitud interna de ${formData.department}:\n\n${formData.description}`,
      task_type: 'Mantenimiento General',
      requesting_area: 'Bienes inmuebles',
      site_id: formData.site_id || null,
      requester_name: requesterName,
      requester_id: profile.id,
      request_date: requestDate,
      status: 'pending',
      photo_urls: formData.photo_urls,
      created_by: profile.id,
    };

    // Obtener usuarios de infraestructura para asignar
    const { data: infrastructureUsers } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'infrastructure')
      .limit(1);

    if (infrastructureUsers && infrastructureUsers.length > 0) {
      taskData.assignee_id = infrastructureUsers[0].id;
      taskData.assigned_to = 'Infraestructura';
    }

    const { data: createdTask, error: taskError } = await supabase
      .from('tasks')
      .insert([taskData])
      .select()
      .single();

    if (taskError) {
      console.error('Error creating task:', taskError);
    } else {
      // Actualizar solicitud con task_id
      await supabase
        .from('internal_requests')
        .update({ task_id: createdTask.id })
        .eq('id', insertedRequest.id);
    }

    // Enviar correo a los 3 usuarios de infraestructura
    try {
      const { data: infrastructureTeam } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('role', 'infrastructure');

      if (infrastructureTeam && infrastructureTeam.length > 0) {
        const emails = infrastructureTeam.map((member: { email: string; full_name: string }) => member.email).join(', ');

        const token = localStorage.getItem('token');
        await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3000/api')}/notifications/email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            to: emails,
            subject: `📋 Nueva Solicitud Interna - ${formData.title}`,
            message: `Se ha creado una nueva solicitud interna que requiere atención del equipo de infraestructura.

Solicitud: ${formData.title}
Departamento: ${formData.department}
Sede: ${sites.find((s) => s.id === formData.site_id)?.name || 'N/A'}
Solicitante: ${requesterName}

Descripción:
${formData.description}

${(() => {
  const hasMeasures = formData.measurement_length || formData.measurement_height || formData.measurement_depth;
  if (!hasMeasures) return '';
  const parts = [];
  if (formData.measurement_length) parts.push(`- Longitud: ${formData.measurement_length}m`);
  if (formData.measurement_height) parts.push(`- Altura: ${formData.measurement_height}m`);
  if (formData.measurement_depth) parts.push(`- Profundidad: ${formData.measurement_depth}m`);
  return `Medidas:\n${parts.join('\n')}`;
})()}

Se ha generado automáticamente una tarea en el sistema para su seguimiento.

Por favor, revise la solicitud y la tarea asociada en el sistema.`,
            html: `
              <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2 style="color: #cf1b22;">Nueva Solicitud Interna</h2>
                <p>Se ha creado una nueva solicitud interna que requiere atención del equipo de infraestructura.</p>
                
                <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-left: 4px solid #cf1b22;">
                  <h3>Información de la Solicitud:</h3>
                  <ul>
                    <li><strong>Solicitud:</strong> ${formData.title}</li>
                    <li><strong>Departamento:</strong> ${formData.department}</li>
                    <li><strong>Sede:</strong> ${sites.find((s) => s.id === formData.site_id)?.name || 'N/A'}</li>
                    <li><strong>Solicitante:</strong> ${requesterName}</li>
                    <li><strong>Fecha:</strong> ${new Date(requestDate).toLocaleDateString('es-CO')}</li>
                  </ul>
                </div>

                <div style="margin: 20px 0;">
                  <h3>Descripción:</h3>
                  <p>${formData.description.replaceAll(/\n/g, '<br>')}</p>
                </div>

                ${(() => {
                  const hasMeasuresHtml = formData.measurement_length || formData.measurement_height || formData.measurement_depth;
                  if (!hasMeasuresHtml) return '';
                  const items = [];
                  if (formData.measurement_length) items.push(`<li>Longitud: ${formData.measurement_length}m</li>`);
                  if (formData.measurement_height) items.push(`<li>Altura: ${formData.measurement_height}m</li>`);
                  if (formData.measurement_depth) items.push(`<li>Profundidad: ${formData.measurement_depth}m</li>`);
                  return `<div style="margin: 20px 0;"><h3>Medidas:</h3><ul>${items.join('')}</ul></div>`;
                })()}

                <p style="background-color: #e3f2fd; padding: 10px; border-left: 4px solid #2196f3;">
                  <strong>Nota:</strong> Se ha generado automáticamente una tarea en el sistema para su seguimiento.
                </p>

                <p style="margin-top: 30px; color: #666; font-size: 12px;">
                  Este es un correo automático del sistema de gestión de infraestructura.
                </p>
              </div>
            `,
          }),
        });
      }
    } catch (error) {
      console.error('Error sending email:', error);
    }

    setShowModal(false);
    resetForm();
    loadData();
  };

  const resetForm = () => {
    setFormData(
      createEmptyInternalRequestForm({
        department: profile?.department || '',
        requester_name: profile?.full_name || '',
      })
    );
  };

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
          <h1 className="text-2xl sm:text-3xl font-bold text-[#50504f]">Solicitudes Internas</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Solicitudes de clientes internos - Maquinaria, Repuestos y Bienes inmuebles</p>
        </div>
        <Button onClick={openNewRequestModal} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
          <span className="text-sm sm:text-base">Nueva Solicitud</span>
        </Button>
      </div>

      <Card className="p-3 sm:p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 min-w-[240px]">
            <Select
              label="Ciudad"
              value={cityFilter}
              onChange={(e) => handleCityFilterChange(e.target.value)}
              options={[
                { value: 'all', label: 'Todas las ciudades' },
                ...cityOptions.map((city) => ({ value: city, label: city })),
              ]}
              fullWidth
            />
            <Select
              label="Sede"
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              options={[
                { value: 'all', label: 'Todas las sedes' },
                ...siteFilterOptions.map((site) => ({ value: site.id, label: site.name })),
              ]}
              fullWidth
            />
          </div>
          {filtersActive && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleClearFilters}
              className="flex items-center gap-1.5"
            >
              <FilterX className="w-4 h-4" aria-hidden />
              Borrar filtros
            </Button>
          )}
        </div>
      </Card>

      {/* Indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-gray-600 text-xs sm:text-sm font-medium">Total Solicitudes</p>
              <p className="text-2xl sm:text-3xl font-bold text-blue-600 mt-1">{indicators.totalRequests}</p>
            </div>
            <TrendingUp className="w-7 h-7 sm:w-8 sm:h-8 text-blue-500 flex-shrink-0 ml-2" />
          </div>
        </Card>

        <Card className="border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-gray-600 text-xs sm:text-sm font-medium">Inversión Total</p>
              <p className="text-2xl sm:text-3xl font-bold text-green-600 mt-1 truncate">
                ${(indicators.totalInvestment / 1000000).toFixed(1)}M
              </p>
            </div>
            <DollarSign className="w-7 h-7 sm:w-8 sm:h-8 text-green-500 flex-shrink-0 ml-2" />
          </div>
        </Card>

        <Card className="border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-gray-600 text-xs sm:text-sm font-medium">Sedes con Solicitudes</p>
              <p className="text-2xl sm:text-3xl font-bold text-purple-600 mt-1">{indicators.requestsBySite.length}</p>
            </div>
            <MapPin className="w-7 h-7 sm:w-8 sm:h-8 text-purple-500 flex-shrink-0 ml-2" />
          </div>
        </Card>

        <Card className="border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-gray-600 text-xs sm:text-sm font-medium">Promedio por Sede</p>
              <p className="text-2xl sm:text-3xl font-bold text-orange-600 mt-1">
                {indicators.requestsBySite.length > 0
                  ? (indicators.totalRequests / indicators.requestsBySite.length).toFixed(1)
                  : '0'}
              </p>
            </div>
            <Calendar className="w-7 h-7 sm:w-8 sm:h-8 text-orange-500 flex-shrink-0 ml-2" />
          </div>
        </Card>
      </div>

      {/* Tabla de Solicitudes por Sede */}
      {indicators.requestsBySite.length > 0 && (
        <Card>
          <h3 className="text-base sm:text-lg font-semibold text-[#50504f] mb-3 sm:mb-4">Solicitudes por Sede</h3>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="py-3 pl-4 pr-3 text-left text-xs sm:text-sm font-semibold text-gray-900 sm:pl-6 whitespace-nowrap">
                        Sede
                      </th>
                      <th scope="col" className="px-3 py-3 text-right text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">
                        Cantidad
                      </th>
                      <th scope="col" className="px-3 py-3 text-right text-xs sm:text-sm font-semibold text-gray-900 sm:pr-6 whitespace-nowrap">
                        Inversión
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {indicators.requestsBySite.map((item) => {
                      const investment = indicators.investmentBySite.find((inv) => inv.site_name === item.site_name);
                      return (
                        <tr key={item.site_name} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap py-3 pl-4 pr-3 text-sm text-[#50504f] sm:pl-6">
                            {item.site_name}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-sm text-right font-medium text-gray-900">
                            {item.count}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-sm text-right text-gray-900 sm:pr-6">
                            {investment
                              ? `$${investment.amount.toLocaleString('es-CO')}`
                              : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Lista de Solicitudes */}
      <div className="grid grid-cols-1 gap-4">
        {filteredRequests.map((request: InternalRequestWithRelations) => (
          <Card key={request.id} hover>
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg text-[#50504f]">{request.title}</h3>
                    <Badge variant={request.status}>{request.status.replace('_', ' ')}</Badge>
                    {request.task && (
                      <Badge variant="default">
                        Tarea: {request.task.title.substring(0, 30)}...
                      </Badge>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{request.description}</p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs">Departamento</p>
                      <p className="font-medium text-[#50504f]">{request.department}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Sede</p>
                      <p className="font-medium text-[#50504f]">{request.site?.name || 'N/A'}</p>
                      {request.site?.city && (
                        <p className="text-xs text-gray-500">{request.site.city}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Solicitante</p>
                      <p className="font-medium text-[#50504f]">
                        {request.requester_name || request.requester?.full_name || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Fecha Solicitud</p>
                      <p className="font-medium text-[#50504f]">
                        {request.request_date
                          ? new Date(request.request_date).toLocaleDateString('es-CO')
                          : new Date(request.created_at).toLocaleDateString('es-CO')}
                      </p>
                    </div>
                  </div>

                  {(request.measurement_length || request.measurement_height || request.measurement_depth) && (
                    <div className="grid grid-cols-3 gap-3 text-sm mt-3">
                      {request.measurement_length && (
                        <div>
                          <p className="text-gray-500 text-xs">Longitud</p>
                          <p className="font-medium text-[#50504f]">{request.measurement_length}m</p>
                        </div>
                      )}
                      {request.measurement_height && (
                        <div>
                          <p className="text-gray-500 text-xs">Altura</p>
                          <p className="font-medium text-[#50504f]">{request.measurement_height}m</p>
                        </div>
                      )}
                      {request.measurement_depth && (
                        <div>
                          <p className="text-gray-500 text-xs">Profundidad</p>
                          <p className="font-medium text-[#50504f]">{request.measurement_depth}m</p>
                        </div>
                      )}
                    </div>
                  )}

                  <RequestAttachmentsGallery
                    photoUrls={request.photo_urls}
                    designUrls={request.design_urls}
                    onPreview={handlePreviewAttachment}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t">
                <span>Creado {new Date(request.created_at).toLocaleDateString()}</span>
                {request.task && (
                  <span className="text-blue-600">
                    Tarea asociada: {request.task.status}
                  </span>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredRequests.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              {requests.length > 0 ? 'No hay solicitudes con los filtros seleccionados' : 'No hay solicitudes'}
            </h3>
            <p className="text-gray-500 mb-4">
              {requests.length > 0
                ? 'Prueba con otra ciudad o sede'
                : 'Crea tu primera solicitud'}
            </p>
            {requests.length === 0 ? (
              <Button onClick={openNewRequestModal}>
                <Plus className="w-5 h-5 mr-2" />
                Nueva Solicitud
              </Button>
            ) : (
              <Button variant="secondary" onClick={handleClearFilters}>
                <FilterX className="w-4 h-4 mr-2" />
                Borrar filtros
              </Button>
            )}
          </div>
        </Card>
      )}

      <ImageLightbox
        imageUrl={previewImageUrl}
        title="Adjunto de solicitud"
        onClose={() => setPreviewImageUrl(null)}
      />

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title="Nueva Solicitud Interna"
      >
        <InternalRequestForm
          sites={sites}
          formData={formData}
          onChange={setFormData}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowModal(false);
            resetForm();
          }}
        />
      </Modal>
    </div>
  );
};
