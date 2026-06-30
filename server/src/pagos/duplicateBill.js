import { supabase } from '../lib/supabaseClient.js';
import { fetchConsumptionsByBillIds } from './storage.js';
import { parseNumeric, parseNumericOrZero } from './parseNumeric.js';

const normalizeBillText = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim().toLowerCase();
};

const formatNumericFingerprint = (value) => {
  const parsed = parseNumeric(value);
  return parsed === null ? '' : String(parsed);
};

const consumptionEntryFingerprint = (consumption) => {
  const serviceType = normalizeBillText(consumption.serviceType ?? consumption.service_type);
  const provider = normalizeBillText(consumption.provider);
  const value = formatNumericFingerprint(consumption.value ?? consumption.total_amount);
  const totalAmount = formatNumericFingerprint(consumption.totalAmount ?? consumption.total_amount ?? consumption.value);
  const consumptionAmount = formatNumericFingerprint(consumption.consumption);

  return [serviceType, provider, value, totalAmount, consumptionAmount].join('|');
};

export const buildConsumptionsFingerprint = (consumptions) =>
  (consumptions || [])
    .map(consumptionEntryFingerprint)
    .sort((a, b) => a.localeCompare(b))
    .join(';;');

const groupConsumptionsByBillId = (rows) => {
  const grouped = new Map();
  for (const row of rows) {
    const current = grouped.get(row.bill_id) || [];
    current.push(row);
    grouped.set(row.bill_id, current);
  }
  return grouped;
};

const matchesBillIdentity = (row, invoiceNorm, contractNorm, totalAmount, excludeBillId) =>
  row.id !== excludeBillId &&
  normalizeBillText(row.invoice_number) === invoiceNorm &&
  normalizeBillText(row.contract_number) === contractNorm &&
  parseNumericOrZero(row.total_amount) === parseNumericOrZero(totalAmount);

export const findDuplicateBill = async ({
  invoiceNumber,
  contractNumber,
  totalAmount,
  consumptions,
  excludeBillId = null,
}) => {
  const invoiceNorm = normalizeBillText(invoiceNumber);
  const contractNorm = normalizeBillText(contractNumber);

  if (!invoiceNorm || !contractNorm) {
    return null;
  }

  const amount = parseNumericOrZero(totalAmount);
  const { data: candidates, error } = await supabase
    .from('utility_bills')
    .select('id, invoice_number, contract_number, total_amount')
    .eq('total_amount', amount);

  if (error) {
    console.error('Error al buscar facturas duplicadas:', error);
    const dbError = new Error('Error al validar factura duplicada');
    dbError.statusCode = 500;
    throw dbError;
  }

  const matchingBills = (candidates || []).filter((row) =>
    matchesBillIdentity(row, invoiceNorm, contractNorm, amount, excludeBillId)
  );

  if (matchingBills.length === 0) {
    return null;
  }

  const targetFingerprint = buildConsumptionsFingerprint(consumptions);
  const existingConsumptions = await fetchConsumptionsByBillIds(matchingBills.map((bill) => bill.id));
  const consumptionsByBillId = groupConsumptionsByBillId(existingConsumptions);

  return (
    matchingBills.find((bill) => {
      const billConsumptions = consumptionsByBillId.get(bill.id) || [];
      return buildConsumptionsFingerprint(billConsumptions) === targetFingerprint;
    }) ?? null
  );
};

export const assertBillNotDuplicate = async (params) => {
  const duplicate = await findDuplicateBill(params);
  if (!duplicate) {
    return;
  }

  const error = new Error(
    'Ya existe una factura con el mismo número de factura, contrato, montos y consumos. No se puede registrar duplicada.'
  );
  error.statusCode = 409;
  throw error;
};
