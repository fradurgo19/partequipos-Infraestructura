import React from 'react';
import { Input } from '../atoms/Input';
import { Select } from '../atoms/Select';
import { Textarea } from '../atoms/Textarea';
import { Button } from '../atoms/Button';
import { FileUpload } from '../molecules/FileUpload';
import { INTERNAL_REQUEST_DEPARTMENTS } from '../constants/internalRequestDepartments';
import { InternalRequestFormData } from '../types/internalRequestForm';

interface SiteOption {
  id: string;
  name: string;
}

interface InternalRequestFormProps {
  sites: SiteOption[];
  formData: InternalRequestFormData;
  onChange: (data: InternalRequestFormData) => void;
  onSubmit: (event: React.FormEvent) => void;
  submitting?: boolean;
  sitesLoading?: boolean;
  uploadMode?: 'authenticated' | 'public';
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
}

export const InternalRequestForm = ({
  sites,
  formData,
  onChange,
  onSubmit,
  submitting = false,
  sitesLoading = false,
  uploadMode = 'authenticated',
  onCancel,
  submitLabel = 'Enviar Solicitud',
  cancelLabel = 'Cancelar',
}: InternalRequestFormProps) => {
  const updateField = <K extends keyof InternalRequestFormData>(field: K, value: InternalRequestFormData[K]) => {
    onChange({ ...formData, [field]: value });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input
        label="Título"
        placeholder="Título de la solicitud"
        value={formData.title}
        onChange={(e) => updateField('title', e.target.value)}
        fullWidth
        required
      />

      <Select
        label="Sede *"
        value={formData.site_id}
        onChange={(e) => updateField('site_id', e.target.value)}
        options={
          sitesLoading
            ? [{ value: '', label: 'Cargando sedes...' }]
            : [
                { value: '', label: 'Seleccione una sede' },
                ...sites.map((site) => ({ value: site.id, label: site.name })),
              ]
        }
        fullWidth
        required
        disabled={sitesLoading}
      />

      <Input
        label="Fecha Solicitud"
        type="date"
        value={formData.request_date}
        onChange={(e) => updateField('request_date', e.target.value)}
        fullWidth
        required
      />

      <Select
        label="Departamento *"
        value={formData.department}
        onChange={(e) => updateField('department', e.target.value)}
        options={[
          { value: '', label: 'Seleccione un departamento' },
          ...INTERNAL_REQUEST_DEPARTMENTS.map((dept) => ({ value: dept, label: dept })),
        ]}
        fullWidth
        required
      />

      <Input
        label="Nombre de quien solicita *"
        placeholder="Nombre de quien solicita"
        value={formData.requester_name}
        onChange={(e) => updateField('requester_name', e.target.value)}
        fullWidth
        required
      />

      <Textarea
        label="Descripción *"
        placeholder="Describe tu solicitud en detalle"
        value={formData.description}
        onChange={(e) => updateField('description', e.target.value)}
        fullWidth
        required
        rows={4}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input
          label="Alto (m)"
          type="number"
          step="0.01"
          placeholder="0.00"
          value={formData.measurement_height}
          onChange={(e) => updateField('measurement_height', e.target.value)}
          fullWidth
        />
        <Input
          label="Ancho (m)"
          type="number"
          step="0.01"
          placeholder="0.00"
          value={formData.measurement_length}
          onChange={(e) => updateField('measurement_length', e.target.value)}
          fullWidth
        />
        <Input
          label="Profundo (m)"
          type="number"
          step="0.01"
          placeholder="0.00"
          value={formData.measurement_depth}
          onChange={(e) => updateField('measurement_depth', e.target.value)}
          fullWidth
        />
      </div>

      <fieldset className="border-0 p-0 m-0">
        <legend className="block text-sm font-medium text-gray-700 mb-2">Fotos</legend>
        <FileUpload
          bucket="general"
          folder="internal-requests"
          multiple
          accept="image/*"
          uploadMode={uploadMode}
          onUploadComplete={(urls) => {
            updateField('photo_urls', [...formData.photo_urls, ...urls]);
          }}
          existingFiles={formData.photo_urls}
          onRemove={(url) => {
            updateField(
              'photo_urls',
              formData.photo_urls.filter((item) => item !== url)
            );
          }}
        />
      </fieldset>

      <fieldset className="border-0 p-0 m-0">
        <legend className="block text-sm font-medium text-gray-700 mb-2">Subida de Diseño</legend>
        <FileUpload
          bucket="general"
          folder="designs"
          multiple
          uploadMode={uploadMode}
          onUploadComplete={(urls) => {
            updateField('design_urls', [...formData.design_urls, ...urls]);
          }}
          existingFiles={formData.design_urls}
          onRemove={(url) => {
            updateField(
              'design_urls',
              formData.design_urls.filter((item) => item !== url)
            );
          }}
        />
      </fieldset>

      <div className="flex gap-3 pt-4">
        {onCancel && (
          <Button type="button" variant="ghost" fullWidth onClick={onCancel} disabled={submitting}>
            {cancelLabel}
          </Button>
        )}
        <Button type="submit" fullWidth isLoading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
};
