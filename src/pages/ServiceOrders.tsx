import { useState, useEffect } from 'react';
import { Plus, Download, Clock, DollarSign, TrendingUp, FileText, CheckCircle } from 'lucide-react';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Select } from '../atoms/Select';
import { Textarea } from '../atoms/Textarea';
import { Modal } from '../molecules/Modal';
import { Badge } from '../atoms/Badge';
import { FileUpload } from '../molecules/FileUpload';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { ServiceOrder, Task } from '../types';
import { generateServiceOrderPDF } from '../services/pdfGenerator';

// Actividades comunes para órdenes de servicio
const COMMON_ACTIVITIES = [
  'Revoque',
  'Vaciado',
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
  'Otro'
];

export const ServiceOrders = () => {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [contractors, setContractors] = useState<any[]>([]);
  const [infrastructureUsers, setInfrastructureUsers] = useState<any[]>([]);
  const [ordersBySite, setOrdersBySite] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
    const [formData, setFormData] = useState({
      site_id: '',
      task_id: '',
      contractor_id: '',
      requester_id: '',
      executor_id: '',
      activity_type: '',
      activities: [] as string[],
      description: '',
      budget_amount: '',
      actual_amount: '',
      request_date: new Date().toISOString().split('T')[0], // date format
      start_date: '',
      end_date: '',
      oco_date: '',
      attachment_urls: [] as string[], // Se mapeará a 'attachments' al guardar
    });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [
      ordersResult,
      tasksResult,
      sitesResult,
      contractorsResult,
      usersResult,
      ordersBySiteResult
    ] = await Promise.all([
      supabase
        .from('service_orders')
        .select(
          `*,
          site:sites(id, name, location),
          contractor:contractors(id, company_name, contact_name, email, phone, specialty, rating),
          task:tasks(id, title, description),
          requester:profiles!service_orders_requester_id_fkey(id, full_name),
          executor:profiles!service_orders_executor_id_fkey(id, full_name),
          purchase_order:purchase_orders(id, order_number)`
        )
        .order('created_at', { ascending: false }),
      supabase
        .from('tasks')
        .select('id, title, description, site_id, request_date, status')
        .order('created_at', { ascending: false }),
      supabase.from('sites').select('*').order('name'),
      supabase.from('contractors').select('*').order('company_name'),
      supabase.from('profiles').select('*').eq('role', 'infrastructure').order('full_name'),
      supabase
        .from('service_orders')
        .select('site_id, site:sites(id, name)')
        .order('created_at', { ascending: false }),
    ]);

    if (!ordersResult.error && ordersResult.data) {
      // Mapear 'attachments' a 'attachment_urls' para compatibilidad
      const mappedOrders = ordersResult.data.map((order: any) => ({
        ...order,
        attachment_urls: order.attachments || order.attachment_urls || [],
      }));
      setOrders(mappedOrders as any);
    }
    if (!tasksResult.error && tasksResult.data) {
      setTasks(tasksResult.data);
    }
    if (!sitesResult.error && sitesResult.data) {
      setSites(sitesResult.data);
    }
    if (!contractorsResult.error && contractorsResult.data) {
      setContractors(contractorsResult.data);
    }
    if (!usersResult.error && usersResult.data) {
      setInfrastructureUsers(usersResult.data);
    }
    // Calcular órdenes por sede manualmente
    if (!ordersResult.error && ordersResult.data) {
      const siteCounts: Record<string, any> = {};
      ordersResult.data.forEach((order: any) => {
        const siteId = order.site_id;
        if (!siteCounts[siteId]) {
          siteCounts[siteId] = {
            site_id: siteId,
            site_name: order.site?.name || 'N/A',
            total_orders: 0,
            completed_orders: 0,
            in_progress_orders: 0,
            pending_orders: 0,
            total_budget: 0,
            total_actual: 0,
          };
        }
        siteCounts[siteId].total_orders++;
        if (order.status === 'completed') siteCounts[siteId].completed_orders++;
        if (order.status === 'in_progress') siteCounts[siteId].in_progress_orders++;
        if (order.status === 'pending_approval' || order.status === 'draft') siteCounts[siteId].pending_orders++;
        siteCounts[siteId].total_budget += order.budget_amount || 0;
        siteCounts[siteId].total_actual += order.actual_amount || 0;
      });
      setOrdersBySite(Object.values(siteCounts));
    }
    setLoading(false);
  };

  const generateOrderNumber = async (siteId: string): Promise<string> => {
    try {
      // Intentar usar la función RPC
      const { data, error } = await supabase.rpc('generate_service_order_number', {
        site_uuid: siteId
      });
      if (!error && data) {
        return data;
      }
    } catch (error) {
      console.log('RPC function not available, using fallback');
    }
    
    // Fallback: generar número manualmente
    const site = sites.find(s => s.id === siteId);
    const siteCode = site ? site.name.substring(0, 3).toUpperCase().replace(/\s/g, '') : 'SED';
    
    // Obtener el último número de orden para esta sede
    const { data: lastOrder } = await supabase
      .from('service_orders')
      .select('order_number')
      .eq('site_id', siteId)
      .like('order_number', `${siteCode}-%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    let nextNumber = 1;
    if (lastOrder?.order_number) {
      const match = lastOrder.order_number.match(/-(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }
    
    return `${siteCode}-${String(nextNumber).padStart(3, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      // Generar número de orden consecutivo por sede
      const orderNumber = await generateOrderNumber(formData.site_id);

      const orderData: any = {
        order_number: orderNumber,
        site_id: formData.site_id,
        contractor_id: formData.contractor_id,
        task_id: formData.task_id || null,
        requester_id: formData.requester_id || profile.id,
        executor_id: formData.executor_id || null,
        activity_type: formData.activity_type,
        activities: formData.activities,
        description: formData.description,
        budget_amount: parseFloat(formData.budget_amount),
        actual_amount: formData.actual_amount ? parseFloat(formData.actual_amount) : null,
        request_date: formData.request_date, // Ya es date
        start_date: formData.start_date || null, // Ya es date
        end_date: formData.end_date || null, // Ya es date
        oco_date: formData.oco_date || null,
        attachments: formData.attachment_urls, // Usar 'attachments' que es el nombre real de la columna
        created_by: profile.id,
        status: 'draft',
      };

      const { data: newOrder, error } = await supabase
        .from('service_orders')
        .insert([orderData])
        .select()
        .single();

      if (error) throw error;

      // Si hay una tarea relacionada, actualizar la fecha de orden de servicio
      if (formData.task_id && newOrder) {
        await supabase
          .from('tasks')
          .update({ 
            service_order_date: new Date().toISOString().split('T')[0],
            service_order_id: newOrder.id
          })
          .eq('id', formData.task_id);
      }

      // Crear orden de compra relacionada automáticamente
      if (newOrder) {
        await createPurchaseOrderFromServiceOrder(newOrder);
      }

      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error creating service order:', error);
      alert('Error al crear la orden de servicio');
    }
  };

  const createPurchaseOrderFromServiceOrder = async (serviceOrder: any) => {
    try {
      const contractor = contractors.find(c => c.id === serviceOrder.contractor_id);
      if (!contractor) return;

      // Generar número de orden de compra
      const poNumber = `OC-${Date.now()}`;

      const purchaseOrderData = {
        order_number: poNumber,
        issued_to: contractor.company_name,
        issued_to_nit: contractor.nit || 'N/A',
        order_date: new Date().toISOString().split('T')[0],
        activity_type: serviceOrder.activity_type,
        items: [{
          description: serviceOrder.description,
          price: serviceOrder.budget_amount,
          quantity: 1
        }],
        subtotal: serviceOrder.budget_amount,
        taxes: serviceOrder.budget_amount * 0.19, // IVA 19%
        total: serviceOrder.budget_amount * 1.19,
        site_id: serviceOrder.site_id,
        status: 'draft',
        created_by: profile?.id,
        prepared_by: profile?.id,
      };

      const { data: purchaseOrder, error } = await supabase
        .from('purchase_orders')
        .insert([purchaseOrderData])
        .select()
        .single();

      if (!error && purchaseOrder) {
        // Actualizar service_order con purchase_order_id
        await supabase
          .from('service_orders')
          .update({ purchase_order_id: purchaseOrder.id })
          .eq('id', serviceOrder.id);
      }
    } catch (error) {
      console.error('Error creating purchase order:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      site_id: '',
      task_id: '',
      contractor_id: '',
      requester_id: '',
      executor_id: '',
      activity_type: '',
      activities: [],
      description: '',
      budget_amount: '',
      actual_amount: '',
      request_date: new Date().toISOString().split('T')[0],
      start_date: '',
      end_date: '',
      oco_date: '',
      attachment_urls: [],
    });
  };

  const handleDownloadPDF = async (order: ServiceOrder) => {
    try {
      await generateServiceOrderPDF(order);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error al generar el PDF');
    }
  };

  const canManage = profile?.role === 'admin' || profile?.role === 'infrastructure' || profile?.role === 'supervision';

  // Calcular indicadores
  const calculateIndicators = () => {
    const totalOrders = orders.length;
    const avgResponseTime = orders
      .filter(o => o.response_time_hours)
      .reduce((sum, o) => sum + (o.response_time_hours || 0), 0) / 
      orders.filter(o => o.response_time_hours).length || 0;
    
    const avgExecutionTime = orders
      .filter(o => o.execution_time_hours)
      .reduce((sum, o) => sum + (o.execution_time_hours || 0), 0) / 
      orders.filter(o => o.execution_time_hours).length || 0;

    const totalBudget = orders.reduce((sum, o) => sum + (o.budget_amount || 0), 0);
    const totalActual = orders.reduce((sum, o) => sum + (o.actual_amount || 0), 0);
    const variance = totalBudget > 0 ? ((totalActual - totalBudget) / totalBudget) * 100 : 0;

    return {
      totalOrders,
      avgResponseTime: Math.round(avgResponseTime),
      avgExecutionTime: Math.round(avgExecutionTime),
      totalBudget,
      totalActual,
      variance: Math.round(variance * 100) / 100,
    };
  };

  const indicators = calculateIndicators();

  // Filtrar tareas por sede seleccionada
  const filteredTasks = formData.site_id
    ? tasks.filter(t => t.site_id === formData.site_id)
    : tasks;

  // Ordenar contratistas por tiempo de respuesta (rating)
  const sortedContractors = [...contractors].sort((a, b) => (b.rating || 0) - (a.rating || 0));

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
          <h1 className="text-3xl font-bold text-[#50504f]">Órdenes de Servicio</h1>
          <p className="text-gray-600 mt-1">Gestión de órdenes de servicio y contratistas</p>
        </div>
        {canManage && (
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-5 h-5 mr-2" />
            Crear Orden
          </Button>
        )}
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Órdenes</p>
              <p className="text-2xl font-bold text-[#50504f]">{indicators.totalOrders}</p>
            </div>
            <FileText className="w-8 h-8 text-[#cf1b22]" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tiempo Respuesta Prom.</p>
              <p className="text-2xl font-bold text-[#50504f]">
                {indicators.avgResponseTime > 0 ? `${indicators.avgResponseTime}h` : 'N/A'}
              </p>
            </div>
            <Clock className="w-8 h-8 text-[#cf1b22]" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tiempo Ejecución Prom.</p>
              <p className="text-2xl font-bold text-[#50504f]">
                {indicators.avgExecutionTime > 0 ? `${indicators.avgExecutionTime}h` : 'N/A'}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-[#cf1b22]" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Presupuesto vs Ejecutado</p>
              <p className="text-2xl font-bold text-[#50504f]">
                {indicators.variance > 0 ? '+' : ''}{indicators.variance}%
              </p>
              <p className="text-xs text-gray-500">
                ${indicators.totalBudget.toLocaleString()} / ${indicators.totalActual.toLocaleString()}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-[#cf1b22]" />
          </div>
        </Card>
      </div>

      {/* Conteo por sede */}
      {ordersBySite.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold text-[#50504f] mb-4">Órdenes por Sede</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ordersBySite.map((site: any) => (
              <div key={site.site_id} className="p-4 bg-gray-50 rounded-lg">
                <p className="font-semibold text-[#50504f]">{site.site_name}</p>
                <p className="text-sm text-gray-600">
                  Total: {site.total_orders} | 
                  Completadas: {site.completed_orders} | 
                  En Proceso: {site.in_progress_orders}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Lista de órdenes */}
      <div className="grid grid-cols-1 gap-4">
        {orders.map((order: any) => (
          <Card key={order.id} hover>
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg text-[#50504f]">
                      Orden #{order.order_number}
                    </h3>
                    <Badge variant={order.status}>{order.status.replace('_', ' ')}</Badge>
                    {order.purchase_order && (
                      <Badge variant="default" size="sm">
                        OC: {order.purchase_order.order_number}
                      </Badge>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{order.description}</p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs">Sede</p>
                      <p className="font-medium text-[#50504f]">{order.site?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Contratista</p>
                      <p className="font-medium text-[#50504f]">
                        {order.contractor?.company_name || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Solicitante</p>
                      <p className="font-medium text-[#50504f]">
                        {order.requester?.full_name || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Ejecutor</p>
                      <p className="font-medium text-[#50504f]">
                        {order.executor?.full_name || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {order.activities && order.activities.length > 0 && (
                    <div className="mt-3">
                      <p className="text-gray-500 text-xs mb-1">Actividades</p>
                      <div className="flex flex-wrap gap-2">
                        {order.activities.map((activity: string, idx: number) => (
                          <Badge key={idx} variant="default" size="sm">
                            {activity}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mt-3">
                    <div>
                      <p className="text-gray-500 text-xs">Presupuesto</p>
                      <p className="font-medium text-[#50504f]">
                        ${order.budget_amount?.toLocaleString() || '0'}
                      </p>
                    </div>
                    {order.actual_amount && (
                      <div>
                        <p className="text-gray-500 text-xs">Ejecutado</p>
                        <p className="font-medium text-[#50504f]">
                          ${order.actual_amount.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {order.response_time_hours && (
                      <div>
                        <p className="text-gray-500 text-xs">Tiempo Respuesta</p>
                        <p className="font-medium text-[#50504f]">
                          {order.response_time_hours}h
                        </p>
                      </div>
                    )}
                    {order.execution_time_hours && (
                      <div>
                        <p className="text-gray-500 text-xs">Tiempo Ejecución</p>
                        <p className="font-medium text-[#50504f]">
                          {order.execution_time_hours}h
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleDownloadPDF(order)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  PDF
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {orders.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No hay órdenes de servicio</h3>
            <p className="text-gray-500 mb-4">Crea tu primera orden de servicio para comenzar</p>
            {canManage && (
              <Button onClick={() => setShowModal(true)}>
                <Plus className="w-5 h-5 mr-2" />
                Crear Orden
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Modal de creación */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title="Crear Orden de Servicio"
        size="large"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Sede"
            value={formData.site_id}
            onChange={(e) => {
              setFormData({ ...formData, site_id: e.target.value, task_id: '' });
            }}
            options={[
              { value: '', label: 'Seleccione una sede' },
              ...sites.map((site) => ({ value: site.id, label: site.name })),
            ]}
            fullWidth
            required
          />

          <Select
            label="Tarea Relacionada (Opcional)"
            value={formData.task_id}
            onChange={(e) => setFormData({ ...formData, task_id: e.target.value })}
            options={[
              { value: '', label: 'Seleccione una tarea' },
              ...filteredTasks.map((task) => ({ 
                value: task.id, 
                label: `${task.title} - ${new Date(task.request_date || task.created_at).toLocaleDateString()}` 
              })),
            ]}
            fullWidth
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Quien Solicita"
              value={formData.requester_id}
              onChange={(e) => setFormData({ ...formData, requester_id: e.target.value })}
              options={[
                { value: profile?.id || '', label: profile?.full_name || 'Yo' },
                ...infrastructureUsers.map((user) => ({ 
                  value: user.id, 
                  label: user.full_name 
                })),
              ]}
              fullWidth
            />
            <Select
              label="Quien Ejecuta"
              value={formData.executor_id}
              onChange={(e) => setFormData({ ...formData, executor_id: e.target.value })}
              options={[
                { value: '', label: 'Seleccione ejecutor' },
                ...infrastructureUsers.map((user) => ({ 
                  value: user.id, 
                  label: user.full_name 
                })),
              ]}
              fullWidth
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contratista (Ordenados por mejor tiempo de respuesta)
            </label>
            <Select
              value={formData.contractor_id}
              onChange={(e) => setFormData({ ...formData, contractor_id: e.target.value })}
              options={[
                { value: '', label: 'Seleccione un contratista' },
                ...sortedContractors.map((contractor) => ({
                  value: contractor.id,
                  label: `${contractor.company_name} ${contractor.rating ? `⭐ ${contractor.rating}` : ''}`,
                })),
              ]}
              fullWidth
              required
            />
          </div>

          <Select
            label="Tipo de Actividad Principal"
            value={formData.activity_type}
            onChange={(e) => setFormData({ ...formData, activity_type: e.target.value })}
            options={[
              { value: '', label: 'Seleccione tipo de actividad' },
              ...COMMON_ACTIVITIES.map((activity) => ({ value: activity, label: activity })),
            ]}
            fullWidth
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Actividades Adicionales (Seleccione múltiples)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {COMMON_ACTIVITIES.map((activity) => (
                <label key={activity} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.activities.includes(activity)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          activities: [...formData.activities, activity],
                        });
                      } else {
                        setFormData({
                          ...formData,
                          activities: formData.activities.filter((a) => a !== activity),
                        });
                      }
                    }}
                    className="rounded border-gray-300 text-[#cf1b22] focus:ring-[#cf1b22]"
                  />
                  <span className="text-sm text-gray-700">{activity}</span>
                </label>
              ))}
            </div>
          </div>

          <Textarea
            label="Descripción"
            placeholder="Describa la orden de servicio en detalle"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            fullWidth
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Fecha de Solicitud"
              type="date"
              value={formData.request_date}
              onChange={(e) => setFormData({ ...formData, request_date: e.target.value })}
              fullWidth
              required
            />
            <Input
              label="Fecha OCO (Autorizaciones y Pagos)"
              type="date"
              value={formData.oco_date}
              onChange={(e) => setFormData({ ...formData, oco_date: e.target.value })}
              fullWidth
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Fecha Inicio"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              fullWidth
            />
            <Input
              label="Fecha Fin"
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              fullWidth
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Presupuesto"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.budget_amount}
              onChange={(e) => setFormData({ ...formData, budget_amount: e.target.value })}
              fullWidth
              required
            />
            <Input
              label="Monto Ejecutado"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.actual_amount}
              onChange={(e) => setFormData({ ...formData, actual_amount: e.target.value })}
              fullWidth
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adjuntos
            </label>
            <FileUpload
              bucket="service-orders"
              folder="attachments"
              multiple
              onUploadComplete={(urls) => {
                setFormData({ ...formData, attachment_urls: [...formData.attachment_urls, ...urls] });
              }}
              existingFiles={formData.attachment_urls}
              onRemove={(url) => {
                setFormData({
                  ...formData,
                  attachment_urls: formData.attachment_urls.filter((u) => u !== url),
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
              Crear Orden de Servicio
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
