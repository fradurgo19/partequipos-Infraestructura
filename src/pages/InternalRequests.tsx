import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
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
import { InternalRequest } from '../types';

export const InternalRequests = () => {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<InternalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    department: profile?.department || '',
    photo_urls: [] as string[],
    measurement_length: '',
    measurement_height: '',
    design_urls: [] as string[],
  });

  useEffect(() => {
    loadData();
  }, [profile]);

  const loadData = async () => {
    setLoading(true);
    let query = supabase
      .from('internal_requests')
      .select('*, requester:profiles!internal_requests_requester_id_fkey(id, full_name), assigned:profiles!internal_requests_assigned_to_fkey(id, full_name)')
      .order('created_at', { ascending: false });

    if (profile?.role === 'internal_client') {
      query = query.eq('requester_id', profile.id);
    }

    const { data, error } = await query;

    if (!error && data) {
      setRequests(data as any);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const requestData = {
      title: formData.title,
      description: formData.description,
      department: formData.department,
      photos_urls: formData.photo_urls,
      measurements: formData.measurement_length || formData.measurement_height ? {
        length: formData.measurement_length ? parseFloat(formData.measurement_length) : null,
        height: formData.measurement_height ? parseFloat(formData.measurement_height) : null,
      } : null,
      design_urls: formData.design_urls,
      requester_id: profile.id,
      status: 'pending',
    };

    const { data, error } = await supabase.from('internal_requests').insert([requestData]).select().single();

    if (!error && data) {
      // Notify infrastructure team
      const { data: infrastructureTeam } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'infrastructure');

      if (infrastructureTeam && infrastructureTeam.length > 0) {
        const notifications = infrastructureTeam.map((member: any) => ({
          user_id: member.id,
          title: 'New Internal Request',
          message: `A new request "${requestData.title}" has been submitted by ${profile.full_name}`,
          type: 'internal_request',
          reference_id: data.id,
        }));

        await supabase.from('notifications').insert(notifications);
      }

      setShowModal(false);
      resetForm();
      loadData();
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      department: profile?.department || '',
      photo_urls: [],
      measurement_length: '',
      measurement_height: '',
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
          <h1 className="text-3xl font-bold text-[#50504f]">Internal Requests</h1>
          <p className="text-gray-600 mt-1">Submit department requests</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-5 h-5 mr-2" />
          New Request
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {requests.map((request: any) => (
          <Card key={request.id} hover>
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg text-[#50504f]">{request.title}</h3>
                    <Badge variant={request.status}>{request.status.replace('_', ' ')}</Badge>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{request.description}</p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs">Department</p>
                      <p className="font-medium text-[#50504f]">{request.department}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Requester</p>
                      <p className="font-medium text-[#50504f]">{request.requester?.full_name || 'N/A'}</p>
                    </div>
                    {request.measurements?.length && (
                      <div>
                        <p className="text-gray-500 text-xs">Length</p>
                        <p className="font-medium text-[#50504f]">{request.measurements.length}m</p>
                      </div>
                    )}
                    {request.measurements?.height && (
                      <div>
                        <p className="text-gray-500 text-xs">Height</p>
                        <p className="font-medium text-[#50504f]">{request.measurements.height}m</p>
                      </div>
                    )}
                  </div>

                  {request.photos_urls && request.photos_urls.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mt-3">
                      {request.photos_urls.slice(0, 4).map((url: string, idx: number) => (
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
                <span>Created {new Date(request.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {requests.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No requests yet</h3>
            <p className="text-gray-500 mb-4">Submit your first request</p>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="w-5 h-5 mr-2" />
              New Request
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
        title="New Internal Request"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Title"
            placeholder="Request title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            fullWidth
            required
          />

          <Textarea
            label="Description"
            placeholder="Describe your request in detail"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            fullWidth
            required
          />

          <Input
            label="Department"
            placeholder="Your department"
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            fullWidth
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Measurement Length (m)"
              type="number"
              step="0.01"
              placeholder="Optional"
              value={formData.measurement_length}
              onChange={(e) => setFormData({ ...formData, measurement_length: e.target.value })}
              fullWidth
            />
            <Input
              label="Measurement Height (m)"
              type="number"
              step="0.01"
              placeholder="Optional"
              value={formData.measurement_height}
              onChange={(e) => setFormData({ ...formData, measurement_height: e.target.value })}
              fullWidth
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Photos</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Design Files (Optional)</label>
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
              Cancel
            </Button>
            <Button type="submit" fullWidth>
              Submit Request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

