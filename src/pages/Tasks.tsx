import { useEffect, useState, useRef } from 'react';
import { Plus, Filter, Search, Camera, Clock, CheckCircle, AlertCircle, FileText, Calendar } from 'lucide-react';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Select } from '../atoms/Select';
import { Textarea } from '../atoms/Textarea';
import { Badge } from '../atoms/Badge';
import { Modal } from '../molecules/Modal';
import { StatusIndicator } from '../molecules/StatusIndicator';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Task, TaskStatus, Site, User } from '../types';
import { addWatermarkToImage } from '../services/watermark';

// Tipos de tarea y áreas solicitantes
const TASK_TYPES = [
  'Pintura',
  'Plomería',
  'Electricidad',
  'Carpintería',
  'Albañilería',
  'Limpieza',
  'Mantenimiento General',
  'Reparación',
  'Instalación',
  'Otro'
];

const REQUESTING_AREAS = [
  'Maquinaria',
  'Repuestos',
  'Bienes inmuebles'
];

// Equipo de infraestructura
const INFRASTRUCTURE_TEAM = [
  { name: 'EDISON VALENCIA', email: 'infraestructura@partequipos.com', role: 'infrastructure' },
  { name: 'ELOISA BLANDON', email: 'infraestructura2@partequipos.com', role: 'infrastructure' },
  { name: 'ANDRES FELIPE BUSTAMANTE CESPEDES', email: 'fbustamante@partequipos.com', role: 'infrastructure' }
];

