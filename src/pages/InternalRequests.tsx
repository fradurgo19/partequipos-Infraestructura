import { useState, useEffect } from 'react';
import { Plus, TrendingUp, MapPin, DollarSign, Calendar, AlertTriangle } from 'lucide-react';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Textarea } from '../atoms/Textarea';
import { Select } from '../atoms/Select';
import { Modal } from '../molecules/Modal';
import { Badge } from '../atoms/Badge';
import { FileUpload } from '../molecules/FileUpload';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { InternalRequest, Site } from '../types';

// Departamentos externos
const DEPARTMENTS = [
  'Comercial',
  'TI',
  'Servicio',
  'Abastecimientos',
  'Compras',
  'Recursos Humanos',
  'Contabilidad',
  'Otro'
];

interface Indicators {
  requestsBySite: Array<{ site_name: string; count: number }>;
  investmentBySite: Array<{ site_name: string; amount: number }>;
  totalRequests: number;
  totalInvestment: number;
}

export const InternalRequests = () => {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<InternalRequest[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [indicators, setIndicators] = useState<Indicators>({
    requestsBySite: [],
    investmentBySite: [],
    totalRequests: 0,
    totalInvestment: 0,
  });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    site_id: '',
    department: profile?.department || '',
    request_date: new Date().toISOString().split('T')[0],
    measurement_length: '',
    measurement_height: '',
    measurement_depth: '',
    photo_urls: [] as string[],
    design_urls: [] as string[],
  });

  useEffect(() => {
    loadData();
  }, [profile]);

  const loadData = async () => {
    setLoading(true);
    const [requestsResult, sitesResult] = await Promise.all([
      supabase
        .from('internal_requests')
        .select('*, site:sites(id, name, location), task:tasks(id, title, status), requester:profiles!internal_requests_created_by_fkey(id, full_name)')
        .order('created_at', { ascending: false }),
      supabase.from('sites').select('*').order('name'),
    ]);

    if (!requestsResult.error && requestsResult.data) {
      const requestsData = requestsResult.data as any;
      setRequests(requestsData);

      // Calcular indicadores
      calculateIndicators(requestsData);
    }
    if (!sitesResult.error && sitesResult.data) {
      setSites(sitesResult.data);
    }
    setLoading(false);
  };

  const calculateIndicators = (requestsData: any[]) => {
    // Solicitudes por sede
    const requestsBySiteMap = new Map<string, number>();
    const investmentBySiteMap = new Map<string, number>();

    requestsData.forEach((request: any) => {
      if (request.site?.name) {
        const siteName = request.site.name;
        requestsBySiteMap.set(siteName, (requestsBySiteMap.get(siteName) || 0) + 1);
        
        // Si hay tarea asociada con presupuesto, sumar a inversión
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

    setIndicators({
      requestsBySite,
      investmentBySite,
      totalRequests: requestsData.length,
      totalInvestment,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const requestDate = formData.request_date || new Date().toISOString().split('T')[0];

    const requestData: any = {
      title: formData.title,
      description: formData.description,
      department: formData.department,
      site_id: formData.site_id || null,
      request_date: requestDate,
      photo_urls: formData.photo_urls,
      measurement_length: formData.measurement_length ? parseFloat(formData.measurement_length) : null,
      measurement_height: formData.measurement_height ? parseFloat(formData.measurement_height) : null,
      measurement_depth: formData.measurement_depth ? parseFloat(formData.measurement_depth) : null,
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

    // Crear tarea automáticamente para infraestructura
    const taskData: any = {
      title: `Solicitud: ${formData.title}`,
      description: `Solicitud interna de ${formData.department}:\n\n${formData.description}`,
      task_type: 'Mantenimiento General',
      requesting_area: 'Bienes inmuebles',
      site_id: formData.site_id || null,
      requester_name: profile.full_name,
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
        const emails = infrastructureTeam.map((member: any) => member.email).join(', ');
        const names = infrastructureTeam.map((member: any) => member.full_name).join(', ');

        const token = localStorage.getItem('token');
        await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/notifications/email`, {
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
Solicitante: ${profile.full_name}

Descripción:
${formData.description}

${formData.measurement_length || formData.measurement_height || formData.measurement_depth
  ? `Medidas:
${formData.measurement_length ? `- Longitud: ${formData.measurement_length}m` : ''}
${formData.measurement_height ? `- Altura: ${formData.measurement_height}m` : ''}
${formData.measurement_depth ? `- Profundidad: ${formData.measurement_depth}m` : ''}`
  : ''}

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
                    <li><strong>Solicitante:</strong> ${profile.full_name}</li>
                    <li><strong>Fecha:</strong> ${new Date(requestDate).toLocaleDateString('es-CO')}</li>
                  </ul>
                </div>

                <div style="margin: 20px 0;">
                  <h3>Descripción:</h3>
                  <p>${formData.description.replace(/\n/g, '<br>')}</p>
                </div>

                ${formData.measurement_length || formData.measurement_height || formData.measurement_depth
                  ? `<div style="margin: 20px 0;">
                      <h3>Medidas:</h3>
                      <ul>
                        ${formData.measurement_length ? `<li>Longitud: ${formData.measurement_length}m</li>` : ''}
                        ${formData.measurement_height ? `<li>Altura: ${formData.measurement_height}m</li>` : ''}
                        ${formData.measurement_depth ? `<li>Profundidad: ${formData.measurement_depth}m</li>` : ''}
                      </ul>
                    </div>`
                  : ''}

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
    setFormData({
      title: '',
      description: '',
      site_id: '',
      department: profile?.department || '',
      request_date: new Date().toISOString().split('T')[0],
      measurement_length: '',
      measurement_height: '',
      measurement_depth: '',
      photo_urls: [],
      design_urls: [],
    });
  };

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
          <h1 className="text-3xl font-bold text-[#50504f]">Solicitudes Internas</h1>
          <p className="text-gray-600 mt-1">Solicitudes de clientes internos - Maquinaria, Repuestos y Bienes inmuebles</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-5 h-5 mr-2" />
          Nueva Solicitud
        </Button>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Solicitudes</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">{indicators.totalRequests}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-500" />
          </div>
        </Card>

        <Card className="border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Inversión Total</p>
              <p className="text-3xl font-bold text-green-600 mt-1">
                ${(indicators.totalInvestment / 1000000).toFixed(1)}M
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </Card>

        <Card className="border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Sedes con Solicitudes</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">{indicators.requestsBySite.length}</p>
            </div>
            <MapPin className="w-8 h-8 text-purple-500" />
          </div>
        </Card>

        <Card className="border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Promedio por Sede</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">
                {indicators.requestsBySite.length > 0
                  ? (indicators.totalRequests / indicators.requestsBySite.length).toFixed(1)
                  : '0'}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-orange-500" />
          </div>
        </Card>
      </div>

      {/* Tabla de Solicitudes por Sede */}
      {indicators.requestsBySite.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold text-[#50504f] mb-4">Solicitudes por Sede</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">Sede</th>
                  <th className="text-right py-2 px-4 text-sm font-medium text-gray-700">Cantidad</th>
                  <th className="text-right py-2 px-4 text-sm font-medium text-gray-700">Inversión</th>
                </tr>
              </thead>
              <tbody>
                {indicators.requestsBySite.map((item, index) => {
                  const investment = indicators.investmentBySite.find((inv) => inv.site_name === item.site_name);
                  return (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-4 text-sm text-[#50504f]">{item.site_name}</td>
                      <td className="py-2 px-4 text-sm text-right font-medium">{item.count}</td>
                      <td className="py-2 px-4 text-sm text-right">
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
        </Card>
      )}

      {/* Lista de Solicitudes */}
      <div className="grid grid-cols-1 gap-4">
        {requests.map((request: any) => (
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
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Solicitante</p>
                      <p className="font-medium text-[#50504f]">{request.requester?.full_name || 'N/A'}</p>
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

                  {request.photo_urls && request.photo_urls.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mt-3">
                      {request.photo_urls.slice(0, 4).map((url: string, idx: number) => (
                        <img
                          key={idx}
                          src={url}
                          alt={`Photo ${idx + 1}`}
                          className="w-full h-20 object-cover rounded"
                        />
                      ))}
                    </div>
                  )}
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

      {requests.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No hay solicitudes</h3>
            <p className="text-gray-500 mb-4">Crea tu primera solicitud</p>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="w-5 h-5 mr-2" />
              Nueva Solicitud
            </Button>
          </div>
        </Card>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title="Nueva Solicitud Interna"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Título"
            placeholder="Título de la solicitud"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            fullWidth
            required
          />

          <Select
            label="Sede *"
            value={formData.site_id}
            onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
            options={[
              { value: '', label: 'Seleccione una sede' },
              ...sites.map((site) => ({ value: site.id, label: site.name })),
            ]}
            fullWidth
            required
          />

          <Input
            label="Fecha Solicitud"
            type="date"
            value={formData.request_date}
            onChange={(e) => setFormData({ ...formData, request_date: e.target.value })}
            fullWidth
            required
          />

          <Select
            label="Departamento *"
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            options={[
              { value: '', label: 'Seleccione un departamento' },
              ...DEPARTMENTS.map((dept) => ({ value: dept, label: dept })),
            ]}
            fullWidth
            required
          />

          <Textarea
            label="Descripción *"
            placeholder="Describe tu solicitud en detalle"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            fullWidth
            required
            rows={4}
          />

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Alto (m)"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.measurement_height}
              onChange={(e) => setFormData({ ...formData, measurement_height: e.target.value })}
              fullWidth
            />
            <Input
              label="Ancho (m)"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.measurement_length}
              onChange={(e) => setFormData({ ...formData, measurement_length: e.target.value })}
              fullWidth
            />
            <Input
              label="Profundo (m)"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.measurement_depth}
              onChange={(e) => setFormData({ ...formData, measurement_depth: e.target.value })}
              fullWidth
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fotos</label>
            <FileUpload
              bucket="general"
              folder="internal-requests"
              multiple
              accept="image/*"
              onUploadComplete={(urls) => {
                setFormData({ ...formData, photo_urls: [...formData.photo_urls, ...urls] });
              }}
              existingFiles={formData.photo_urls}
              onRemove={(url) => {
                setFormData({
                  ...formData,
                  photo_urls: formData.photo_urls.filter((u) => u !== url),
                });
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subida de Diseño</label>
            <FileUpload
              bucket="general"
              folder="designs"
              multiple
              onUploadComplete={(urls) => {
                setFormData({ ...formData, design_urls: [...formData.design_urls, ...urls] });
              }}
              existingFiles={formData.design_urls}
              onRemove={(url) => {
                setFormData({
                  ...formData,
                  design_urls: formData.design_urls.filter((u) => u !== url),
                });
              }}
            />
          </div>

          <div className="flex gap-3 pt-4">
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
            <Button type="submit" fullWidth>
              Enviar Solicitud
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
