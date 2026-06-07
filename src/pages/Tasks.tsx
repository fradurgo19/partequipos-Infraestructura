import { useEffect, useState, useRef } from 'react';
import { Plus, Filter, Search, Camera, Clock, CheckCircle, FileText, Calendar, Eye, Edit } from 'lucide-react';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Select } from '../atoms/Select';
import { Textarea } from '../atoms/Textarea';
import { Badge } from '../atoms/Badge';
import { Modal } from '../molecules/Modal';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Task, TaskStatus, TaskPriority, Site, User } from '../types';
import { addWatermarkToImage } from '../services/watermark';
import { PriorityBadge } from '../molecules/PriorityBadge';
import {
  PRIORITY_OPTIONS,
  comparePriority,
  getPriorityRowClass,
  normalizePriority,
} from '../constants/taskPriority';

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

type TaskRow = Task & {
  requester?: { id: string; full_name: string; role: string };
  assignee?: { id: string; full_name: string; role: string };
  responsible?: { id: string; full_name: string };
  site?: { id: string; name: string; location: string };
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  completed: 'Completado',
  cancelled: 'Cancelada',
};

const formatDate = (value?: string | null): string =>
  value ? new Date(value).toLocaleDateString('es-CO') : '—';

const formatCurrency = (value?: number | null): string =>
  value == null ? '—' : `$${value.toLocaleString('es-CO')}`;

const getRequesterName = (task: TaskRow): string =>
  task.requester_name || task.requester?.full_name || '—';

const getSiteName = (task: TaskRow): string => task.site?.name || '—';

const getResponsibleName = (task: TaskRow): string => task.responsible?.full_name || '—';

const buildTaskPayload = (
  formData: ReturnType<typeof emptyTaskForm>,
  infrastructureUserId?: string
) => ({
  title: formData.title,
  description: formData.description,
  task_type: formData.task_type,
  requesting_area: formData.requesting_area,
  site_id: formData.site_id || null,
  project_name: formData.project_name || null,
  requester_name: formData.requester_name,
  assignee_id: infrastructureUserId || null,
  responsible_id: formData.responsible_id || null,
  budget_amount: formData.budget_amount ? Number.parseFloat(formData.budget_amount) : null,
  priority: formData.priority,
  photo_urls: formData.photo_urls,
});

const sendTaskBudgetNotification = async (
  taskTitle: string,
  budget: number,
  taskId: string,
  requesterName: string
): Promise<void> => {
  if (budget <= 0) return;
  try {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    const token = currentSession?.access_token;
    const apiBase = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3000/api');
    const res = await fetch(`${apiBase}/notifications/task-budget`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ taskTitle, budget, taskId, requesterName }),
    });
    if (!res.ok && res.status !== 202) {
      console.error('Notificaciones task-budget:', res.status);
    }
  } catch (err) {
    console.error('Error enviando notificaciones:', err);
  }
};

const emptyTaskForm = () => ({
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
  priority: 'medium' as TaskPriority,
  photo_urls: [] as string[],
});

