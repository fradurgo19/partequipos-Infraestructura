import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Plus, Trash2 } from 'lucide-react';
import { Input } from '../../atoms/Input';
import { Select } from '../../atoms/Select';
import { Textarea } from '../../atoms/Textarea';
import { Button } from '../../atoms/Button';
import { Card } from '../../atoms/Card';
import { FileUpload } from '../molecules/FileUpload';
import { UtilityBillFormData, ServiceType } from '../types';
import { validateBillForm, hasValidationErrors, ValidationErrors } from '../utils/validators';
import { parseCurrencyInput, getCurrentPeriod, formatCurrency } from '../utils/formatters';
import { billService, uploadBillDocument } from '../services/billService';
import { useBillSiteLocations } from '../hooks/useBillSiteLocations';
import { resolveBillLocationFromStored, findBillLocationEntry } from '../constants/billLocations';

const initialFormData: UtilityBillFormData = {
  description: '',
  period: getCurrentPeriod(),
  invoiceNumber: '',
  contractNumber: '',
  costCenter: 'Administración',
  city: '',
  businessGroup: '',
  location: '',
  siteId: undefined,
  dueDate: '',
  attachedDocument: null,
  status: 'draft',
  notes: '',
  consumptions: [
    {
      serviceType: 'electricity',
      provider: '',
      periodFrom: '',
      periodTo: '',
      value: '',
      totalAmount: '',
      consumption: '',
      unitOfMeasure: 'kWh'
    }
  ]
};

type SelectOption = { value: string; label: string };

const sortSelectOptions = <T extends SelectOption>(options: T[]): T[] =>
  [...options].sort((a, b) =>
    a.label.localeCompare(b.label, 'es', { sensitivity: 'base' })
  );

export interface BillFormProps {
  billId?: string;
  initialData?: UtilityBillFormData;
}

