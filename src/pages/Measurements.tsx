import { useState, useEffect } from 'react';
import { Plus, Download, CheckCircle, Camera, X } from 'lucide-react';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Textarea } from '../atoms/Textarea';
import { Select } from '../atoms/Select';
import { Modal } from '../molecules/Modal';
import { Badge } from '../atoms/Badge';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Measurement, Task, Site } from '../types';
import { addWatermarkToImage } from '../services/watermark';
import { generateCutPDF } from '../services/pdfGenerator';

export const Measurements = () => {
  const { profile } = useAuth();
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [sites, setSites] = useState<Site[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    site_id: '',
    task_id: '',
    measurement_unit: 'm' as 'm' | 'm²' | 'm³',
    length: '',
    height: '',
    width: '',
    depth: '',
    activities: '',
    globales: '',
    admin_hours: '',
    observations: '',
    how_to_do: '',
    cut_value: '',
    photo_height: null as File | null,
    photo_length: null as File | null,
    photo_width: null as File | null,
    photo_general: null as File | null,
  });
  const [photoUrls, setPhotoUrls] = useState({
    height: '',
    length: '',
    width: '',
    general: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [measurementsResult, sitesResult, tasksResult] = await Promise.all([
      supabase
        .from('measurements')
        .select('*, site:sites(id, name, location), task:tasks(id, title)')
        .order('created_at', { ascending: false }),
      supabase.from('sites').select('*').order('name'),
      supabase.from('tasks').select('id, title, site_id').order('created_at', { ascending: false }),
    ]);

    if (!measurementsResult.error && measurementsResult.data) {
      setMeasurements(measurementsResult.data as any);
    }
    if (!sitesResult.error && sitesResult.data) {
      setSites(sitesResult.data);
    }
    if (!tasksResult.error && tasksResult.data) {
      setTasks(tasksResult.data);
    }
    setLoading(false);
  };

  const handlePhotoUpload = async (file: File, type: 'height' | 'length' | 'width' | 'general') => {
    try {
      const watermarkedUrl = await addWatermarkToImage(file);
      setPhotoUrls((prev) => ({ ...prev, [type]: watermarkedUrl }));
      
      // Actualizar formData con el archivo
      setFormData((prev) => ({
        ...prev,
        [`photo_${type}`]: file,
      }));
    } catch (error) {
      console.error(`Error uploading ${type} photo:`, error);
      alert(`Error al subir la foto de ${type}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const length = formData.length ? parseFloat(formData.length) : null;
    const height = formData.height ? parseFloat(formData.height) : null;
    const width = formData.width ? parseFloat(formData.width) : null;
    const depth = formData.depth ? parseFloat(formData.depth) : null;

    let calculated_area = null;
    let calculated_volume = null;

    // Calcular según unidad de medida
    if (formData.measurement_unit === 'm') {
      // Metros lineales: solo longitud
      // No hay cálculo adicional
    } else if (formData.measurement_unit === 'm²') {
      // Metros cuadrados: largo x ancho
      if (length && width) {
        calculated_area = length * width;
      } else if (length && height) {
        calculated_area = length * height;
      }
    } else if (formData.measurement_unit === 'm³') {
      // Metros cúbicos: largo x ancho x profundidad
      if (length && width && depth) {
        calculated_volume = length * width * depth;
        calculated_area = length * width;
      } else if (length && height && depth) {
        calculated_volume = length * height * depth;
        calculated_area = length * height;
      }
    }

    const measurementData: any = {
      title: formData.title,
      site_id: formData.site_id || null,
      task_id: formData.task_id || null,
      measurement_unit: formData.measurement_unit,
      length,
      height,
      width,
      depth,
      calculated_area,
      calculated_volume,
      activities: formData.activities || null,
      globales: formData.globales || null,
      admin_hours: formData.admin_hours ? parseFloat(formData.admin_hours) : null,
      observations: formData.observations || null,
      how_to_do: formData.how_to_do || null,
      cut_value: formData.cut_value ? parseFloat(formData.cut_value) : null,
      photo_height_url: photoUrls.height || null,
      photo_length_url: photoUrls.length || null,
      photo_width_url: photoUrls.width || null,
      photo_general_url: photoUrls.general || null,
      photo_urls: [photoUrls.height, photoUrls.length, photoUrls.width, photoUrls.general].filter(Boolean),
      created_by: profile.id,
      status: 'pending',
      submitted_at: new Date().toISOString(),
    };

    const { data: insertedData, error } = await supabase
      .from('measurements')
      .insert([measurementData])
      .select()
      .single();

    if (error) {
      console.error('Error creating measurement:', error);
      alert('Error al crear el corte');
      return;
    }

    // Generar PDF del corte
    const cutWithRelations = {
      ...insertedData,
      site: sites.find((s) => s.id === formData.site_id),
      task: tasks.find((t) => t.id === formData.task_id),
    };

    try {
      const pdfBlob = await generateCutPDF(cutWithRelations);
      
      // Subir PDF a Supabase Storage
      const pdfFileName = `cortes/${Date.now()}-${formData.title.replace(/\s+/g, '_')}.pdf`;
      const { data: pdfUploadData, error: pdfUploadError } = await supabase.storage
        .from('documents')
        .upload(pdfFileName, pdfBlob, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (pdfUploadError) {
        console.error('Error uploading PDF:', pdfUploadError);
      } else {
        const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(pdfFileName);
        
        // Actualizar measurement con URL del PDF
        await supabase
          .from('measurements')
          .update({ pdf_url: publicUrl })
          .eq('id', insertedData.id);

        // Guardar PDF en sites
        if (formData.site_id) {
          const site = sites.find((s) => s.id === formData.site_id);
          if (site) {
            const currentPdfUrls = site.cut_pdf_urls || [];
            const updatedPdfUrls = [...currentPdfUrls, publicUrl];
            await supabase
              .from('sites')
              .update({ cut_pdf_urls: updatedPdfUrls })
              .eq('id', formData.site_id);
          }
        }
      }
    } catch (pdfError) {
      console.error('Error generating PDF:', pdfError);
    }

    // Enviar notificación por correo a Edison
    try {
      const photos = [photoUrls.height, photoUrls.length, photoUrls.width, photoUrls.general].filter(Boolean);
      const token = localStorage.getItem('token');
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/notifications/cut-approval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          cutId: insertedData.id,
          cutTitle: formData.title,
          cutValue: formData.cut_value || 0,
          photos,
          siteName: sites.find((s) => s.id === formData.site_id)?.name,
          taskTitle: tasks.find((t) => t.id === formData.task_id)?.title,
        }),
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }

    setShowModal(false);
    resetForm();
    loadData();
  };

  const handleApprove = async (id: string, level: 'edison' | 'felipe' | 'claudia') => {
    if (!profile) return;

    const updateData: any = {};
    const newStatus = `approved_${level}`;

    if (level === 'edison') {
      updateData.approved_by_edison = profile.id;
      updateData.approved_at_edison = new Date().toISOString();
      updateData.status = 'approved_edison';
      // Aquí se podría agregar la firma digital de Edison
      // updateData.edison_signature_url = signatureUrl;
    } else if (level === 'felipe') {
      updateData.approved_by_felipe = profile.id;
      updateData.approved_at_felipe = new Date().toISOString();
      updateData.status = 'approved_felipe';
    } else if (level === 'claudia') {
      updateData.approved_by_claudia = profile.id;
      updateData.approved_at_claudia = new Date().toISOString();
      updateData.status = 'approved_claudia';
    }

    const { error, data } = await supabase
      .from('measurements')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (!error) {
      // Si Edison aprobó, notificar a Felipe (y otros si el valor supera 10M)
      if (level === 'edison' && data) {
        try {
          const token = localStorage.getItem('token');
          await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/notifications/cut-edison-approved`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              cutId: data.id,
              cutTitle: data.title,
              cutValue: data.cut_value || 0,
              siteName: data.site?.name,
              taskTitle: data.task?.title,
            }),
          });
        } catch (error) {
          console.error('Error sending approval notification:', error);
        }
      }
      loadData();
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      site_id: '',
      task_id: '',
      measurement_unit: 'm',
      length: '',
      height: '',
      width: '',
      depth: '',
      activities: '',
      globales: '',
      admin_hours: '',
      observations: '',
      how_to_do: '',
      cut_value: '',
      photo_height: null,
      photo_length: null,
      photo_width: null,
      photo_general: null,
    });
    setPhotoUrls({
      height: '',
      length: '',
      width: '',
      general: '',
    });
  };

  const handleDownloadPDF = async (measurement: Measurement) => {
    if (measurement.pdf_url) {
      window.open(measurement.pdf_url, '_blank');
    } else {
      // Generar PDF on-the-fly si no existe
      const measurementWithRelations = {
        ...measurement,
        site: sites.find((s) => s.id === measurement.site_id),
        task: tasks.find((t) => t.id === measurement.task_id),
      };
      const pdfBlob = await generateCutPDF(measurementWithRelations);
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Corte_${measurement.title}_${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    }
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
          <h1 className="text-3xl font-bold text-[#50504f]">Cortes de Obra</h1>
          <p className="text-gray-600 mt-1">Registro de cortes con medidas y evidencias fotográficas</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-5 h-5 mr-2" />
          Nuevo Corte
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
                    {measurement.measurement_unit && (
                      <Badge variant="default">{measurement.measurement_unit}</Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm mb-3">
                    {measurement.length && (
                      <div>
                        <p className="text-gray-500 text-xs">Longitud</p>
                        <p className="font-medium text-[#50504f]">{measurement.length}m</p>
                      </div>
                    )}
                    {measurement.height && (
                      <div>
                        <p className="text-gray-500 text-xs">Altura</p>
                        <p className="font-medium text-[#50504f]">{measurement.height}m</p>
                      </div>
                    )}
                    {measurement.width && (
                      <div>
                        <p className="text-gray-500 text-xs">Ancho</p>
                        <p className="font-medium text-[#50504f]">{measurement.width}m</p>
                      </div>
                    )}
                    {measurement.depth && (
                      <div>
                        <p className="text-gray-500 text-xs">Profundidad</p>
                        <p className="font-medium text-[#50504f]">{measurement.depth}m</p>
                      </div>
                    )}
                    {measurement.calculated_area && (
                      <div>
                        <p className="text-gray-500 text-xs">Área</p>
                        <p className="font-medium text-[#50504f]">{measurement.calculated_area.toFixed(2)}m²</p>
                      </div>
                    )}
                    {measurement.calculated_volume && (
                      <div>
                        <p className="text-gray-500 text-xs">Volumen</p>
                        <p className="font-medium text-[#50504f]">{measurement.calculated_volume.toFixed(2)}m³</p>
                      </div>
                    )}
                  </div>

                  {measurement.cut_value && (
                    <div className="mb-3">
                      <p className="text-gray-500 text-xs">Valor del Corte</p>
                      <p className="font-bold text-lg text-[#cf1b22]">
                        ${measurement.cut_value.toLocaleString('es-CO')}
                      </p>
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
                    onClick={() => handleDownloadPDF(measurement)}
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
                          Aprobar (Edison)
                        </Button>
                      )}
                      {measurement.status === 'approved_edison' && (
                        <Button
                          size="sm"
                          onClick={() => handleApprove(measurement.id, 'felipe')}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Aprobar (Felipe)
                        </Button>
                      )}
                      {measurement.status === 'approved_felipe' && (
                        <Button
                          size="sm"
                          onClick={() => handleApprove(measurement.id, 'claudia')}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Aprobar (Claudia)
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
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No hay cortes registrados</h3>
            <p className="text-gray-500 mb-4">Crea tu primer corte para comenzar</p>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="w-5 h-5 mr-2" />
              Nuevo Corte
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
        title="Nuevo Corte de Obra"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Título del Corte"
            placeholder="Ej: Corte de muro principal"
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

          <Select
            label="Tarea Asociada (Opcional)"
            value={formData.task_id}
            onChange={(e) => setFormData({ ...formData, task_id: e.target.value })}
            options={[
              { value: '', label: 'Seleccione una tarea' },
              ...tasks
                .filter((t) => !formData.site_id || t.site_id === formData.site_id)
                .map((task) => ({ value: task.id, label: task.title })),
            ]}
            fullWidth
          />

          <Select
            label="Unidad de Medida *"
            value={formData.measurement_unit}
            onChange={(e) => setFormData({ ...formData, measurement_unit: e.target.value as 'm' | 'm²' | 'm³' })}
            options={[
              { value: 'm', label: 'Metros Lineales (m)' },
              { value: 'm²', label: 'Metros Cuadrados (m²)' },
              { value: 'm³', label: 'Metros Cúbicos (m³)' },
            ]}
            fullWidth
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Longitud (m)"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.length}
              onChange={(e) => setFormData({ ...formData, length: e.target.value })}
              fullWidth
            />
            <Input
              label="Altura (m)"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.height}
              onChange={(e) => setFormData({ ...formData, height: e.target.value })}
              fullWidth
            />
            {(formData.measurement_unit === 'm²' || formData.measurement_unit === 'm³') && (
              <>
                <Input
                  label="Ancho (m)"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.width}
                  onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                  fullWidth
                />
                {formData.measurement_unit === 'm³' && (
                  <Input
                    label="Profundidad (m)"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.depth}
                    onChange={(e) => setFormData({ ...formData, depth: e.target.value })}
                    fullWidth
                  />
                )}
              </>
            )}
          </div>

          <Textarea
            label="Actividades"
            placeholder="Describa las actividades realizadas"
            value={formData.activities}
            onChange={(e) => setFormData({ ...formData, activities: e.target.value })}
            fullWidth
            rows={3}
          />

          <Textarea
            label="Globales"
            placeholder="Información global del corte"
            value={formData.globales}
            onChange={(e) => setFormData({ ...formData, globales: e.target.value })}
            fullWidth
            rows={3}
          />

          <Input
            label="Horas por Administración"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={formData.admin_hours}
            onChange={(e) => setFormData({ ...formData, admin_hours: e.target.value })}
            fullWidth
          />

          <Textarea
            label="Observaciones"
            placeholder="Observaciones adicionales"
            value={formData.observations}
            onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
            fullWidth
            rows={3}
          />

          <Textarea
            label="Cómo se Realiza"
            placeholder="Describa cómo se realiza el corte"
            value={formData.how_to_do}
            onChange={(e) => setFormData({ ...formData, how_to_do: e.target.value })}
            fullWidth
            rows={3}
          />

          <Input
            label="Valor del Corte (COP)"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={formData.cut_value}
            onChange={(e) => setFormData({ ...formData, cut_value: e.target.value })}
            fullWidth
          />

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Foto de Altura (con marca de agua)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePhotoUpload(file, 'height');
                  }}
                  className="hidden"
                  id="photo-height"
                />
                <label htmlFor="photo-height">
                  <Button type="button" variant="secondary" as="span">
                    <Camera className="w-4 h-4 mr-2" />
                    Subir Foto
                  </Button>
                </label>
                {photoUrls.height && (
                  <div className="flex items-center gap-2">
                    <img src={photoUrls.height} alt="Altura" className="w-20 h-20 object-cover rounded" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPhotoUrls((prev) => ({ ...prev, height: '' }))}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Foto de Longitud (con marca de agua)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePhotoUpload(file, 'length');
                  }}
                  className="hidden"
                  id="photo-length"
                />
                <label htmlFor="photo-length">
                  <Button type="button" variant="secondary" as="span">
                    <Camera className="w-4 h-4 mr-2" />
                    Subir Foto
                  </Button>
                </label>
                {photoUrls.length && (
                  <div className="flex items-center gap-2">
                    <img src={photoUrls.length} alt="Longitud" className="w-20 h-20 object-cover rounded" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPhotoUrls((prev) => ({ ...prev, length: '' }))}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {(formData.measurement_unit === 'm²' || formData.measurement_unit === 'm³') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Foto de Ancho (con marca de agua)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePhotoUpload(file, 'width');
                    }}
                    className="hidden"
                    id="photo-width"
                  />
                  <label htmlFor="photo-width">
                    <Button type="button" variant="secondary" as="span">
                      <Camera className="w-4 h-4 mr-2" />
                      Subir Foto
                    </Button>
                  </label>
                  {photoUrls.width && (
                    <div className="flex items-center gap-2">
                      <img src={photoUrls.width} alt="Ancho" className="w-20 h-20 object-cover rounded" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setPhotoUrls((prev) => ({ ...prev, width: '' }))}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Foto General (con marca de agua)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePhotoUpload(file, 'general');
                  }}
                  className="hidden"
                  id="photo-general"
                />
                <label htmlFor="photo-general">
                  <Button type="button" variant="secondary" as="span">
                    <Camera className="w-4 h-4 mr-2" />
                    Subir Foto
                  </Button>
                </label>
                {photoUrls.general && (
                  <div className="flex items-center gap-2">
                    <img src={photoUrls.general} alt="General" className="w-20 h-20 object-cover rounded" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPhotoUrls((prev) => ({ ...prev, general: '' }))}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
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
              Registrar Corte
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