export const Tasks = () => {
  const { profile, session } = useAuth();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [infrastructureUsers, setInfrastructureUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskRow | null>(null);
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [formData, setFormData] = useState(emptyTaskForm());

  const canEdit = profile?.role === 'admin';

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
          responsible:profiles!tasks_responsible_id_fkey(id, full_name),
          site:sites(id, name, location)
        `)
        .order('created_at', { ascending: false }),
      supabase.from('sites').select('*').order('name'),
      supabase.from('profiles').select('*').eq('role', 'infrastructure').order('full_name'),
    ]);

    if (!tasksResult.error && tasksResult.data) {
      setTasks(tasksResult.data as TaskRow[]);
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
      const message = error instanceof Error ? error.message : 'Error al procesar la foto';
      alert(message);
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const userId = session?.user?.id ?? profile.id;
    const taskPayload = buildTaskPayload(formData, infrastructureUsers[0]?.id);

    if (editingTask) {
      const { error } = await supabase
        .from('tasks')
        .update(taskPayload)
        .eq('id', editingTask.id);

      if (!error) {
        setShowModal(false);
        resetForm();
        loadData();
      }
      return;
    }

    const taskData = {
      ...taskPayload,
      requester_id: profile.id,
      status: 'pending' as TaskStatus,
      request_date: new Date().toISOString().split('T')[0],
    };

    const { data, error } = await supabase.from('tasks').insert([taskData]).select().single();

    if (error || !data) return;

    const { error: timelineError } = await supabase.from('task_timeline').insert([
      {
        task_id: data.id,
        event_type: 'created',
        description: `Tarea creada por ${formData.requester_name || profile.full_name}`,
        user_id: userId,
      },
    ]);
    if (timelineError) {
      console.error('Error creando evento en timeline:', timelineError);
    }

    const budget = Number.parseFloat(formData.budget_amount || '0');
    await sendTaskBudgetNotification(
      formData.title,
      budget,
      data.id,
      formData.requester_name || profile.full_name
    );

    setShowModal(false);
    resetForm();
    loadData();
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    if (!profile) return;

    const task = tasks.find(t => t.id === taskId);
    const updateData: Record<string, string> = { status: newStatus };

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
      let eventType = 'updated';
      if (newStatus === 'completed') eventType = 'completed';
      else if (newStatus === 'in_progress') eventType = 'started';
      const uid = session?.user?.id ?? profile.id;
      await supabase.from('task_timeline').insert([
        {
          task_id: taskId,
          event_type: eventType,
          description: `Estado cambiado a ${newStatus}`,
          user_id: uid,
        },
      ]);

      loadData();
    }
  };

  const resetForm = () => {
    setFormData(emptyTaskForm());
    setEditingTask(null);
  };

  const openViewModal = (task: TaskRow) => {
    setSelectedTask(task);
    setShowViewModal(true);
  };

  const openEditModal = (task: TaskRow) => {
    if (!canEdit) return;
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description,
      task_type: task.task_type,
      requesting_area: task.requesting_area,
      site_id: task.site_id ?? '',
      project_name: task.project_name ?? '',
      requester_name: task.requester_name ?? task.requester?.full_name ?? '',
      assignee_id: task.assignee_id ?? '',
      responsible_id: task.responsible_id ?? '',
      budget_amount: task.budget_amount?.toString() ?? '',
      priority: normalizePriority(task.priority),
      photo_urls: task.photo_urls ?? [],
    });
    setShowModal(true);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const handleUpdateTimeline = async (taskId: string, eventType: string, dateField: string, photoUrl?: string) => {
    if (!profile) return;

    const updateData: Record<string, string> = { [dateField]: new Date().toISOString().split('T')[0] };
    if (photoUrl) {
      if (dateField === 'start_date') {
        updateData.initial_photo_url = photoUrl;
      } else if (dateField === 'completion_date') {
        updateData.completion_photo_url = photoUrl;
      }
    }

    const { error } = await supabase.from('tasks').update(updateData).eq('id', taskId);

    if (!error) {
      const uid = session?.user?.id ?? profile.id;
      const timelineData: Record<string, string | undefined> = {
        task_id: taskId,
        event_type: eventType,
        description: `${eventType} registrado por ${profile.full_name}`,
        user_id: uid,
      };
      if (photoUrl) {
        timelineData.photo_url = photoUrl;
      }
      await supabase.from('task_timeline').insert([timelineData]);

      // Recargar datos para actualizar la vista
      loadData();
    }
  };

  const openTimelineModal = (task: TaskRow) => {
    setSelectedTask(task);
    setShowTimelineModal(true);
  };

  const handlePriorityChange = async (taskId: string, priority: TaskPriority) => {
    if (!canEdit) return;
    const { error } = await supabase.from('tasks').update({ priority }).eq('id', taskId);
    if (!error) loadData();
  };

  const filteredTasks = tasks
    .filter((task) => {
      const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
      const matchesPriority =
        filterPriority === 'all' || normalizePriority(task.priority) === filterPriority;
      const matchesSearch =
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesPriority && matchesSearch;
    })
    .sort((a, b) => comparePriority(a.priority, b.priority));

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
          <h1 className="text-2xl sm:text-3xl font-bold text-[#50504f]">Tareas</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Seguimiento de tareas de mantenimiento y flujos de trabajo</p>
        </div>
        <Button onClick={openCreateModal} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
          <span className="text-sm sm:text-base">Crear tarea</span>
        </Button>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar tareas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cf1b22]"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <Filter className="text-gray-400 w-5 h-5 hidden sm:block" />
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              options={[
                { value: 'all', label: 'Todos los estados' },
                { value: 'pending', label: 'Pendiente' },
                { value: 'in_progress', label: 'En progreso' },
                { value: 'completed', label: 'Completado' },
                { value: 'cancelled', label: 'Cancelada' },
              ]}
            />
            <Select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              options={[
                { value: 'all', label: 'Todas las prioridades' },
                ...PRIORITY_OPTIONS,
              ]}
            />
          </div>
        </div>
      </Card>

      {filteredTasks.length > 0 ? (
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Título</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Prioridad</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase min-w-[200px]">Descripción</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Tipo</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Área</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Sede</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Proyecto</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Solicitante</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Responsable</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Estado</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Presupuesto</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">F. Solicitud</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">F. Inicio</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">F. O.S.</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">F. Aprob. Pres.</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">F. Entrega</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">F. Finalización</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Fotos</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Creado</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap sticky right-0 bg-gray-50">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredTasks.map((task) => (
                <tr key={task.id} className={`hover:bg-gray-50 ${getPriorityRowClass(task.priority)}`}>
                  <td className="px-3 py-3 font-medium text-[#50504f] whitespace-nowrap">{task.title}</td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {canEdit ? (
                      <select
                        value={normalizePriority(task.priority)}
                        onChange={(e) => handlePriorityChange(task.id, e.target.value as TaskPriority)}
                        className="text-xs border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#cf1b22]"
                        aria-label={`Prioridad de ${task.title}`}
                      >
                        {PRIORITY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : (
                      <PriorityBadge priority={task.priority} size="sm" />
                    )}
                  </td>
                  <td className="px-3 py-3 text-gray-600 max-w-xs">
                    <span className="line-clamp-2" title={task.description}>{task.description}</span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">{task.task_type}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{task.requesting_area}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{getSiteName(task)}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{task.project_name || '—'}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{getRequesterName(task)}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{getResponsibleName(task)}</td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <Badge variant={task.status}>{STATUS_LABELS[task.status]}</Badge>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">{formatCurrency(task.budget_amount)}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{formatDate(task.request_date)}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{formatDate(task.start_date)}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{formatDate(task.service_order_date)}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{formatDate(task.budget_approval_date)}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{formatDate(task.delivery_date)}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{formatDate(task.completion_date)}</td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {task.photo_urls?.length ? `${task.photo_urls.length} foto(s)` : '—'}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">{formatDate(task.created_at)}</td>
                  <td className="px-3 py-3 whitespace-nowrap sticky right-0 bg-white">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openViewModal(task)} title="Ver detalle">
                        <Eye className="w-4 h-4" />
                      </Button>
                      {canEdit && (
                        <Button size="sm" variant="ghost" onClick={() => openEditModal(task)} title="Editar">
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => openTimelineModal(task)} title="Línea de tiempo">
                        <Clock className="w-4 h-4" />
                      </Button>
                      {canEdit && task.status === 'pending' && (
                        <Button size="sm" onClick={() => handleStatusChange(task.id, 'in_progress')}>
                          Iniciar
                        </Button>
                      )}
                      {canEdit && task.status === 'in_progress' && (
                        <Button size="sm" variant="secondary" onClick={() => handleStatusChange(task.id, 'completed')}>
                          Completar
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      ) : (
        <Card>
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No hay tareas</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || filterStatus !== 'all' || filterPriority !== 'all'
                ? 'Prueba ajustando los filtros'
                : 'Crea tu primera tarea para comenzar'}
            </p>
          </div>
        </Card>
      )}

      <Modal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedTask(null);
        }}
        title={`Detalle de tarea - ${selectedTask?.title ?? ''}`}
        size="xl"
      >
        {selectedTask && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div><p className="text-gray-500 text-xs">Título</p><p className="font-medium">{selectedTask.title}</p></div>
              <div><p className="text-gray-500 text-xs">Prioridad</p><PriorityBadge priority={selectedTask.priority} /></div>
              <div><p className="text-gray-500 text-xs">Estado</p><Badge variant={selectedTask.status}>{STATUS_LABELS[selectedTask.status]}</Badge></div>
              <div><p className="text-gray-500 text-xs">Tipo</p><p className="font-medium">{selectedTask.task_type}</p></div>
              <div><p className="text-gray-500 text-xs">Área solicitante</p><p className="font-medium">{selectedTask.requesting_area}</p></div>
              <div><p className="text-gray-500 text-xs">Sede</p><p className="font-medium">{getSiteName(selectedTask)}</p></div>
              <div><p className="text-gray-500 text-xs">Proyecto</p><p className="font-medium">{selectedTask.project_name || '—'}</p></div>
              <div><p className="text-gray-500 text-xs">Solicitante</p><p className="font-medium">{getRequesterName(selectedTask)}</p></div>
              <div><p className="text-gray-500 text-xs">Asignado a</p><p className="font-medium">{selectedTask.assignee?.full_name || 'Infraestructura'}</p></div>
              <div><p className="text-gray-500 text-xs">Responsable</p><p className="font-medium">{getResponsibleName(selectedTask)}</p></div>
              <div><p className="text-gray-500 text-xs">Presupuesto</p><p className="font-medium">{formatCurrency(selectedTask.budget_amount)}</p></div>
              <div><p className="text-gray-500 text-xs">Fecha solicitud</p><p className="font-medium">{formatDate(selectedTask.request_date)}</p></div>
              <div><p className="text-gray-500 text-xs">Fecha inicio</p><p className="font-medium">{formatDate(selectedTask.start_date)}</p></div>
              <div><p className="text-gray-500 text-xs">Fecha orden de servicio</p><p className="font-medium">{formatDate(selectedTask.service_order_date)}</p></div>
              <div><p className="text-gray-500 text-xs">Fecha aprobación presupuesto</p><p className="font-medium">{formatDate(selectedTask.budget_approval_date)}</p></div>
              <div><p className="text-gray-500 text-xs">Fecha entrega</p><p className="font-medium">{formatDate(selectedTask.delivery_date)}</p></div>
              <div><p className="text-gray-500 text-xs">Fecha finalización</p><p className="font-medium">{formatDate(selectedTask.completion_date)}</p></div>
              <div><p className="text-gray-500 text-xs">Creado</p><p className="font-medium">{formatDate(selectedTask.created_at)}</p></div>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Descripción</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedTask.description}</p>
            </div>
            {selectedTask.photo_urls && selectedTask.photo_urls.length > 0 && (
              <div>
                <p className="text-gray-500 text-xs mb-2">Fotos</p>
                <div className="flex flex-wrap gap-2">
                  {selectedTask.photo_urls.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                      <img src={url} alt="" className="w-20 h-20 object-cover rounded border" />
                    </a>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              {canEdit && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowViewModal(false);
                    openEditModal(selectedTask);
                  }}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Editar
                </Button>
              )}
              <Button variant="ghost" onClick={() => setShowViewModal(false)}>Cerrar</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingTask ? 'Editar Tarea' : 'Crear Nueva Tarea'}
        size="xl"
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

          <Select
            label="Prioridad *"
            value={formData.priority}
            onChange={(e) =>
              setFormData({ ...formData, priority: e.target.value as TaskPriority })
            }
            options={PRIORITY_OPTIONS}
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
              <label htmlFor="task-assignee-display" className="block text-sm font-medium text-gray-700 mb-1">
                Asignado a
              </label>
              <input
                id="task-assignee-display"
                type="text"
                value="Infraestructura"
                disabled
                readOnly
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
            <label htmlFor="task-photo-upload" className="block text-sm font-medium text-gray-700 mb-2">
              Fotos con Marca de Agua
            </label>
            <div className="flex gap-2 mb-2">
              <input
                id="task-photo-upload"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
                aria-label="Fotos con marca de agua"
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
                {formData.photo_urls.map((url) => (
                  <div key={url} className="relative">
                    <img
                      src={url}
                      alt=""
                      className="w-full h-24 object-cover rounded border"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          photo_urls: formData.photo_urls.filter((u) => u !== url),
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
              {editingTask ? 'Guardar cambios' : 'Crear Tarea'}
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
        size="xl"
      >
        {selectedTask && (
          <TimelineView task={selectedTask} onUpdate={handleUpdateTimeline} canEdit={canEdit} />
        )}
      </Modal>
    </div>
  );
};

// Componente de Línea de Tiempo
interface TimelineViewProps {
  task: Task;
  onUpdate: (taskId: string, eventType: string, dateField: string, photoUrl?: string) => Promise<void>;
  canEdit: boolean;
}

const TimelineView = ({ task, onUpdate, canEdit }: TimelineViewProps) => {
  useAuth();
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
      const message = error instanceof Error ? error.message : 'Error al procesar la foto';
      alert(message);
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
        data.forEach((event: { event_type?: string; photo_url?: string }) => {
          if (event.photo_url && event.event_type !== undefined) {
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
      date: task.request_date,
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
      date: task.start_date,
      photo: task.initial_photo_url || timelinePhotos['started'],
      icon: Calendar,
      color: 'green',
      canUpdate: true,
      requiresPhoto: true,
      eventType: 'started',
    },
    {
      key: 'service_order_date',
      label: 'Fecha de Orden de Servicio',
      date: task.service_order_date,
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
      date: task.budget_approval_date,
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
      date: task.delivery_date,
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
      date: task.completion_date,
      photo: task.completion_photo_url || timelinePhotos['completed'],
      icon: CheckCircle,
      color: 'green',
      canUpdate: true,
      requiresPhoto: true,
      eventType: 'completed',
    },
  ];

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
              {(() => {
                let iconCircleClass = 'bg-gray-200 border-gray-300 text-gray-500';
                if (isComplete) iconCircleClass = 'bg-green-500 border-green-500 text-white';
                else if (isPending) iconCircleClass = 'bg-red-500 border-red-500 text-white';
                return (
              <div
                className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 ${iconCircleClass}`}
              >
                <Icon className="w-5 h-5" />
              </div>
                );
              })()}

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
                    {event.canUpdate && canEdit && (
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
                            {(() => {
                              if (uploadingPhoto && activeDateField === event.key) return 'Procesando...';
                              if (event.photo) return 'Cambiar Foto';
                              return 'Tomar/Adjuntar Foto';
                            })()}
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

