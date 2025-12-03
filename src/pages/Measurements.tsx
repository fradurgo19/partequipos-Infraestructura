import { useState, useEffect } from 'react';
import { Plus, Download, CheckCircle } from 'lucide-react';
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
import { Measurement } from '../types';
import { generateMeasurementPDF } from '../services/pdfGenerator';

export const Measurements = () => {
  const { profile } = useAuth();
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [sites, setSites] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    site_id: '',
    length: '',
    height: '',
    depth: '',
    photo_urls: [] as string[],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [measurementsResult, sitesResult] = await Promise.all([
      supabase
        .from('measurements')
        .select('*, site:sites(id, name, location)')
        .order('created_at', { ascending: false }),
      supabase.from('sites').select('*').order('name'),
    ]);

    if (!measurementsResult.error && measurementsResult.data) {
      setMeasurements(measurementsResult.data as any);
    }
    if (!sitesResult.error && sitesResult.data) {
      setSites(sitesResult.data);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const length = formData.length ? parseFloat(formData.length) : null;
    const height = formData.height ? parseFloat(formData.height) : null;
    const depth = formData.depth ? parseFloat(formData.depth) : null;

    let calculated_area = null;
    let calculated_volume = null;

    if (length && height) {
      calculated_area = length * height;
    }

    if (length && height && depth) {
      calculated_volume = length * height * depth;
    }

    const measurementData = {
      title: formData.title,
      site_id: formData.site_id || null,
      length,
      height,
      depth,
      calculated_area,
      calculated_volume,
      photo_urls: formData.photo_urls,
      created_by: profile.id,
      status: 'pending',
    };

    const { error } = await supabase.from('measurements').insert([measurementData]);

    if (!error) {
      setShowModal(false);
      resetForm();
      loadData();
    }
  };

  const handleApprove = async (id: string, level: 'edison' | 'felipe' | 'claudia') => {
    if (!profile) return;

    const updateData: any = {};
    const newStatus = `approved_${level}`;

    if (level === 'edison') {
      updateData.approved_by_edison = profile.id;
      updateData.approved_at_edison = new Date().toISOString();
      updateData.status = 'approved_edison';
    } else if (level === 'felipe') {
      updateData.approved_by_felipe = profile.id;
      updateData.approved_at_felipe = new Date().toISOString();
      updateData.status = 'approved_felipe';
    } else if (level === 'claudia') {
      updateData.approved_by_claudia = profile.id;
      updateData.approved_at_claudia = new Date().toISOString();
      updateData.status = 'approved_claudia';
    }

    const { error } = await supabase.from('measurements').update(updateData).eq('id', id);

    if (!error) {
      loadData();
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      site_id: '',
      length: '',
      height: '',
      depth: '',
      photo_urls: [],
    });
  };

  const canApprove = profile?.role === 'admin' || profile?.role === 'infrastructure' || profile?.role === 'supervision';

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
          <h1 className="text-3xl font-bold text-[#50504f]">Measurements & Evidence</h1>
          <p className="text-gray-600 mt-1">Document measurements with photos</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-5 h-5 mr-2" />
          New Measurement
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {measurements.map((measurement: any) => (
          <Card key={measurement.id} hover>
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg text-[#50504f]">{measurement.title}</h3>
                    <Badge variant={measurement.status}>{measurement.status.replace('_', ' ')}</Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm mb-3">
                    {measurement.length && (
                      <div>
                        <p className="text-gray-500 text-xs">Length</p>
                        <p className="font-medium text-[#50504f]">{measurement.length}m</p>
                      </div>
                    )}
                    {measurement.height && (
                      <div>
                        <p className="text-gray-500 text-xs">Height</p>
                        <p className="font-medium text-[#50504f]">{measurement.height}m</p>
                      </div>
                    )}
                    {measurement.depth && (
                      <div>
                        <p className="text-gray-500 text-xs">Depth</p>
                        <p className="font-medium text-[#50504f]">{measurement.depth}m</p>
                      </div>
                    )}
                    {measurement.calculated_area && (
                      <div>
                        <p className="text-gray-500 text-xs">Area</p>
                        <p className="font-medium text-[#50504f]">{measurement.calculated_area.toFixed(2)}m²</p>
                      </div>
                    )}
                    {measurement.calculated_volume && (
                      <div>
                        <p className="text-gray-500 text-xs">Volume</p>
                        <p className="font-medium text-[#50504f]">{measurement.calculated_volume.toFixed(2)}m³</p>
                      </div>
                    )}
                  </div>

                  {measurement.photo_urls && measurement.photo_urls.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mt-3">
                      {measurement.photo_urls.slice(0, 4).map((url: string, idx: number) => (
                        <img
                          key={idx}
                          src={url}
                          alt={`Photo ${idx + 1}`}
                          className="w-full h-20 object-cover rounded"
                        />
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {measurement.approved_by_edison && (
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                        ✓ Edison: {new Date(measurement.approved_at_edison).toLocaleDateString()}
                      </span>
                    )}
                    {measurement.approved_by_felipe && (
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                        ✓ Felipe: {new Date(measurement.approved_at_felipe).toLocaleDateString()}
                      </span>
                    )}
                    {measurement.approved_by_claudia && (
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                        ✓ Claudia: {new Date(measurement.approved_at_claudia).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => generateMeasurementPDF(measurement)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    PDF
                  </Button>
                  {canApprove && (
                    <>
                      {measurement.status === 'pending' && profile?.role === 'infrastructure' && (
                        <Button
                          size="sm"
                          onClick={() => handleApprove(measurement.id, 'edison')}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve (Edison)
                        </Button>
                      )}
                      {measurement.status === 'approved_edison' && (
                        <Button
                          size="sm"
                          onClick={() => handleApprove(measurement.id, 'felipe')}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve (Felipe)
                        </Button>
                      )}
                      {measurement.status === 'approved_felipe' && (
                        <Button
                          size="sm"
                          onClick={() => handleApprove(measurement.id, 'claudia')}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve (Claudia)
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {measurements.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No measurements yet</h3>
            <p className="text-gray-500 mb-4">Create your first measurement to get started</p>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="w-5 h-5 mr-2" />
              New Measurement
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
        title="New Measurement"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Title"
            placeholder="Measurement title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            fullWidth
            required
          />

          <Select
            label="Site (Optional)"
            value={formData.site_id}
            onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
            options={[
              { value: '', label: 'Select a site' },
              ...sites.map((site) => ({ value: site.id, label: site.name })),
            ]}
            fullWidth
          />

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Length (m)"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.length}
              onChange={(e) => setFormData({ ...formData, length: e.target.value })}
              fullWidth
            />
            <Input
              label="Height (m)"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.height}
              onChange={(e) => setFormData({ ...formData, height: e.target.value })}
              fullWidth
            />
            <Input
              label="Depth (m)"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.depth}
              onChange={(e) => setFormData({ ...formData, depth: e.target.value })}
              fullWidth
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photos (will be watermarked)
            </label>
            <FileUpload
              bucket="images"
              folder="measurements"
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
              Create Measurement
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