export const BillForm: React.FC<BillFormProps> = ({ billId, initialData }) => {
  const [formData, setFormData] = useState<UtilityBillFormData>(initialData ?? initialFormData);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const navigate = useNavigate();
  const isEditMode = Boolean(billId);
  const { catalog, loading: locationsLoading, cities, getBusinessGroups, getAddresses } =
    useBillSiteLocations();

  const generateRowId = () =>
    globalThis.crypto?.randomUUID?.() ?? `consumption-${Math.random().toString(36).slice(2, 11)}`;

  const [consumptionRowIds, setConsumptionRowIds] = useState<string[]>(() =>
    Array.from(
      { length: (initialData?.consumptions?.length ?? initialFormData.consumptions.length) },
      generateRowId
    )
  );

  const serviceTypeOptionsRaw = [
    { value: 'electricity', label: 'Energía' },
    { value: 'water', label: 'Acueducto' },
    { value: 'gas', label: 'Gas' },
    { value: 'internet', label: 'Internet' },
    { value: 'phone', label: 'Teléfono' },
    { value: 'cellular', label: 'Celular' },
    { value: 'waste', label: 'Aseo' },
    { value: 'sewer', label: 'Alcantarillado' },
    { value: 'public_lighting', label: 'Alumbrado Público' },
    { value: 'security', label: 'Seguridad' },
    { value: 'administration', label: 'Administración' },
    { value: 'rent', label: 'Arrendamiento' },
    { value: 'other', label: 'Otro' }
  ];
  const serviceTypeOptions = sortSelectOptions(serviceTypeOptionsRaw);

  const unitOptions = [
    { value: 'kWh', label: 'kWh' },
    { value: 'm³', label: 'm³' },
    { value: 'GB', label: 'GB' },
    { value: 'minutes', label: 'Minutos' },
    { value: 'units', label: 'Unidades' },
    { value: 'other', label: 'Otro' }
  ];

  const cityOptions = useMemo(
    () => cities.map((city) => ({ value: city, label: city })),
    [cities]
  );

  const businessGroupOptions = useMemo(() => {
    if (!formData.city) return [];
    return getBusinessGroups(formData.city).map((group) => ({
      value: group,
      label: group
    }));
  }, [formData.city, getBusinessGroups]);

  const locationAddressOptions = useMemo(() => {
    if (!formData.city || !formData.businessGroup) return [];
    return getAddresses(formData.city, formData.businessGroup).map((entry) => ({
      value: entry.address,
      label: entry.address,
      title: entry.address,
    }));
  }, [formData.city, formData.businessGroup, getAddresses]);

  useEffect(() => {
    if (!isEditMode || locationsLoading || !initialData?.location) {
      return;
    }

    const resolved = resolveBillLocationFromStored(
      initialData.location,
      initialData.city,
      initialData.businessGroup,
      catalog
    );

    if (!resolved.city) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      city: resolved.city,
      businessGroup: resolved.businessGroup,
      location: resolved.address,
      siteId: resolved.siteId ?? initialData?.siteId,
    }));
  }, [catalog, locationsLoading, isEditMode, initialData]);

  const providerOptionsRaw: Record<ServiceType, Array<{ value: string; label: string }>> = {
    electricity: [
      { value: 'EPM (Empresas Públicas de Medellín)', label: 'EPM (Empresas Públicas de Medellín)' },
      { value: 'Enel Colombia (Codensa)', label: 'Enel Colombia (Codensa) - Bogotá, Cundinamarca, Tolima' },
      { value: 'Enel Colombia S.A. E.S.P.', label: 'Enel Colombia S.A. E.S.P.' },
      { value: 'Celsia', label: 'Celsia (Valle del Cauca, Tolima, Caribe)' },
      { value: 'EMCALI', label: 'EMCALI (Empresas Municipales de Cali E.I.C.E. E.S.P.)' },
      { value: 'CHEC', label: 'CHEC - Central Hidroeléctrica de Caldas (Eje cafetero)' },
      { value: 'Air-e', label: 'Air-e (Atlántico, La Guajira, Magdalena)' },
      { value: 'Air-e S.A.S. (SS PCOS Barranquilla)', label: 'Air-e S.A.S. (SS PCOS Barranquilla)' },
      { value: 'Afinia', label: 'Afinia - Grupo EPM (Bolívar, Sucre, Cesar, Córdoba, parte de Magdalena)' },
      { value: 'Grupo Afinia EPM Caribe Mar de la Costa S.A.S. E.S.P.', label: 'Grupo Afinia EPM Caribe Mar de la Costa S.A.S. E.S.P.' },
      { value: 'EMSA', label: 'EMSA - Electrificadora del Meta (Meta)' },
      { value: 'ESSA', label: 'ESSA - Electrificadora de Santander (Santander, Norte de Santander)' },
      { value: 'CEDENAR', label: 'CEDENAR (Nariño)' },
      { value: 'EDEQ', label: 'EDEQ - Energía del Quindío (Quindío)' }
    ],
    water: [
      { value: 'ASACUHAN', label: 'ASACUHAN (ASOCIACION DE SUSCRIPTORES DEL ACUEDUCTO HONDITA HOJAS ANCHAS)' },
      { value: 'EAAB', label: 'Empresa de Acueducto y Alcantarillado de Bogotá-ESP' },
      { value: 'EPM', label: 'EPM (Medellín y municipios de Antioquia)' },
      { value: 'EMCALI', label: 'EMCALI (Empresas Municipales de Cali E.I.C.E. E.S.P.)' },
      { value: 'Acuacar', label: 'Acuacar - Aguas de Cartagena (Cartagena)' },
      { value: 'Triple AAA', label: 'Triple AAA (Barranquilla y Atlántico)' },
      { value: 'Metroagua', label: 'Metroagua/Veolia (Santa Marta)' },
      { value: 'Aguas de Manizales', label: 'Aguas de Manizales (Manizales)' },
      { value: 'IBAL', label: 'IBAL (Ibagué)' },
      { value: 'Veolia Aguas de Monteria S.A. E.S.P.', label: 'Veolia Aguas de Monteria S.A. E.S.P.' }
    ],
    gas: [
      { value: 'EPM (Empresas Públicas de Medellín)', label: 'EPM (Empresas Públicas de Medellín)' },
      { value: 'Vanti', label: 'Vanti (Bogotá, Cundinamarca, Boyacá, Santander)' },
      { value: 'Promigas', label: 'Promigas (Costa Caribe, Valle del Cauca, Cauca)' },
      { value: 'Alcanos', label: 'Alcanos de Colombia (Tolima, Huila, Nariño, Boyacá)' },
      { value: 'GASES DEL CARIBE S.A. E.S.P.', label: 'GASES DEL CARIBE S.A. E.S.P.' },
      { value: 'Gases de Occidente', label: 'Gases de Occidente (Valle del Cauca)' },
      { value: 'Surtigas', label: 'Surtigas (Bolívar, Córdoba, Sucre)' },
      { value: 'GdO', label: 'Gas Natural del Oriente - GdO (Santander, Norte de Santander)' }
    ],
    internet: [
      { value: 'Claro', label: 'Claro (Cobertura nacional)' },
      { value: 'Movistar', label: 'Movistar (Cobertura nacional)' },
      { value: 'Tigo-UNE', label: 'Tigo-UNE (Cobertura nacional)' },
      { value: 'ETB', label: 'ETB (Principalmente Bogotá)' },
      { value: 'WOM', label: 'WOM (Ciudades principales)' },
      { value: 'Emcali Telecomunicaciones', label: 'Emcali Telecomunicaciones (Cali)' },
      { value: 'Starlink', label: 'Starlink (Internet satelital)' }
    ],
    phone: [
      { value: 'Claro', label: 'Claro (Cobertura nacional)' },
      { value: 'Movistar', label: 'Movistar (Cobertura nacional)' },
      { value: 'Tigo-UNE', label: 'Tigo-UNE (Cobertura nacional)' },
      { value: 'ETB', label: 'ETB (Principalmente Bogotá)' },
      { value: 'WOM', label: 'WOM (Ciudades principales)' }
    ],
    cellular: [
      { value: 'Claro', label: 'Claro (Cobertura nacional)' },
      { value: 'Movistar', label: 'Movistar (Cobertura nacional)' },
      { value: 'Tigo-UNE', label: 'Tigo-UNE (Cobertura nacional)' },
      { value: 'WOM', label: 'WOM (Ciudades principales)' }
    ],
    waste: [
      { value: 'Triple AAA', label: 'Triple AAA (Barranquilla y Atlántico)' },
      { value: 'EPM (Empresas Públicas de Medellín)', label: 'EPM (Empresas Públicas de Medellín)' },
      { value: 'EMCALI', label: 'EMCALI (Empresas Municipales de Cali E.I.C.E. E.S.P.)' },
      { value: 'Urbaser', label: 'Urbaser (Tunja, Bucaramanga, etc.)' },
      { value: 'Interaseo', label: 'Interaseo (Varias regiones)' },
      { value: 'Emvarias', label: 'Emvarias - Grupo EPM (Medellín y área metropolitana)' },
      { value: 'Promoambiental', label: 'Promoambiental Distrito (Zonas de Bogotá)' },
      { value: 'Ciudad Limpia', label: 'Ciudad Limpia (Bogotá, Cali, otros)' },
      { value: 'Ciudad Limpia Bogota S.A. E.S.P.', label: 'Ciudad Limpia Bogota S.A. E.S.P.' },
      { value: 'Bogotá Limpia', label: 'Bogotá Limpia (Bogotá)' },
      { value: 'Air-e S.A.S. (SS PCOS Barranquilla)', label: 'Air-e S.A.S. (SS PCOS Barranquilla)' },
      { value: 'Grupo Afinia EPM Caribe Mar de la Costa S.A.S. E.S.P.', label: 'Grupo Afinia EPM Caribe Mar de la Costa S.A.S. E.S.P.' }
    ],
    sewer: [
      { value: 'ASACUHAN', label: 'ASACUHAN (ASOCIACION DE SUSCRIPTORES DEL ACUEDUCTO HONDITA HOJAS ANCHAS)' },
      { value: 'EAAB', label: 'Empresa de Acueducto y Alcantarillado de Bogotá-ESP' },
      { value: 'EPM', label: 'EPM (Medellín y municipios de Antioquia)' },
      { value: 'EMCALI', label: 'EMCALI (Empresas Municipales de Cali E.I.C.E. E.S.P.)' },
      { value: 'Acuacar', label: 'Acuacar - Aguas de Cartagena (Cartagena)' },
      { value: 'Triple AAA', label: 'Triple AAA (Barranquilla y Atlántico)' },
      { value: 'Air-e S.A.S. (SS PCOS Barranquilla)', label: 'Air-e S.A.S. (SS PCOS Barranquilla)' }
    ],
    security: [
      { value: 'Miro', label: 'Miro' },
      { value: 'Prosegur', label: 'Prosegur' },
      { value: 'Atlas', label: 'Atlas' },
      { value: 'Air-e S.A.S. (SS PCOS Barranquilla)', label: 'Air-e S.A.S. (SS PCOS Barranquilla)' },
      { value: 'Grupo Afinia EPM Caribe Mar de la Costa S.A.S. E.S.P.', label: 'Grupo Afinia EPM Caribe Mar de la Costa S.A.S. E.S.P.' }
    ],
    administration: [
      { value: 'Administración', label: 'Administración' }
    ],
    rent: [
      { value: 'Arrendador', label: 'Arrendador' }
    ],
    public_lighting: [
      { value: 'EPM (Empresas Públicas de Medellín)', label: 'EPM (Empresas Públicas de Medellín)' },
      { value: 'Grupo Afinia EPM Caribe Mar de la Costa S.A.S. E.S.P.', label: 'Grupo Afinia EPM Caribe Mar de la Costa S.A.S. E.S.P.' }
    ],
    other: [
      { value: 'EPM (Empresas Públicas de Medellín)', label: 'EPM (Empresas Públicas de Medellín)' },
      { value: 'Otro', label: 'Otro proveedor' }
    ]
  };
  const providerOptions = (Object.keys(providerOptionsRaw) as ServiceType[]).reduce(
    (acc, serviceType) => {
      acc[serviceType] = sortSelectOptions(providerOptionsRaw[serviceType]);
      return acc;
    },
    {} as Record<ServiceType, Array<{ value: string; label: string }>>
  );

  const allProviderOptions = sortSelectOptions(
    Object.entries(providerOptions)
      .filter(([serviceType]) => serviceType !== 'other')
      .flatMap(([, providers]) => providers)
      .filter(
        (provider, index, providersArray) =>
          providersArray.findIndex(
            (item) => item.value === provider.value && item.label === provider.label
          ) === index
      )
  );

  // Obtener proveedores según el tipo de servicio seleccionado
  const updateDescription = (consumptionsData: UtilityBillFormData['consumptions'], contractNumber: string) => {
    const first = consumptionsData[0];
    const serviceTypeLabel = serviceTypeOptions.find(s => s.value === first?.serviceType)?.label || '';
    const parts = [];
    if (serviceTypeLabel) parts.push(serviceTypeLabel);
    if (first?.provider) parts.push(first.provider);
    if (contractNumber) parts.push(contractNumber);
    return parts.join(' - ');
  };

  const handleInputChange = (field: keyof UtilityBillFormData, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'contractNumber') {
        updated.description = updateDescription(prev.consumptions, value);
      }
      return updated;
    });
    
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleCityChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      city: value,
      businessGroup: '',
      location: '',
      siteId: undefined,
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.city;
      delete next.businessGroup;
      delete next.location;
      return next;
    });
  };

  const handleBusinessGroupChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      businessGroup: value,
      location: '',
      siteId: undefined,
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.businessGroup;
      delete next.location;
      return next;
    });
  };

  const handleLocationChange = (value: string) => {
    const entry = findBillLocationEntry(formData.city, formData.businessGroup, value, catalog);
    setFormData((prev) => ({
      ...prev,
      location: value,
      siteId: entry?.siteId,
    }));
    if (errors.location) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.location;
        return next;
      });
    }
  };

  const handleConsumptionChange = (index: number, field: keyof UtilityBillFormData['consumptions'][number], value: string) => {
    if (['value', 'totalAmount', 'consumption'].includes(field) && value !== '') {
      const numericRegex = /^[0-9.,]+$/;
      if (!numericRegex.test(value)) return;
      value = value.replace(',', '.');
    }

    setFormData(prev => {
      const updatedConsumptions: UtilityBillFormData['consumptions'] = [...prev.consumptions];
      const updatedItem: UtilityBillFormData['consumptions'][number] = {
        ...updatedConsumptions[index],
        [field]: value
      };
      if (field === 'value') {
        updatedItem.totalAmount = value;
      }
      updatedConsumptions[index] = updatedItem;
      const newDescription = updateDescription(updatedConsumptions, prev.contractNumber);
      return { ...prev, consumptions: updatedConsumptions, description: newDescription };
    });

    const key = `consumptions.${index}.${field}`;
    if (errors[key]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  const addConsumption = () => {
    setConsumptionRowIds(prev => [...prev, generateRowId()]);
    setFormData(prev => ({
      ...prev,
      consumptions: [
        ...prev.consumptions,
        {
          serviceType: 'electricity',
          provider: '',
          periodFrom: '',
          periodTo: '',
          value: '',
          totalAmount: '',
          consumption: '',
          unitOfMeasure: 'kWh'
        }
      ]
    }));
  };

  const formatWithSeparators = (value: string, maxFractionDigits = 2) => {
    if (!value || !String(value).trim()) return '';
    const numeric = parseCurrencyInput(String(value));
    if (Number.isNaN(numeric)) return value;
    return numeric.toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: maxFractionDigits
    });
  };

  const handleConsumptionBlur = (
    index: number,
    field: keyof UtilityBillFormData['consumptions'][number],
    fractionDigits = 2
  ) => {
    setFormData(prev => {
      const updatedConsumptions: UtilityBillFormData['consumptions'] = [...prev.consumptions];
      const current = updatedConsumptions[index];
      const raw = String(current[field] ?? '');
      const formatted = formatWithSeparators(raw, fractionDigits);
      const next = { ...current, [field]: formatted } as UtilityBillFormData['consumptions'][number];
      if (field === 'value') {
        next.totalAmount = formatted;
      }
      updatedConsumptions[index] = next;
      return { ...prev, consumptions: updatedConsumptions };
    });
  };

  const removeConsumption = (index: number) => {
    setConsumptionRowIds(prev => prev.filter((_, i) => i !== index));
    setFormData(prev => {
      const updated = prev.consumptions.filter((_, i) => i !== index);
      const consumptions = updated.length ? updated : prev.consumptions;
      return {
        ...prev,
        consumptions,
        description: updateDescription(consumptions, prev.contractNumber)
      };
    });
  };

  const handleFileSelect = (file: File | null) => {
    setFormData((prev) => ({ ...prev, attachedDocument: file }));
  };

  const handleExistingDocumentRemove = () => {
    setFormData((prev) => ({
      ...prev,
      attachedDocument: null,
      existingDocumentUrl: undefined,
      existingDocumentName: undefined,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    const validationErrors = validateBillForm(formData);
    if (hasValidationErrors(validationErrors)) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);

    try {
      let documentUrl: string | undefined;
      let documentName: string | undefined;

      if (formData.attachedDocument) {
        const uploadData = await uploadBillDocument(formData.attachedDocument);
        documentUrl = uploadData.url;
        documentName = uploadData.filename;
      } else if (formData.existingDocumentUrl) {
        documentUrl = formData.existingDocumentUrl;
        documentName = formData.existingDocumentName;
      } else if (isEditMode) {
        documentUrl = '';
        documentName = '';
      }

      const mappedConsumptions = formData.consumptions.map((c) => ({
        serviceType: c.serviceType,
        provider: c.provider,
        periodFrom: c.periodFrom,
        periodTo: c.periodTo,
        value: parseCurrencyInput(c.value),
        totalAmount: parseCurrencyInput(c.totalAmount),
        consumption: c.consumption ? Number.parseFloat(c.consumption) : undefined,
        unitOfMeasure: c.unitOfMeasure
      }));

      const billData = {
        description: formData.description,
        period: formData.period,
        invoiceNumber: formData.invoiceNumber,
        contractNumber: formData.contractNumber,
        costCenter: formData.costCenter,
        city: formData.city,
        businessGroup: formData.businessGroup,
        location: formData.location,
        siteId: formData.siteId,
        dueDate: formData.dueDate,
        ...(documentUrl !== undefined ? { documentUrl, documentName } : {}),
        status: 'pending' as const,
        notes: formData.notes,
        consumptions: mappedConsumptions
      };

      if (isEditMode && billId) {
        await billService.update(billId, billData);
      } else {
        await billService.create(billData);
      }
      navigate('/pagos/reports');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar la factura';
      setSubmitError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {submitError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600" role="alert">
          {submitError}
        </div>
      )}

      <Card>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Información de la Factura</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Período (AAAA-MM) *"
            type="month"
            value={formData.period}
            onChange={(e) => handleInputChange('period', e.target.value)}
            error={errors.period}
          />

          <Input
            label="Número de Factura"
            value={formData.invoiceNumber}
            onChange={(e) => handleInputChange('invoiceNumber', e.target.value)}
            placeholder="FAC-12345"
            error={errors.invoiceNumber}
          />

          <Input
            label="Número de Contrato"
            value={formData.contractNumber}
            onChange={(e) => handleInputChange('contractNumber', e.target.value)}
            placeholder="CTR-12345"
            error={errors.contractNumber}
          />

          <Input
            label="Descripción (generada automáticamente)"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Se genera automáticamente"
            disabled
          />
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Montos y Consumos</h2>
          <Button type="button" size="sm" onClick={addConsumption}>
            <Plus className="w-4 h-4 mr-2" />
            Agregar consumo
          </Button>
        </div>
        <div className="space-y-6">
          {formData.consumptions.map((consumption, idx) => {
            const providers = consumption.serviceType === 'other'
              ? allProviderOptions
              : providerOptions[consumption.serviceType] || [];
            return (
              <div key={consumptionRowIds[idx]} className="border border-gray-200 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">Consumo #{idx + 1}</p>
                  {formData.consumptions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeConsumption(idx)}
                      className="text-[#cf1b22] hover:text-[#7f0c12] inline-flex items-center text-sm"
                    >
                      <Trash2 className="w-4 h-4 mr-1" /> Eliminar
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Tipo de Servicio *"
                    value={consumption.serviceType}
                    options={serviceTypeOptions}
                    onChange={(e) => handleConsumptionChange(idx, 'serviceType', e.target.value)}
                    error={errors[`consumptions.${idx}.serviceType`]}
                  />
                  <Select
                    label="Proveedor *"
                    value={consumption.provider}
                    options={providers}
                    onChange={(e) => handleConsumptionChange(idx, 'provider', e.target.value)}
                    placeholder="Seleccione un proveedor"
                    error={errors[`consumptions.${idx}.provider`]}
                  />
                  <Input
                    label="Período de consumo (Desde) *"
                    type="date"
                    value={consumption.periodFrom}
                    onChange={(e) => handleConsumptionChange(idx, 'periodFrom', e.target.value)}
                    error={errors[`consumptions.${idx}.periodFrom`]}
                  />
                  <Input
                    label="Período de consumo (Hasta) *"
                    type="date"
                    value={consumption.periodTo}
                    onChange={(e) => handleConsumptionChange(idx, 'periodTo', e.target.value)}
                    error={errors[`consumptions.${idx}.periodTo`]}
                  />
                  <Input
                    label="Monto *"
                    type="text"
                    inputMode="decimal"
                    value={consumption.value}
                    onChange={(e) => handleConsumptionChange(idx, 'value', e.target.value)}
                    onBlur={() => handleConsumptionBlur(idx, 'value', 2)}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                    placeholder="0.00"
                    error={errors[`consumptions.${idx}.value`]}
                  />
                  <Input
                    label="Consumo"
                    type="text"
                    inputMode="decimal"
                    value={consumption.consumption}
                    onChange={(e) => handleConsumptionChange(idx, 'consumption', e.target.value)}
                    onBlur={() => handleConsumptionBlur(idx, 'consumption', 3)}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                    placeholder="0.00"
                    error={errors[`consumptions.${idx}.consumption`]}
                  />
                  <Select
                    label="Unidad de Medida"
                    value={consumption.unitOfMeasure}
                    options={unitOptions}
                    onChange={(e) => handleConsumptionChange(idx, 'unitOfMeasure', e.target.value)}
                  />
                </div>
              </div>
            );
          })}
        </div>
        {formData.consumptions.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
            <div className="text-right">
              <p className="text-sm text-gray-500 mb-0.5">Total de montos (informativo)</p>
              <p className="text-xl font-bold text-[#cf1b22]" aria-live="polite">
                {formatCurrency(
                  formData.consumptions.reduce((sum, c) => sum + parseCurrencyInput(c.value), 0)
                )}
              </p>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Ubicación y Fecha de Vencimiento</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select
            label="Ciudad *"
            value={formData.city}
            options={cityOptions}
            onChange={(e) => handleCityChange(e.target.value)}
            placeholder="Seleccione una ciudad"
            error={errors.city}
          />

          <Select
            label="Grupo *"
            value={formData.businessGroup}
            options={businessGroupOptions}
            onChange={(e) => handleBusinessGroupChange(e.target.value)}
            placeholder={formData.city ? 'Seleccione un grupo' : 'Primero seleccione ciudad'}
            error={errors.businessGroup}
            disabled={!formData.city || locationsLoading}
          />

          <Select
            label="Ubicación *"
            value={formData.location}
            options={locationAddressOptions}
            onChange={(e) => handleLocationChange(e.target.value)}
            placeholder={
              formData.businessGroup ? 'Seleccione una ubicación' : 'Primero seleccione un grupo'
            }
            error={errors.location}
            disabled={!formData.city || !formData.businessGroup || locationsLoading}
          />

          <Input
            label="Centro de Costos"
            value={formData.costCenter}
            onChange={(e) => handleInputChange('costCenter', e.target.value)}
            placeholder="Digita Centro de Costo"
          />

          <Input
            label="Fecha de Vencimiento *"
            type="date"
            value={formData.dueDate}
            onChange={(e) => handleInputChange('dueDate', e.target.value)}
            error={errors.dueDate}
          />
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Documento y Notas</h2>
        <div className="space-y-6">
          <FileUpload
            label="Cargar Factura (PDF, JPG, PNG)"
            currentFile={formData.attachedDocument}
            existingFile={
              formData.existingDocumentUrl
                ? {
                    url: formData.existingDocumentUrl,
                    name: formData.existingDocumentName || 'Documento adjunto',
                  }
                : null
            }
            onFileSelect={handleFileSelect}
            onExistingFileRemove={handleExistingDocumentRemove}
          />

          <Textarea
            label="Notas"
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Información adicional..."
            rows={4}
          />
        </div>
      </Card>

      <form onSubmit={handleSubmit}>
        <div className="flex items-center justify-end space-x-4 mt-6">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/pagos/reports')}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            isLoading={loading}
          >
            <Send className="w-4 h-4 mr-2" />
            {isEditMode ? 'Guardar cambios' : 'Enviar Factura'}
          </Button>
        </div>
      </form>
    </div>
  );
};
