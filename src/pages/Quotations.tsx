import { useState, useEffect } from 'react';
import { Plus, Download, TrendingDown, TrendingUp, Mail } from 'lucide-react';
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
import { Quotation } from '../types';
import { generateQuotationComparisonPDF } from '../services/pdfGenerator';

// Tipos de cotización
const TIPOS_COTIZACION = [
  'Materiales',
  'Mano de Obra',
  'Servicios',
  'Equipos',
  'Suministros',
  'Otro'
];

export const Quotations = () => {
  const { profile } = useAuth();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tipo_cotizacion: '',
    cantidad: '',
    formato_contratista: '',
    quotation_1_url: '',
    quotation_1_amount: '',
    quotation_1_provider: '',
    quotation_2_url: '',
    quotation_2_amount: '',
    quotation_2_provider: '',
    quotation_3_url: '',
    quotation_3_amount: '',
    quotation_3_provider: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('quotations')
      .select('*, created_by_user:profiles!quotations_created_by_fkey(id, full_name)')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setQuotations(data as any);
    }
    setLoading(false);
  };

  // Función para calcular comparativos
  const calculateComparatives = (quotation: any) => {
    const quotations = [
      {
        provider: quotation.quotation_1_provider,
        amount: quotation.quotation_1_amount,
        url: quotation.quotation_1_url,
        description: quotation.description,
      },
      {
        provider: quotation.quotation_2_provider,
        amount: quotation.quotation_2_amount,
        url: quotation.quotation_2_url,
        description: quotation.description,
      },
      {
        provider: quotation.quotation_3_provider,
        amount: quotation.quotation_3_amount,
        url: quotation.quotation_3_url,
        description: quotation.description,
      },
    ].filter((q) => q.provider && q.amount);

    // Comparativo por monto (menor a mayor)
    const comparativoPorMonto = [...quotations]
      .sort((a, b) => (a.amount || 0) - (b.amount || 0))
      .map((q, index) => ({
        position: index + 1,
        provider: q.provider,
        amount: q.amount,
        url: q.url,
      }));

    // Comparativo por valor (valor unitario si hay cantidad)
    const comparativoPorValor = quotation.cantidad
      ? [...quotations]
          .map((q) => ({
            provider: q.provider,
            amount: q.amount,
            unitValue: (q.amount || 0) / quotation.cantidad,
            url: q.url,
          }))
          .sort((a, b) => a.unitValue - b.unitValue)
          .map((q, index) => ({
            position: index + 1,
            provider: q.provider,
            amount: q.amount,
            unitValue: q.unitValue,
            url: q.url,
          }))
      : comparativoPorMonto;

    // Comparativo por descripción (alfabético por proveedor)
    const comparativoPorDescripcion = [...quotations]
      .sort((a, b) => (a.provider || '').localeCompare(b.provider || ''))
      .map((q, index) => ({
        position: index + 1,
        provider: q.provider,
        amount: q.amount,
        description: q.description,
        url: q.url,
      }));

    return {
      comparativo_por_monto: comparativoPorMonto,
      comparativo_por_valor: comparativoPorValor,
      comparativo_por_descripcion: comparativoPorDescripcion,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const quotationData: any = {
      title: formData.title,
      description: formData.description,
      tipo_cotizacion: formData.tipo_cotizacion || null,
      cantidad: formData.cantidad ? parseFloat(formData.cantidad) : null,
      formato_contratista: formData.formato_contratista || null,
      quotation_1_url: formData.quotation_1_url || null,
      quotation_1_amount: formData.quotation_1_amount ? parseFloat(formData.quotation_1_amount) : null,
      quotation_1_provider: formData.quotation_1_provider || null,
      quotation_2_url: formData.quotation_2_url || null,
      quotation_2_amount: formData.quotation_2_amount ? parseFloat(formData.quotation_2_amount) : null,
      quotation_2_provider: formData.quotation_2_provider || null,
      quotation_3_url: formData.quotation_3_url || null,
      quotation_3_amount: formData.quotation_3_amount ? parseFloat(formData.quotation_3_amount) : null,
      quotation_3_provider: formData.quotation_3_provider || null,
      created_by: profile.id,
      status: 'pending',
    };

    // Calcular comparativos
    const comparatives = calculateComparatives(quotationData);
    quotationData.comparativo_por_monto = comparatives.comparativo_por_monto;
    quotationData.comparativo_por_valor = comparatives.comparativo_por_valor;
    quotationData.comparativo_por_descripcion = comparatives.comparativo_por_descripcion;

    const { data: insertedQuotation, error } = await supabase
      .from('quotations')
      .insert([quotationData])
      .select()
      .single();

    if (error) {
      console.error('Error creating quotation:', error);
      alert('Error al crear la cotización');
      return;
    }

    // Generar PDF comparativo
    try {
      const pdfBlob = await generateQuotationComparisonPDF(insertedQuotation);
      
      // Subir PDF a Supabase Storage
      const pdfFileName = `quotations/comparativo-${Date.now()}-${formData.title.replace(/\s+/g, '_')}.pdf`;
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
        
        // Actualizar quotation con URL del PDF
        await supabase
          .from('quotations')
          .update({ pdf_comparativo_url: publicUrl })
          .eq('id', insertedQuotation.id);

        // Enviar PDF por correo a Felipe Bustamante
        try {
          const token = localStorage.getItem('token');
          await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/notifications/quotation-comparative`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              quotationId: insertedQuotation.id,
              quotationTitle: formData.title,
              pdfUrl: publicUrl,
              comparatives: comparatives,
            }),
          });
        } catch (emailError) {
          console.error('Error sending email:', emailError);
        }
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
      title: '',
      description: '',
      tipo_cotizacion: '',
      cantidad: '',
      formato_contratista: '',
      quotation_1_url: '',
      quotation_1_amount: '',
      quotation_1_provider: '',
      quotation_2_url: '',
      quotation_2_amount: '',
      quotation_2_provider: '',
      quotation_3_url: '',
      quotation_3_amount: '',
      quotation_3_provider: '',
    });
  };

  const getComparisonData = (quotation: any) => {
    const amounts = [
      quotation.quotation_1_amount,
      quotation.quotation_2_amount,
      quotation.quotation_3_amount,
    ].filter((a) => a !== null && a !== undefined) as number[];

    if (amounts.length === 0) return null;

    const min = Math.min(...amounts);
    const max = Math.max(...amounts);
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;

    return { min, max, avg, amounts };
  };

  const handleDownloadPDF = async (quotation: Quotation) => {
    if (quotation.pdf_comparativo_url) {
      window.open(quotation.pdf_comparativo_url, '_blank');
    } else {
      // Generar PDF on-the-fly si no existe
      const pdfBlob = await generateQuotationComparisonPDF(quotation);
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Comparativo_${quotation.title}_${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    }
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
          <h1 className="text-2xl sm:text-3xl font-bold text-[#50504f]">Comparativo de Cotizaciones</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Compare hasta tres cotizaciones de proveedores</p>
        </div>
        {canManage && (
          <Button onClick={() => setShowModal(true)} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            <span className="text-sm sm:text-base">Nuevo Comparativo</span>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {quotations.map((quotation: any) => {
          const comparison = getComparisonData(quotation);

          return (
            <Card key={quotation.id} hover>
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg text-[#50504f]">{quotation.title}</h3>
                      <Badge variant={quotation.status === 'approved' ? 'success' : quotation.status === 'reviewed' ? 'in_progress' : 'pending'}>
                        {quotation.status}
                      </Badge>
                      {quotation.tipo_cotizacion && (
                        <Badge variant="default">{quotation.tipo_cotizacion}</Badge>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm mb-4">{quotation.description}</p>

                    {quotation.cantidad && (
                      <p className="text-sm text-gray-500 mb-2">
                        <strong>Cantidad:</strong> {quotation.cantidad}
                      </p>
                    )}

                    {quotation.formato_contratista && (
                      <p className="text-sm text-gray-500 mb-4">
                        <strong>Formato de Contratista:</strong> {quotation.formato_contratista}
                      </p>
                    )}

                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                      <div className="inline-block min-w-full align-middle">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                          <table className="min-w-full divide-y divide-gray-300 text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th scope="col" className="py-3 pl-4 pr-3 text-left text-xs sm:text-sm font-semibold text-gray-900 sm:pl-6 whitespace-nowrap">
                                  Proveedor
                                </th>
                                <th scope="col" className="px-3 py-3 text-right text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">
                                  Monto
                                </th>
                                {quotation.cantidad && (
                                  <th scope="col" className="px-3 py-3 text-right text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">
                                    Valor Unit.
                                  </th>
                                )}
                                <th scope="col" className="px-3 py-3 text-center text-xs sm:text-sm font-semibold text-gray-900 sm:pr-6 whitespace-nowrap">
                                  PDF
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                              {quotation.quotation_1_provider && (
                                <tr className="hover:bg-gray-50">
                                  <td className="whitespace-nowrap py-3 pl-4 pr-3 text-sm text-gray-900 sm:pl-6">
                                    {quotation.quotation_1_provider}
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-3 text-sm text-right font-semibold text-gray-900">
                                    ${quotation.quotation_1_amount?.toLocaleString('es-CO') || 'N/A'}
                                    {comparison && quotation.quotation_1_amount === comparison.min && (
                                      <TrendingDown className="w-4 h-4 inline-block ml-1 text-green-500" />
                                    )}
                                    {comparison && quotation.quotation_1_amount === comparison.max && (
                                      <TrendingUp className="w-4 h-4 inline-block ml-1 text-red-500" />
                                    )}
                                  </td>
                                  {quotation.cantidad && (
                                    <td className="whitespace-nowrap px-3 py-3 text-sm text-right text-gray-900">
                                      ${quotation.quotation_1_amount && quotation.cantidad
                                        ? (quotation.quotation_1_amount / quotation.cantidad).toFixed(2)
                                        : 'N/A'}
                                    </td>
                                  )}
                                  <td className="whitespace-nowrap px-3 py-3 text-sm text-center text-gray-900 sm:pr-6">
                                    {quotation.quotation_1_url && (
                                      <a
                                        href={quotation.quotation_1_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[#cf1b22] hover:underline text-xs sm:text-sm"
                                      >
                                        Ver PDF
                                      </a>
                                    )}
                                  </td>
                                </tr>
                              )}
                              {quotation.quotation_2_provider && (
                                <tr className="hover:bg-gray-50">
                                  <td className="whitespace-nowrap py-3 pl-4 pr-3 text-sm text-gray-900 sm:pl-6">
                                    {quotation.quotation_2_provider}
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-3 text-sm text-right font-semibold text-gray-900">
                                    ${quotation.quotation_2_amount?.toLocaleString('es-CO') || 'N/A'}
                                    {comparison && quotation.quotation_2_amount === comparison.min && (
                                      <TrendingDown className="w-4 h-4 inline-block ml-1 text-green-500" />
                                    )}
                                    {comparison && quotation.quotation_2_amount === comparison.max && (
                                      <TrendingUp className="w-4 h-4 inline-block ml-1 text-red-500" />
                                    )}
                                  </td>
                                  {quotation.cantidad && (
                                    <td className="whitespace-nowrap px-3 py-3 text-sm text-right text-gray-900">
                                      ${quotation.quotation_2_amount && quotation.cantidad
                                        ? (quotation.quotation_2_amount / quotation.cantidad).toFixed(2)
                                        : 'N/A'}
                                    </td>
                                  )}
                                  <td className="whitespace-nowrap px-3 py-3 text-sm text-center text-gray-900 sm:pr-6">
                                    {quotation.quotation_2_url && (
                                      <a
                                        href={quotation.quotation_2_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[#cf1b22] hover:underline text-xs sm:text-sm"
                                      >
                                        Ver PDF
                                      </a>
                                    )}
                                  </td>
                                </tr>
                              )}
                              {quotation.quotation_3_provider && (
                                <tr className="hover:bg-gray-50">
                                  <td className="whitespace-nowrap py-3 pl-4 pr-3 text-sm text-gray-900 sm:pl-6">
                                    {quotation.quotation_3_provider}
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-3 text-sm text-right font-semibold text-gray-900">
                                    ${quotation.quotation_3_amount?.toLocaleString('es-CO') || 'N/A'}
                                    {comparison && quotation.quotation_3_amount === comparison.min && (
                                      <TrendingDown className="w-4 h-4 inline-block ml-1 text-green-500" />
                                    )}
                                    {comparison && quotation.quotation_3_amount === comparison.max && (
                                      <TrendingUp className="w-4 h-4 inline-block ml-1 text-red-500" />
                                    )}
                                  </td>
                                  {quotation.cantidad && (
                                    <td className="whitespace-nowrap px-3 py-3 text-sm text-right text-gray-900">
                                      ${quotation.quotation_3_amount && quotation.cantidad
                                        ? (quotation.quotation_3_amount / quotation.cantidad).toFixed(2)
                                        : 'N/A'}
                                    </td>
                                  )}
                                  <td className="whitespace-nowrap px-3 py-3 text-sm text-center text-gray-900 sm:pr-6">
                                    {quotation.quotation_3_url && (
                                      <a
                                        href={quotation.quotation_3_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[#cf1b22] hover:underline text-xs sm:text-sm"
                                      >
                                        Ver PDF
                                      </a>
                                    )}
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {comparison && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm">
                        <p className="font-medium text-gray-700 mb-1">Resumen Comparativo:</p>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <span className="text-gray-500">Menor:</span>
                            <span className="font-semibold text-green-600 ml-2">
                              ${comparison.min.toLocaleString('es-CO')}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Mayor:</span>
                            <span className="font-semibold text-red-600 ml-2">
                              ${comparison.max.toLocaleString('es-CO')}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Promedio:</span>
                            <span className="font-semibold text-[#50504f] ml-2">
                              ${comparison.avg.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Mostrar comparativos si existen */}
                    {quotation.comparativo_por_monto && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm">
                        <p className="font-medium text-blue-700 mb-2">Comparativo por Monto:</p>
                        <ol className="list-decimal list-inside space-y-1">
                          {JSON.parse(JSON.stringify(quotation.comparativo_por_monto)).map((item: any, idx: number) => (
                            <li key={idx}>
                              {item.provider}: ${item.amount?.toLocaleString('es-CO')}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleDownloadPDF(quotation)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      PDF Comparativo
                    </Button>
                    {quotation.pdf_comparativo_url && (
                      <Badge variant="success" size="sm">
                        <Mail className="w-3 h-3 mr-1" />
                        Enviado a Felipe
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {quotations.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No hay cotizaciones</h3>
            <p className="text-gray-500 mb-4">Crea tu primer comparativo de cotizaciones</p>
            {canManage && (
              <Button onClick={() => setShowModal(true)}>
                <Plus className="w-5 h-5 mr-2" />
                Nuevo Comparativo
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
        title="Nuevo Comparativo de Cotizaciones"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Título *"
            placeholder="Título del comparativo"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            fullWidth
            required
          />

          <Select
            label="Tipo de Cotización *"
            value={formData.tipo_cotizacion}
            onChange={(e) => setFormData({ ...formData, tipo_cotizacion: e.target.value })}
            options={[
              { value: '', label: 'Seleccione un tipo' },
              ...TIPOS_COTIZACION.map((tipo) => ({ value: tipo, label: tipo })),
            ]}
            fullWidth
            required
          />

          <Input
            label="Cantidad"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={formData.cantidad}
            onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
            fullWidth
          />

          <Input
            label="Formato de Contratista"
            placeholder="Ej: Formato estándar, Formato personalizado..."
            value={formData.formato_contratista}
            onChange={(e) => setFormData({ ...formData, formato_contratista: e.target.value })}
            fullWidth
          />

          <Textarea
            label="Descripción *"
            placeholder="Describe las cotizaciones a comparar"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            fullWidth
            required
            rows={3}
          />

          {[1, 2, 3].map((num) => (
            <div key={num} className="border-t pt-4 space-y-3">
              <h4 className="font-medium text-gray-700">Cotización {num}</h4>
              <Input
                label="Nombre del Proveedor"
                placeholder={`Proveedor ${num}`}
                value={formData[`quotation_${num}_provider` as keyof typeof formData] as string}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    [`quotation_${num}_provider`]: e.target.value,
                  } as any)
                }
                fullWidth
              />
              <Input
                label="Monto (COP)"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData[`quotation_${num}_amount` as keyof typeof formData] as string}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    [`quotation_${num}_amount`]: e.target.value,
                  } as any)
                }
                fullWidth
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PDF de Cotización {num}
                </label>
                <FileUpload
                  bucket="documents"
                  folder="quotations"
                  multiple={false}
                  accept="application/pdf"
                  onUploadComplete={(urls) => {
                    setFormData({
                      ...formData,
                      [`quotation_${num}_url`]: urls[0] || '',
                    } as any);
                  }}
                  existingFiles={
                    formData[`quotation_${num}_url` as keyof typeof formData]
                      ? [formData[`quotation_${num}_url` as keyof typeof formData] as string]
                      : []
                  }
                  onRemove={() => {
                    setFormData({
                      ...formData,
                      [`quotation_${num}_url`]: '',
                    } as any);
                  }}
                />
              </div>
            </div>
          ))}

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
              Generar Comparativo
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
