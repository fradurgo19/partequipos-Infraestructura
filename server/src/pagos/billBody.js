export const normalizeBillBody = (bill, consumptions) => {
  const totalValue = consumptions.reduce((sum, c) => sum + (Number.parseFloat(c.value) || 0), 0);
  const totalAmount = consumptions.reduce((sum, c) => sum + (Number.parseFloat(c.totalAmount) || 0), 0);
  const totalConsumption = consumptions.reduce((sum, c) => sum + (Number.parseFloat(c.consumption) || 0), 0);
  const first = consumptions[0];

  return {
    serviceType: bill.serviceType || bill.service_type || first?.serviceType,
    provider: bill.provider || first?.provider,
    description: bill.description,
    value: totalValue,
    period: bill.period,
    invoiceNumber: bill.invoiceNumber || bill.invoice_number,
    contractNumber: bill.contractNumber || bill.contract_number,
    totalAmount: bill.totalAmount || bill.total_amount || totalAmount,
    consumption: totalConsumption || null,
    unitOfMeasure: bill.unitOfMeasure || bill.unit_of_measure || first?.unitOfMeasure,
    costCenter: bill.costCenter || bill.cost_center,
    city: bill.city,
    businessGroup: bill.businessGroup || bill.business_group,
    location: bill.location,
    dueDate: bill.dueDate || bill.due_date,
    documentUrl: bill.documentUrl || bill.document_url,
    documentName: bill.documentName || bill.document_name,
    status: bill.status || 'pending',
    notes: bill.notes,
  };
};
