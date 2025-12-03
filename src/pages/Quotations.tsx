import { useState, useEffect } from 'react';
import { Plus, Download, TrendingDown, TrendingUp } from 'lucide-react';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Textarea } from '../atoms/Textarea';
import { Modal } from '../molecules/Modal';
import { Badge } from '../atoms/Badge';
import { FileUpload } from '../molecules/FileUpload';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Quotation } from '../types';
import { generateQuotationComparisonPDF } from '../services/pdfGenerator';

export const Quotations = () => {
  const { profile } = useAuth();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const quotationData = {
      title: formData.title,
      description: formData.description,
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

    const { error } = await supabase.from('quotations').insert([quotationData]);

    if (!error) {
      // Notify Pedro Cano
      const { data: pedroCano } = await supabase
        .from('profiles')
        .select('id')
        .ilike('full_name', '%Pedro Cano%')
        .limit(1);

      if (pedroCano && pedroCano.length > 0) {
        await supabase.from('notifications').insert([
          {
            user_id: pedroCano[0].id,
            title: 'Quotation Review Required',
            message: `A new quotation comparison "${quotationData.title}" requires your review`,
            type: 'quotation',
            reference_id: quotationData.id,
          },
        ]);
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
          <h1 className="text-3xl font-bold text-[#50504f]">Quotation Comparison</h1>
          <p className="text-gray-600 mt-1">Compare and review quotations</p>
        </div>
        {canManage && (
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-5 h-5 mr-2" />
            New Comparison
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
                      <Badge variant={quotation.status}>{quotation.status}</Badge>
                    </div>
                    <p className="text-gray-600 text-sm mb-4">{quotation.description}</p>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-3">Provider</th>
                            <th className="text-right py-2 px-3">Amount</th>
                            <th className="text-center py-2 px-3">Document</th>
                          </tr>
                        </thead>
                        <tbody>
                          {quotation.quotation_1_provider && (
                            <tr className="border-b">
                              <td className="py-2 px-3">{quotation.quotation_1_provider}</td>
                              <td className="text-right py-2 px-3 font-semibold">
                                ${quotation.quotation_1_amount?.toLocaleString() || 'N/A'}
                                {comparison && quotation.quotation_1_amount === comparison.min && (
                                  <TrendingDown className="w-4 h-4 inline-block ml-1 text-green-500" />
                                )}
                                {comparison && quotation.quotation_1_amount === comparison.max && (
                                  <TrendingUp className="w-4 h-4 inline-block ml-1 text-red-500" />
                                )}
                              </td>
                              <td className="text-center py-2 px-3">
                                {quotation.quotation_1_url && (
                                  <a
                                    href={quotation.quotation_1_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#cf1b22] hover:underline"
                                  >
                                    View
                                  </a>
                                )}
                              </td>
                            </tr>
                          )}
                          {quotation.quotation_2_provider && (
                            <tr className="border-b">
                              <td className="py-2 px-3">{quotation.quotation_2_provider}</td>
                              <td className="text-right py-2 px-3 font-semibold">
                                ${quotation.quotation_2_amount?.toLocaleString() || 'N/A'}
                                {comparison && quotation.quotation_2_amount === comparison.min && (
                                  <TrendingDown className="w-4 h-4 inline-block ml-1 text-green-500" />
                                )}
                                {comparison && quotation.quotation_2_amount === comparison.max && (
                                  <TrendingUp className="w-4 h-4 inline-block ml-1 text-red-500" />
                                )}
                              </td>
                              <td className="text-center py-2 px-3">
                                {quotation.quotation_2_url && (
                                  <a
                                    href={quotation.quotation_2_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#cf1b22] hover:underline"
                                  >
                                    View
                                  </a>
                                )}
                              </td>
                            </tr>
                          )}
                          {quotation.quotation_3_provider && (
                            <tr>
                              <td className="py-2 px-3">{quotation.quotation_3_provider}</td>
                              <td className="text-right py-2 px-3 font-semibold">
                                ${quotation.quotation_3_amount?.toLocaleString() || 'N/A'}
                                {comparison && quotation.quotation_3_amount === comparison.min && (
                                  <TrendingDown className="w-4 h-4 inline-block ml-1 text-green-500" />
                                )}
                                {comparison && quotation.quotation_3_amount === comparison.max && (
                                  <TrendingUp className="w-4 h-4 inline-block ml-1 text-red-500" />
                                )}
                              </td>
                              <td className="text-center py-2 px-3">
                                {quotation.quotation_3_url && (
                                  <a
                                    href={quotation.quotation_3_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#cf1b22] hover:underline"
                                  >
                                    View
                                  </a>
                                )}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {comparison && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm">
                        <p className="font-medium text-gray-700 mb-1">Comparison Summary:</p>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <span className="text-gray-500">Lowest:</span>
                            <span className="font-semibold text-green-600 ml-2">
                              ${comparison.min.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Highest:</span>
                            <span className="font-semibold text-red-600 ml-2">
                              ${comparison.max.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Average:</span>
                            <span className="font-semibold text-[#50504f] ml-2">
                              ${comparison.avg.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => generateQuotationComparisonPDF(quotation)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    PDF
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {quotations.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No quotations yet</h3>
            <p className="text-gray-500 mb-4">Create your first quotation comparison</p>
            {canManage && (
              <Button onClick={() => setShowModal(true)}>
                <Plus className="w-5 h-5 mr-2" />
                New Comparison
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
        title="New Quotation Comparison"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Title"
            placeholder="Comparison title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            fullWidth
            required
          />

          <Textarea
            label="Description"
            placeholder="Describe the quotation comparison"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            fullWidth
            required
          />

          {[1, 2, 3].map((num) => (
            <div key={num} className="border-t pt-4 space-y-3">
              <h4 className="font-medium text-gray-700">Quotation {num}</h4>
              <Input
                label="Provider Name"
                placeholder={`Provider ${num} name`}
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
                label="Amount"
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
              <FileUpload
                bucket="general"
                folder="quotations"
                multiple={false}
                accept="application/pdf,image/*"
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
              Cancel
            </Button>
            <Button type="submit" fullWidth>
              Create Comparison
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

