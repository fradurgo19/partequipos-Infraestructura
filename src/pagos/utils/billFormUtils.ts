import { UtilityBill, UtilityBillFormData, BillConsumption } from '../types';
import { resolveBillLocationFromStored } from '../constants/billLocations';

function toDateString(value: Date | string | null | undefined): string {
  if (value === null || value === undefined) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

function periodToDateRange(period: string): { from: string; to: string } {
  const [y, m] = period.split('-').map(Number);
  if (Number.isNaN(y) || Number.isNaN(m)) return { from: '', to: '' };
  const from = `${period}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const to = `${period}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

function consumptionToFormItem(c: BillConsumption): UtilityBillFormData['consumptions'][number] {
  return {
    serviceType: c.serviceType,
    provider: c.provider ?? '',
    periodFrom: toDateString(c.periodFrom) || '',
    periodTo: toDateString(c.periodTo) || '',
    value: String(c.value ?? ''),
    totalAmount: String(c.totalAmount ?? ''),
    consumption: c.consumption == null ? '' : String(c.consumption),
    unitOfMeasure: c.unitOfMeasure ?? 'kWh'
  };
}

/**
 * Convierte una factura (UtilityBill) al formato del formulario para edición.
 */
export function billToFormData(bill: UtilityBill): UtilityBillFormData {
  const defaultRange = periodToDateRange(bill.period ?? '');
  const consumptions =
    bill.consumptions && bill.consumptions.length > 0
      ? bill.consumptions.map(consumptionToFormItem)
      : [
          consumptionToFormItem({
            serviceType: bill.serviceType,
            provider: bill.provider ?? '',
            periodFrom: defaultRange.from,
            periodTo: defaultRange.to,
            value: bill.value,
            totalAmount: bill.totalAmount,
            consumption: bill.consumption,
            unitOfMeasure: bill.unitOfMeasure
          })
        ];

  const resolved = resolveBillLocationFromStored(
    bill.location ?? '',
    bill.city,
    bill.businessGroup
  );

  return {
    description: bill.description ?? '',
    period: bill.period ?? '',
    invoiceNumber: bill.invoiceNumber ?? '',
    contractNumber: bill.contractNumber ?? '',
    costCenter: bill.costCenter ?? '',
    city: resolved.city,
    businessGroup: resolved.businessGroup,
    location: resolved.address,
    dueDate: toDateString(bill.dueDate) ?? '',
    attachedDocument: null,
    existingDocumentUrl: bill.documentUrl,
    existingDocumentName: bill.documentName,
    status: bill.status,
    notes: bill.notes ?? '',
    consumptions
  };
}