export const Tasks = () => {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [infrastructureUsers, setInfrastructureUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    task_type: '',
    requesting_area: '',
    site_id: '',
    project_name: '',
    requester_name: '',
    assignee_id: '',
    responsible_id: '',
    budget_amount: '',
    photo_urls: [] as string[],
  });

  useEffect(() => {
    loadData();
  }, [profile]);

  const loadData = async () => {
    setLoading(true);

    const [tasksResult, sitesResult, usersResult] = await Promise.all([
      supabase
        .from('tasks')
        .select(`
          *,
          requester:profiles!tasks_requester_id_fkey(id, full_name, role),
          assignee:profiles!tasks_assignee_id_fkey(id, full_name, role),
          site:sites(id, name, location)
        `)
        .order('created_at', { ascending: false }),
      supabase.from('sites').select('*').order('name'),
      supabase.from('profiles').select('*').eq('role', 'infrastructure').order('full_name'),
    ]);

    if (!tasksResult.error && tasksResult.data) {
      setTasks(tasksResult.data);
    }
    if (!sitesResult.error && sitesResult.data) {
      setSites(sitesResult.data);
    }
    if (!usersResult.error && usersResult.data) {
      setInfrastructureUsers(usersResult.data);
    }

    setLoading(false);
  };

  const handleTakePhoto = async () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const watermarkedUrl = await addWatermarkToImage(file);
      setFormData({
        ...formData,
        photo_urls: [...formData.photo_urls, watermarkedUrl],
      });
    } catch (error) {
      console.error('Error al agregar marca de agua:', error);
      alert('Error al procesar la foto');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const sendNotificationEmail = async (to: string, subject: string, message: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/notifications/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          to,
          subject,
          message,
        }),
      });
      const data = await response.json();
      return response.ok && data.success;
    } catch (error) {
      console.error('Error enviando email:', error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    // Buscar usuario de infraestructura para asignar
    const infrastructureUser = infrastructureUsers[0]; // Siempre asignar al primero disponible

    const taskData = {
      title: formData.title,
      description: formData.description,
      task_type: formData.task_type,
      requesting_area: formData.requesting_area,
      site_id: formData.site_id || null,
      project_name: formData.project_name || null,
      requester_name: formData.requester_name,
      assignee_id: infrastructureUser?.id || null,
      responsible_id: formData.responsible_id || null,
      budget_amount: formData.budget_amount ? parseFloat(formData.budget_amount) : null,
      requester_id: profile.id,
      status: 'pending' as TaskStatus,
      request_date: new Date().toISOString().split('T')[0],
      photo_urls: formData.photo_urls,
    };

    const { data, error } = await supabase.from('tasks').insert([taskData]).select().single();

    if (!error && data) {
      // Crear evento en timeline
      await supabase.from('task_timeline').insert([
        {
          task_id: data.id,
          event_type: 'created',
          description: `Tarea creada por ${formData.requester_name || profile.full_name}`,
          user_id: profile.id,
        },
      ]);

      // Notificaciones según presupuesto usando endpoint del backend
      const budget = parseFloat(formData.budget_amount || '0');
      
      if (budget > 0) {
        try {
          const token = localStorage.getItem('token');
          await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/notifications/task-budget`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              taskTitle: formData.title,
              budget: budget,
              taskId: data.id,
              requesterName: formData.requester_name || profile.full_name,
            }),
          });
        } catch (error) {
          console.error('Error enviando notificaciones:', error);
        }
      }

      setShowModal(false);
      resetForm();
      loadData();
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    if (!profile) return;

    const task = tasks.find(t => t.id === taskId);
    const updateData: any = { status: newStatus };

    if (newStatus === 'in_progress' && !task?.start_date) {
      updateData.start_date = new Date().toISOString().split('T')[0];
      updateData.started_at = new Date().toISOString();
    }

    if (newStatus === 'completed') {
      updateData.completion_date = new Date().toISOString().split('T')[0];
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await supabase.from('tasks').update(updateData).eq('id', taskId);

    if (!error) {
      await supabase.from('task_timeline').insert([
        {
          task_id: taskId,
          event_type: newStatus === 'completed' ? 'completed' : newStatus === 'in_progress' ? 'started' : 'updated',
          description: `Estado cambiado a ${newStatus}`,
          user_id: profile.id,
        },
      ]);

      loadData();
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      task_type: '',
      requesting_area: '',
      site_id: '',
      project_name: '',
      requester_name: '',
      assignee_id: '',
      responsible_id: '',
      budget_amount: '',
      photo_urls: [],
    });
  };

  const handleUpdateTimeline = async (taskId: string, eventType: string, dateField: string, photoUrl?: string) => {
    if (!profile) return;

    const updateData: any = { [dateField]: new Date().toISOString().split('T')[0] };
    if (photoUrl) {
      if (dateField === 'start_date') {
        updateData.initial_photo_url = photoUrl;
      } else if (dateField === 'completion_date') {
        updateData.completion_photo_url = photoUrl;
      }
    }

    const { error } = await supabase.from('tasks').update(updateData).eq('id', taskId);

    if (!error) {
      // Guardar en timeline con foto si existe
      const timelineData: any = {
        task_id: taskId,
        event_type: eventType,
        description: `${eventType} registrado por ${profile.full_name}`,
        user_id: profile.id,
      };
      
      if (photoUrl) {
        timelineData.photo_url = photoUrl;
      }

      await supabase.from('task_timeline').insert([timelineData]);

      // Recargar datos para actualizar la vista
      loadData();
    }
  };

  const openTimelineModal = (task: Task) => {
    setSelectedTask(task);
    setShowTimelineModal(true);
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    const matchesSearch =
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

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
          <h1 className="text-2xl sm:text-3xl font-bold text-[#50504f]">Tasks</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Track maintenance tasks and workflows</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
          <span className="text-sm sm:text-base">Create Task</span>
        </Button>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cf1b22]"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Filter className="text-gray-400 w-5 h-5 my-auto" />
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'pending', label: 'Pending' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
            />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4">
        {filteredTasks.map((task) => (
          <Card key={task.id} hover>
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg text-[#50504f]">
                      {task.title}
                    </h3>
                    <Badge variant={task.status}>{task.status.replace('_', ' ')}</Badge>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{task.description}</p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs">Type</p>
                      <p className="font-medium text-[#50504f]">{task.task_type}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Requesting Area</p>
                      <p className="font-medium text-[#50504f]">{task.requesting_area}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Solicitante</p>
                      <p className="font-medium text-[#50504f]">
                        {(task as any).requester_name || (task as any).requester?.full_name || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Asignado a</p>
                      <p className="font-medium text-[#50504f]">
                        Infraestructura
                      </p>
                    </div>
                    {(task as any).project_name && (
                      <div>
                        <p className="text-gray-500 text-xs">Proyecto</p>
                        <p className="font-medium text-[#50504f]">
                          {(task as any).project_name}
                        </p>
                      </div>
                    )}
                  </div>

                  {task.budget_amount && (
                    <div className="mt-3 inline-block bg-green-50 px-3 py-1 rounded-full">
                      <span className="text-sm font-semibold text-green-700">
                        Budget: ${task.budget_amount.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openTimelineModal(task)}
                  >
                    <Clock className="w-4 h-4 mr-1" />
                    Línea de Tiempo
                  </Button>
                  {(profile?.role === 'infrastructure' ||
                    profile?.role === 'supervision' ||
                    profile?.role === 'admin' ||
                    task.assignee_id === profile?.id) && (
                    <>
                      {task.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusChange(task.id, 'in_progress')}
                        >
                          Iniciar
                        </Button>
                      )}
                      {task.status === 'in_progress' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleStatusChange(task.id, 'completed')}
                        >
                          Completar
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t">
                <span>Created {new Date(task.created_at).toLocaleDateString()}</span>
                <StatusIndicator status={task.status} showLabel={false} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredTasks.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No tasks found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || filterStatus !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first task to get started'}
            </p>
          </div>
        </Card>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title="Crear Nueva Tarea"
        size="large"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Título de la Tarea"
            placeholder="Ingrese el título de la tarea"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            fullWidth
            required
          />

          <Textarea
            label="Descripción"
            placeholder="Describa la tarea en detalle"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            fullWidth
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Tipo de Tarea"
              value={formData.task_type}
              onChange={(e) => setFormData({ ...formData, task_type: e.target.value })}
              options={[
                { value: '', label: 'Seleccione un tipo' },
                ...TASK_TYPES.map((type) => ({ value: type, label: type })),
              ]}
              fullWidth
              required
            />
            <Select
              label="Área Solicitante"
              value={formData.requesting_area}
              onChange={(e) => setFormData({ ...formData, requesting_area: e.target.value })}
              options={[
                { value: '', label: 'Seleccione un área' },
                ...REQUESTING_AREAS.map((area) => ({ value: area, label: area })),
              ]}
              fullWidth
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Sede"
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
              label="Proyecto (Opcional)"
              placeholder="Nombre del proyecto"
              value={formData.project_name}
              onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
              fullWidth
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Quien Solicita"
              placeholder="Nombre de quien solicita"
              value={formData.requester_name}
              onChange={(e) => setFormData({ ...formData, requester_name: e.target.value })}
              fullWidth
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Asignado a
              </label>
              <input
                type="text"
                value="Infraestructura"
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
              />
            </div>
          </div>

          <Select
            label="Responsable"
            value={formData.responsible_id}
            onChange={(e) => setFormData({ ...formData, responsible_id: e.target.value })}
            options={[
              { value: '', label: 'Seleccione un responsable' },
              ...infrastructureUsers.map((user) => ({ 
                value: user.id, 
                label: user.full_name || user.email 
              })),
            ]}
            fullWidth
            required
          />

          <Input
            label="Presupuesto (Opcional)"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={formData.budget_amount}
            onChange={(e) =>
              setFormData({ ...formData, budget_amount: e.target.value })
            }
            fullWidth
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fotos con Marca de Agua
            </label>
            <div className="flex gap-2 mb-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleTakePhoto}
                disabled={uploadingPhoto}
              >
                <Camera className="w-4 h-4 mr-2" />
                {uploadingPhoto ? 'Procesando...' : 'Tomar Foto'}
              </Button>
            </div>
            {formData.photo_urls.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {formData.photo_urls.map((url, index) => (
                  <div key={index} className="relative">
                    <img
                      src={url}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-24 object-cover rounded border"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          photo_urls: formData.photo_urls.filter((_, i) => i !== index),
                        });
                      }}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
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
              Crear Tarea
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Línea de Tiempo */}
      <Modal
        isOpen={showTimelineModal}
        onClose={() => {
          setShowTimelineModal(false);
          setSelectedTask(null);
        }}
        title={`Línea de Tiempo - ${selectedTask?.title || ''}`}
        size="large"
      >
        {selectedTask && (
          <TimelineView task={selectedTask} onUpdate={handleUpdateTimeline} />
        )}
      </Modal>
    </div>
  );
};

// Componente de Línea de Tiempo
interface TimelineViewProps {
  task: Task;
  onUpdate: (taskId: string, eventType: string, dateField: string, photoUrl?: string) => Promise<void>;
}

const TimelineView = ({ task, onUpdate }: TimelineViewProps) => {
  const { profile } = useAuth();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeDateField, setActiveDateField] = useState<string | null>(null);

  const handleTakePhoto = async (dateField: string) => {
    setActiveDateField(dateField);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeDateField) return;

    setUploadingPhoto(true);
    try {
      const watermarkedUrl = await addWatermarkToImage(file);
      // Encontrar el evento correspondiente para obtener el eventType
      const event = timelineEvents.find(e => e.key === activeDateField);
      const eventType = event?.eventType || activeDateField;
      await onUpdate(task.id, eventType, activeDateField, watermarkedUrl);
      
      // Actualizar el estado local de fotos
      setTimelinePhotos(prev => ({
        ...prev,
        [eventType]: watermarkedUrl,
      }));
    } catch (error) {
      console.error('Error al agregar marca de agua:', error);
      alert('Error al procesar la foto');
    } finally {
      setUploadingPhoto(false);
      setActiveDateField(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Obtener fotos de la línea de tiempo desde task_timeline
  const [timelinePhotos, setTimelinePhotos] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadTimelinePhotos = async () => {
      const { data } = await supabase
        .from('task_timeline')
        .select('*')
        .eq('task_id', task.id)
        .order('created_at', { ascending: true });

      if (data) {
        const photos: Record<string, string> = {};
        data.forEach((event: any) => {
          if (event.photo_url) {
            photos[event.event_type] = event.photo_url;
          }
        });
        setTimelinePhotos(photos);
      }
    };
    loadTimelinePhotos();
  }, [task.id]);

  const timelineEvents = [
    {
      key: 'request_date',
      label: 'Fecha de Solicitud',
      date: (task as any).request_date,
      photo: timelinePhotos['created'],
      icon: FileText,
      color: 'blue',
      required: true,
      canUpdate: false,
      eventType: 'created',
    },
    {
      key: 'start_date',
      label: 'Fecha de Inicio',
      date: (task as any).start_date,
      photo: (task as any).initial_photo_url || timelinePhotos['started'],
      icon: Calendar,
      color: 'green',
      canUpdate: true,
      requiresPhoto: true,
      eventType: 'started',
    },
    {
      key: 'service_order_date',
      label: 'Fecha de Orden de Servicio',
      date: (task as any).service_order_date,
      photo: timelinePhotos['service_order'],
      icon: FileText,
      color: 'orange',
      canUpdate: true,
      requiresPhoto: true,
      eventType: 'service_order',
    },
    {
      key: 'budget_approval_date',
      label: 'Fecha de Aprobación de Presupuesto',
      date: (task as any).budget_approval_date,
      photo: timelinePhotos['budget_approved'],
      icon: CheckCircle,
      color: 'purple',
      canUpdate: true,
      requiresPhoto: true,
      eventType: 'budget_approved',
    },
    {
      key: 'delivery_date',
      label: 'Fecha de Entrega',
      date: (task as any).delivery_date,
      photo: timelinePhotos['delivered'],
      icon: Calendar,
      color: 'yellow',
      canUpdate: true,
      requiresPhoto: true,
      eventType: 'delivered',
    },
    {
      key: 'completion_date',
      label: 'Fecha de Finalización',
      date: (task as any).completion_date,
      photo: (task as any).completion_photo_url || timelinePhotos['completed'],
      icon: CheckCircle,
      color: 'green',
      canUpdate: true,
      requiresPhoto: true,
      eventType: 'completed',
    },
  ];

  // Determinar el estado general de la tarea para los colores
  const getTaskStatusColor = () => {
    const status = task.status;
    if (status === 'completed') return 'green';
    if (status === 'in_progress') return 'orange';
    return 'red'; // pending o cancelled
  };

  const getStatusColor = (event: typeof timelineEvents[0]) => {
    if (event.date) {
      // Completado = verde
      return 'bg-green-100 border-green-500 text-green-700';
    }
    if (event.required && !event.date) {
      // Pendiente requerido = rojo
      return 'bg-red-100 border-red-500 text-red-700';
    }
    // Pendiente opcional = naranja
    return 'bg-orange-100 border-orange-500 text-orange-700';
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoChange}
        className="hidden"
      />

      <div className="relative">
        {timelineEvents.map((event, index) => {
          const Icon = event.icon;
          const isComplete = !!event.date;
          const isPending = !event.date && event.required;

          return (
            <div key={event.key} className="relative flex items-start gap-4 pb-6">
              {/* Línea vertical */}
              {index < timelineEvents.length - 1 && (
                <div
                  className={`absolute left-5 top-10 w-0.5 h-full ${
                    isComplete ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
              )}

              {/* Icono */}
              <div
                className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  isComplete
                    ? 'bg-green-500 border-green-500 text-white'
                    : isPending
                    ? 'bg-red-500 border-red-500 text-white'
                    : 'bg-gray-200 border-gray-300 text-gray-500'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>

              {/* Contenido */}
              <div className={`flex-1 p-4 rounded-lg border-2 ${getStatusColor(event)}`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{event.label}</h4>
                  {isComplete && (
                    <Badge variant="success" size="sm">
                      Completado
                    </Badge>
                  )}
                  {isPending && (
                    <Badge variant="danger" size="sm">
                      Pendiente
                    </Badge>
                  )}
                </div>

                {event.date ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      Fecha: {new Date(event.date).toLocaleDateString('es-CO')}
                    </p>
                    {event.photo && (
                      <div className="mt-2">
                        <img
                          src={event.photo}
                          alt={`Foto ${event.label}`}
                          className="w-full max-w-xs h-32 object-cover rounded border"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">No registrado</p>
                    {event.canUpdate && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onUpdate(task.id, event.key, event.key)}
                          disabled={uploadingPhoto}
                        >
                          Registrar Fecha
                        </Button>
                        {event.requiresPhoto && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleTakePhoto(event.key)}
                            disabled={uploadingPhoto}
                          >
                            <Camera className="w-4 h-4 mr-1" />
                            {uploadingPhoto && activeDateField === event.key
                              ? 'Procesando...'
                              : event.photo ? 'Cambiar Foto' : 'Tomar/Adjuntar Foto'}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Indicadores de estado */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h5 className="font-semibold mb-2">Estado de la Tarea</h5>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-sm">Pendiente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span className="text-sm">En Proceso</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-sm">Completada</span>
          </div>
        </div>
      </div>
    </div>
  );
};

