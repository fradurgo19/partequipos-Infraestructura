import { supabase } from '../lib/supabaseClient.js';
import { parseNumeric, parseNumericOrZero } from './parseNumeric.js';

const AMOUNT_TOLERANCE = 0.01;

const normalizeBillText = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim().replaceAll(/\s+/g, ' ').toLowerCase();
};

const escapeIlike = (value) => value.replaceAll(/[%_\\]/g, String.raw`\$&`);

const amountsEquivalent = (left, right) => {
  const a = parseNumericOrZero(left);
  const b = parseNumericOrZero(right);
  return Math.abs(a - b) <= AMOUNT_TOLERANCE;
};

const rowMatchesAmounts = (row, totalAmount, value) =>
  amountsEquivalent(row.total_amount, totalAmount) ||
  amountsEquivalent(row.total_amount, value) ||
  amountsEquivalent(row.value, totalAmount) ||
  amountsEquivalent(row.value, value);

const formatNumericFingerprint = (value) => {
  const parsed = parseNumeric(value);
  return parsed === null ? '' : String(parsed);
};

const consumptionEntryFingerprint = (consumption) => {
  const serviceType = normalizeBillText(consumption.serviceType ?? consumption.service_type);
  const provider = normalizeBillText(consumption.provider);
  const periodFrom = normalizeBillText(consumption.periodFrom ?? consumption.period_from);
  const periodTo = normalizeBillText(consumption.periodTo ?? consumption.period_to);
  const value = formatNumericFingerprint(consumption.value ?? consumption.total_amount);
  const totalAmount = formatNumericFingerprint(consumption.totalAmount ?? consumption.total_amount ?? consumption.value);
  const consumptionAmount = formatNumericFingerprint(consumption.consumption);
  const unit = normalizeBillText(consumption.unitOfMeasure ?? consumption.unit_of_measure);

  return [serviceType, provider, periodFrom, periodTo, value, totalAmount, consumptionAmount, unit].join('|');
};

export const buildConsumptionsFingerprint = (consumptions) =>
  (consumptions || [])
    .map(consumptionEntryFingerprint)
    .sort((a, b) => a.localeCompare(b))
    .join(';;');

const matchesBillIdentity = (row, invoiceNorm, contractNorm, totalAmount, value, excludeBillId) =>
  row.id !== excludeBillId &&
  normalizeBillText(row.invoice_number) === invoiceNorm &&
  normalizeBillText(row.contract_number) === contractNorm &&
  rowMatchesAmounts(row, totalAmount, value);

export const findDuplicateBill = async ({
  invoiceNumber,
  contractNumber,
  totalAmount,
  value,
  excludeBillId = null,
}) => {
  const invoiceNorm = normalizeBillText(invoiceNumber);
  const contractNorm = normalizeBillText(contractNumber);

  if (!invoiceNorm || !contractNorm) {
    return null;
  }

  if (!supabase) {
    const error = new Error('Supabase no configurado en el servidor');
    error.statusCode = 500;
    throw error;
  }

  const amount = parseNumericOrZero(totalAmount);
  const billValue = parseNumericOrZero(value ?? totalAmount);

  const { data: candidates, error } = await supabase
    .from('utility_bills')
    .select('id, invoice_number, contract_number, total_amount, value')
    .ilike('invoice_number', escapeIlike(invoiceNorm))
    .ilike('contract_number', escapeIlike(contractNorm));

  if (error) {
    console.error('Error al buscar facturas duplicadas:', error);
    const dbError = new Error('Error al validar factura duplicada');
    dbError.statusCode = 500;
    throw dbError;
  }

  return (
    (candidates || []).find((row) =>
      matchesBillIdentity(row, invoiceNorm, contractNorm, amount, billValue, excludeBillId)
    ) ?? null
  );
};

export const assertBillNotDuplicate = async (params) => {
  const duplicate = await findDuplicateBill(params);
  if (!duplicate) {
    return;
  }

  const error = new Error(
    'Ya existe una factura con el mismo número de factura, contrato y monto. No se puede registrar duplicada.'
  );
  error.statusCode = 409;
  throw error;
};

export const isDuplicateBillDbError = (error) =>
  error?.code === '23505' &&
  String(error?.message || error?.details || '').toLowerCase().includes('utility_bills');
