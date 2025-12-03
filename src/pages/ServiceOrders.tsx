import { useState, useEffect } from 'react';
import { Plus, Download } from 'lucide-react';
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
import { ServiceOrder } from '../types';
import { generateServiceOrderPDF } from '../services/pdfGenerator';

export const ServiceOrders = () => {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [sites, setSites] = useState<any[]>([]);
  const [contractors, setContractors] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    site_id: '',
    contractor_id: '',
    activity_type: '',
    description: '',
    budget_amount: '',
    request_date: new Date().toISOString().split('T')[0],
    attachment_urls: [] as string[],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [ordersResult, sitesResult, contractorsResult] = await Promise.all([
      supabase
        .from('service_orders')
        .select(
          `*,
          site:sites(id, name, location),
          contractor:contractors(id, company_name, contact_name)`
        )
        .order('created_at', { ascending: false }),
      supabase.from('sites').select('*').order('name'),
      supabase.from('contractors').select('*').order('company_name'),
    ]);

    if (!ordersResult.error && ordersResult.data) {
      setOrders(ordersResult.data as any);
    }
    if (!sitesResult.error && sitesResult.data) {
      setSites(sitesResult.data);
    }
    if (!contractorsResult.error && contractorsResult.data) {
      setContractors(contractorsResult.data);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const orderData = {
      ...formData,
      site_id: formData.site_id,
      contractor_id: formData.contractor_id,
      budget_amount: parseFloat(formData.budget_amount),
      request_date: new Date(formData.request_date).toISOString(),
      attachment_urls: formData.attachment_urls,
      created_by: profile.id,
      status: 'draft',
    };

    const { error } = await supabase.from('service_orders').insert([orderData]);

    if (!error) {
      setShowModal(false);
      resetForm();
      loadData();
    }
  };

  const resetForm = () => {
    setFormData({
      site_id: '',
      contractor_id: '',
      activity_type: '',
      description: '',
      budget_amount: '',
      request_date: new Date().toISOString().split('T')[0],
      attachment_urls: [],
    });
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#50504f]">Service Orders</h1>
          <p className="text-gray-600 mt-1">Manage service orders and contractors</p>
        </div>
        {canManage && (
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-5 h-5 mr-2" />
            Create Order
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {orders.map((order: any) => (
          <Card key={order.id} hover>
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg text-[#50504f]">
                      Order #{order.order_number}
                    </h3>
                    <Badge variant={order.status}>{order.status.replace('_', ' ')}</Badge>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{order.description}</p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs">Site</p>
                      <p className="font-medium text-[#50504f]">{order.site?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Contractor</p>
                      <p className="font-medium text-[#50504f]">
                        {order.contractor?.company_name || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Activity</p>
                      <p className="font-medium text-[#50504f]">{order.activity_type}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Budget</p>
                      <p className="font-medium text-[#50504f]">
                        ${order.budget_amount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => generateServiceOrderPDF(order)}
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
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No service orders yet</h3>
            <p className="text-gray-500 mb-4">Create your first service order to get started</p>
            {canManage && (
              <Button onClick={() => setShowModal(true)}>
                <Plus className="w-5 h-5 mr-2" />
                Create Order
              </Button>
            )}
          </div>
        </Card>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title="Create Service Order"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Site"
            value={formData.site_id}
            onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
            options={[
              { value: '', label: 'Select a site' },
              ...sites.map((site) => ({ value: site.id, label: site.name })),
            ]}
            fullWidth
            required
          />

          <Select
            label="Contractor"
            value={formData.contractor_id}
            onChange={(e) => setFormData({ ...formData, contractor_id: e.target.value })}
            options={[
              { value: '', label: 'Select a contractor' },
              ...contractors.map((contractor) => ({
                value: contractor.id,
                label: contractor.company_name,
              })),
            ]}
            fullWidth
            required
          />

          <Input
            label="Activity Type"
            placeholder="e.g. Painting, Plumbing, Electrical"
            value={formData.activity_type}
            onChange={(e) => setFormData({ ...formData, activity_type: e.target.value })}
            fullWidth
            required
          />

          <Textarea
            label="Description"
            placeholder="Describe the service order in detail"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            fullWidth
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Request Date"
              type="date"
              value={formData.request_date}
              onChange={(e) => setFormData({ ...formData, request_date: e.target.value })}
              fullWidth
              required
            />
            <Input
              label="Budget Amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.budget_amount}
              onChange={(e) => setFormData({ ...formData, budget_amount: e.target.value })}
              fullWidth
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attachments
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
              Cancel
            </Button>
            <Button type="submit" fullWidth>
              Create Order
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

