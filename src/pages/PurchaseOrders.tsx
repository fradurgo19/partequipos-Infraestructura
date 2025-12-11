import { useState, useEffect } from 'react';
import { Plus, Download, FileText, Upload, X } from 'lucide-react';
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
import { PurchaseOrder, Site, ServiceOrder } from '../types';
import { generatePurchaseOrderPDF } from '../services/pdfGenerator';

const AREA_CODES = [
  'IF REPARACIONES LOCATIVAS',
  'IF MANTENIMIENTO',
  'IF CONSTRUCCIÓN',
  'IF EQUIPOS',
  'IF OTROS'
];

export const PurchaseOrders = () => {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    issued_to: '',
    issued_to_nit: '',
    order_date: new Date().toISOString().split('T')[0],
    activity_type: '',
    area_code: '',
    quotation_number: '',
    project_code: '',
    cost_center: '',
    comments: '',
    items: [{ description: '', price: '', quantity: '1' }] as Array<{ description: string; price: string; quantity: string }>,
    subtotal: '',
    taxes: '',
    tax_type: 'Impuesto ventas',
    other_taxes: '',
    total: '',
    authorized_by: '',
    authorized_by_name: '',
    prepared_by: '',
    prepared_by_name: profile?.full_name || '',
    prepared_date: new Date().toISOString().split('T')[0],
    employee_signature_date: '',
    site_id: '',
    service_order_id: '',
    quotation_attachment_url: '',
    invoice_attachment_url: '',
    erpg_number: '542',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [ordersResult, sitesResult, serviceOrdersResult, usersResult] = await Promise.all([
      supabase
        .from('purchase_orders')
        .select(`
          *,
          site:sites(id, name, location),
          service_order:service_orders(id, order_number)
        `)
        .order('created_at', { ascending: false }),
      supabase.from('sites').select('*').order('name'),
      supabase.from('service_orders').select('id, order_number, site_id').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name').order('full_name'),
    ]);

    if (!ordersResult.error && ordersResult.data) {
      setOrders(ordersResult.data as any);
    }
    if (!sitesResult.error && sitesResult.data) {
      setSites(sitesResult.data);
    }
    if (!serviceOrdersResult.error && serviceOrdersResult.data) {
      setServiceOrders(serviceOrdersResult.data);
    }
    if (!usersResult.error && usersResult.data) {
      setUsers(usersResult.data);
    }
    setLoading(false);
  };

  const calculateTotals = () => {
    const items = formData.items.filter(item => item.description && item.price);
    const subtotal = items.reduce((sum, item) => {
      const price = parseFloat(item.price) || 0;
      const quantity = parseFloat(item.quantity) || 1;
      return sum + (price * quantity);
    }, 0);
    
    const taxes = parseFloat(formData.taxes) || 0;
    const otherTaxes = parseFloat(formData.other_taxes) || 0;
    const total = subtotal + taxes + otherTaxes;

    setFormData(prev => ({
      ...prev,
      subtotal: subtotal.toFixed(2),
      total: total.toFixed(2),
    }));
  };

  useEffect(() => {
    calculateTotals();
  }, [formData.items, formData.taxes, formData.other_taxes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    // Generar número de orden usando función SQL o fallback
    let orderNumber = '';
    try {
      const { data: orderNumberData } = await supabase.rpc('generate_purchase_order_number');
      orderNumber = orderNumberData || '';
    } catch (error) {
      console.log('RPC function not available, using fallback');
    }
    
    if (!orderNumber) {
      // Fallback: generar número manualmente
      const year = new Date().getFullYear();
      const { data: lastOrder } = await supabase
        .from('purchase_orders')
        .select('order_number')
        .like('order_number', `${year}%`)
        .order('order_number', { ascending: false })
        .limit(1)
        .single();
      
      if (lastOrder?.order_number) {
        const lastNum = parseInt(lastOrder.order_number.slice(-5)) || 0;
        orderNumber = `${year}${String(lastNum + 1).padStart(5, '0')}`;
      } else {
        orderNumber = `${year}00001`;
      }
    }

    const items = formData.items
      .filter(item => item.description && item.price)
      .map(item => ({
        description: item.description,
        price: parseFloat(item.price) || 0,
        quantity: parseFloat(item.quantity) || 1,
      }));

    const orderData = {
      order_number: orderNumber,
      issued_to: formData.issued_to,
      issued_to_nit: formData.issued_to_nit,
      order_date: formData.order_date,
      activity_type: formData.activity_type,
      area_code: formData.area_code,
      quotation_number: formData.quotation_number,
      project_code: formData.project_code,
      cost_center: formData.cost_center,
      comments: formData.comments,
      items,
      subtotal: parseFloat(formData.subtotal) || 0,
      taxes: parseFloat(formData.taxes) || 0,
      tax_type: formData.tax_type,
      other_taxes: parseFloat(formData.other_taxes) || 0,
      total: parseFloat(formData.total) || 0,
      authorized_by: formData.authorized_by || null,
      authorized_by_name: formData.authorized_by_name,
      prepared_by: profile.id,
      prepared_by_name: formData.prepared_by_name,
      prepared_date: formData.prepared_date,
      employee_signature_date: formData.employee_signature_date || null,
      site_id: formData.site_id || null,
      service_order_id: formData.service_order_id || null,
      quotation_attachment_url: formData.quotation_attachment_url || null,
      invoice_attachment_url: formData.invoice_attachment_url || null,
      erpg_number: formData.erpg_number,
      company_nit: '830.116.807-7',
      company_phone: '4485878 - 4926260',
      status: 'draft',
      created_by: profile.id,
    };

    const { data: insertedOrder, error } = await supabase
      .from('purchase_orders')
      .insert([orderData])
      .select()
      .single();

    if (error) {
      console.error('Error creating purchase order:', error);
      alert('Error al crear la orden de compra');
      return;
    }

    // Generar PDF
    try {
      const pdfBlob = await generatePurchaseOrderPDF(insertedOrder);
      const pdfFileName = `purchase-orders/OC-${orderNumber}-${Date.now()}.pdf`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(pdfFileName, pdfBlob, {
          contentType: 'application/pdf',
        });

      if (!uploadError && uploadData) {
        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(pdfFileName);

        await supabase
          .from('purchase_orders')
          .update({ pdf_url: publicUrl })
          .eq('id', insertedOrder.id);
      }
    } catch (pdfError) {
      console.error('Error generating PDF:', pdfError);
    }

    setShowModal(false);
    resetForm();
    loadData();
  };

  const resetForm = () => {
    setFormData({
      issued_to: '',
      issued_to_nit: '',
      order_date: new Date().toISOString().split('T')[0],
      activity_type: '',
      area_code: '',
      quotation_number: '',
      project_code: '',
      cost_center: '',
      comments: '',
      items: [{ description: '', price: '', quantity: '1' }],
      subtotal: '',
      taxes: '',
      tax_type: 'Impuesto ventas',
      other_taxes: '',
      total: '',
      authorized_by: '',
      authorized_by_name: '',
      prepared_by: '',
      prepared_by_name: profile?.full_name || '',
      prepared_date: new Date().toISOString().split('T')[0],
      employee_signature_date: '',
      site_id: '',
      service_order_id: '',
      quotation_attachment_url: '',
      invoice_attachment_url: '',
      erpg_number: '542',
    });
  };

  const handleDownloadPDF = async (order: PurchaseOrder) => {
    if (order.pdf_url) {
      window.open(order.pdf_url, '_blank');
    } else {
      const pdfBlob = await generatePurchaseOrderPDF(order);
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `OC-${order.order_number}-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', price: '', quantity: '1' }],
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateItem = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      ),
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
          <h1 className="text-2xl sm:text-3xl font-bold text-[#50504f]">Órdenes de Compra</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Gestión de órdenes de compra según formato PARTEQUIPOS</p>
        </div>
        {canManage && (
          <Button onClick={() => setShowModal(true)} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            <span className="text-sm sm:text-base">Nueva Orden</span>
          </Button>
        )}
      </div>

      {/* Lista de órdenes */}
      <div className="grid grid-cols-1 gap-4">
        {orders.map((order: any) => (
          <Card key={order.id} hover>
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg text-[#50504f]">
                      OC #{order.order_number}
                    </h3>
                    <Badge variant={order.status === 'approved' ? 'success' : order.status === 'pending_approval' ? 'in_progress' : 'pending'}>
                      {order.status}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs">Emitido para</p>
                      <p className="font-medium text-[#50504f]">{order.issued_to}</p>
                      <p className="text-xs text-gray-500">NIT: {order.issued_to_nit}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Fecha</p>
                      <p className="font-medium text-[#50504f]">
                        {new Date(order.order_date).toLocaleDateString('es-CO')}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Total</p>
                      <p className="font-medium text-[#50504f]">
                        ${(order.total || 0).toLocaleString('es-CO')}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Sede</p>
                      <p className="font-medium text-[#50504f]">
                        {order.site?.name || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {order.quotation_number && (
                    <p className="text-sm text-gray-600 mt-2">
                      <strong>No. Cotización:</strong> {order.quotation_number}
                    </p>
                  )}
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
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No hay órdenes de compra</h3>
            <p className="text-gray-500 mb-4">Crea tu primera orden de compra para comenzar</p>
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
        title="Crear Orden de Compra"
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Emitido para (Proveedor)"
              value={formData.issued_to}
              onChange={(e) => setFormData({ ...formData, issued_to: e.target.value })}
              required
              fullWidth
            />
            <Input
              label="NIT"
              value={formData.issued_to_nit}
              onChange={(e) => setFormData({ ...formData, issued_to_nit: e.target.value })}
              required
              fullWidth
            />
            <Input
              label="Fecha"
              type="date"
              value={formData.order_date}
              onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
              required
              fullWidth
            />
            <Select
              label="Código de Área"
              value={formData.area_code}
              onChange={(e) => setFormData({ ...formData, area_code: e.target.value })}
              options={[
                { value: '', label: 'Seleccione' },
                ...AREA_CODES.map(code => ({ value: code, label: code })),
              ]}
              fullWidth
            />
            <Input
              label="No. Cotización"
              value={formData.quotation_number}
              onChange={(e) => setFormData({ ...formData, quotation_number: e.target.value })}
              fullWidth
            />
            <Input
              label="Código de Proyecto"
              value={formData.project_code}
              onChange={(e) => setFormData({ ...formData, project_code: e.target.value })}
              fullWidth
            />
            <Input
              label="Centro de Costos"
              value={formData.cost_center}
              onChange={(e) => setFormData({ ...formData, cost_center: e.target.value })}
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
            <Select
              label="Orden de Servicio (Opcional)"
              value={formData.service_order_id}
              onChange={(e) => setFormData({ ...formData, service_order_id: e.target.value })}
              options={[
                { value: '', label: 'Ninguna' },
                ...serviceOrders.map(so => ({ value: so.id, label: `OS #${so.order_number}` })),
              ]}
              fullWidth
            />
            <Input
              label="Tipo de Actividad"
              value={formData.activity_type}
              onChange={(e) => setFormData({ ...formData, activity_type: e.target.value })}
              required
              fullWidth
            />
          </div>

          {/* Comentarios - antes de la tabla según formato */}
          <Textarea
            label="Comentarios"
            value={formData.comments}
            onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
            placeholder="Ej: PROYECTO GUARNE - EQ"
            rows={3}
            fullWidth
          />

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-[#50504f]">Items</label>
              <Button type="button" variant="ghost" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-1" />
                Agregar Item
              </Button>
            </div>
            {formData.items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                <div className="col-span-12 sm:col-span-5">
                  <Input
                    placeholder="Descripción"
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    fullWidth
                  />
                </div>
                <div className="col-span-6 sm:col-span-3">
                  <Input
                    type="number"
                    placeholder="Precio"
                    value={item.price}
                    onChange={(e) => updateItem(index, 'price', e.target.value)}
                    fullWidth
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <Input
                    type="number"
                    placeholder="Cantidad"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                    fullWidth
                  />
                </div>
                <div className="col-span-2 sm:col-span-2">
                  {formData.items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="w-full"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Subtotal"
              type="number"
              value={formData.subtotal}
              readOnly
              fullWidth
            />
            <Input
              label="Impuestos"
              type="number"
              value={formData.taxes}
              onChange={(e) => setFormData({ ...formData, taxes: e.target.value })}
              fullWidth
            />
            <Input
              label="Otros Impuestos"
              type="number"
              value={formData.other_taxes}
              onChange={(e) => setFormData({ ...formData, other_taxes: e.target.value })}
              fullWidth
            />
            <Input
              label="Total"
              type="number"
              value={formData.total}
              readOnly
              className="font-bold"
              fullWidth
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Elaboró"
              value={formData.prepared_by_name}
              onChange={(e) => setFormData({ ...formData, prepared_by_name: e.target.value })}
              required
              fullWidth
            />
            <Input
              label="Fecha Elaboración"
              type="date"
              value={formData.prepared_date}
              onChange={(e) => setFormData({ ...formData, prepared_date: e.target.value })}
              fullWidth
            />
            <Select
              label="Autorizado por"
              value={formData.authorized_by}
              onChange={(e) => {
                const user = users.find(u => u.id === e.target.value);
                setFormData({
                  ...formData,
                  authorized_by: e.target.value,
                  authorized_by_name: user?.full_name || '',
                });
              }}
              options={[
                { value: '', label: 'Seleccione' },
                ...users.map(user => ({ value: user.id, label: user.full_name })),
              ]}
              fullWidth
            />
            <Input
              label="Fecha Firma Empleado"
              type="date"
              value={formData.employee_signature_date}
              onChange={(e) => setFormData({ ...formData, employee_signature_date: e.target.value })}
              fullWidth
            />
          </div>

          <Textarea
            label="Comentarios"
            value={formData.comments}
            onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
            rows={3}
            fullWidth
          />

          {/* Adjuntos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FileUpload
              label="Cotización Adjunta"
              accept=".pdf,.jpg,.jpeg,.png"
              onUpload={(url) => setFormData({ ...formData, quotation_attachment_url: url })}
              currentFile={formData.quotation_attachment_url}
            />
            <FileUpload
              label="Factura Adjunta"
              accept=".pdf,.jpg,.jpeg,.png"
              onUpload={(url) => setFormData({ ...formData, invoice_attachment_url: url })}
              currentFile={formData.invoice_attachment_url}
            />
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
              Crear Orden de Compra
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

