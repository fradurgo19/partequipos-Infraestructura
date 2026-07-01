import { UtilityBillFormData } from '../types';
import { parseCurrencyInput, parseColombianNumber } from './formatters';

export interface ValidationErrors {
  [key: string]: string;
}

export const validateBillForm = (formData: UtilityBillFormData): ValidationErrors => {
  const errors: ValidationErrors = {};

  if (!formData.consumptions || formData.consumptions.length === 0) {
    errors.consumptions = 'Debe agregar al menos un consumo';
  } else {
    formData.consumptions.forEach((c, idx) => {
      if (!c.serviceType) errors[`consumptions.${idx}.serviceType`] = 'Requerido';
      if (!c.provider?.trim()) errors[`consumptions.${idx}.provider`] = 'Requerido';
      if (!c.periodFrom) errors[`consumptions.${idx}.periodFrom`] = 'Requerido';
      if (!c.periodTo) errors[`consumptions.${idx}.periodTo`] = 'Requerido';
      if (c.periodFrom && c.periodTo && c.periodFrom > c.periodTo) {
        errors[`consumptions.${idx}.periodTo`] = 'La fecha hasta debe ser mayor o igual a desde';
      }
      if (!c.value || parseCurrencyInput(c.value) <= 0) {
        errors[`consumptions.${idx}.value`] = 'El monto debe ser mayor a 0';
      }
      if (c.consumption && parseColombianNumber(String(c.consumption)) < 0) {
        errors[`consumptions.${idx}.consumption`] = 'No puede ser negativo';
      }
    });
  }

  if (!formData.period) {
    errors.period = 'El período es requerido';
  } else {
    const periodRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
    if (!periodRegex.test(formData.period)) {
      errors.period = 'El período debe estar en formato AAAA-MM';
    }
  }

  if (!formData.invoiceNumber?.trim()) {
    errors.invoiceNumber = 'El número de factura es requerido';
  }

  if (!formData.contractNumber?.trim()) {
    errors.contractNumber = 'El número de contrato es requerido';
  }

  if (!formData.city.trim()) {
    errors.city = 'La ciudad es requerida';
  }

  if (!formData.businessGroup.trim()) {
    errors.businessGroup = 'El grupo es requerido';
  }

  if (!formData.location.trim()) {
    errors.location = 'La ubicación es requerida';
  }

  if (!formData.dueDate) {
    errors.dueDate = 'La fecha de vencimiento es requerida';
  }

  return errors;
};

export const hasValidationErrors = (errors: ValidationErrors): boolean => {
  return Object.keys(errors).length > 0;
};

const BILL_FORM_FIELD_LABELS: Record<string, string> = {
  period: 'Período',
  invoiceNumber: 'Número de factura',
  contractNumber: 'Número de contrato',
  city: 'Ciudad',
  businessGroup: 'Grupo',
  location: 'Ubicación',
  dueDate: 'Fecha de vencimiento',
  consumptions: 'Consumos',
  serviceType: 'Tipo de servicio',
  provider: 'Proveedor',
  periodFrom: 'Período desde',
  periodTo: 'Período hasta',
  value: 'Monto',
  consumption: 'Consumo',
};

export const getBillFormFieldDomId = (errorKey: string): string =>
  `bill-form-field-${errorKey.replaceAll('.', '-')}`;

export const formatBillFormValidationItem = (key: string, message: string): string => {
  const consumptionMatch = /^consumptions\.(\d+)\.(\w+)$/.exec(key);
  if (consumptionMatch) {
    const consumptionIndex = Number(consumptionMatch[1]) + 1;
    const fieldLabel = BILL_FORM_FIELD_LABELS[consumptionMatch[2]] ?? consumptionMatch[2];
    return `Consumo #${consumptionIndex} — ${fieldLabel}: ${message}`;
  }

  const fieldLabel = BILL_FORM_FIELD_LABELS[key] ?? key;
  return `${fieldLabel}: ${message}`;
};

export const getValidationErrorMessages = (errors: ValidationErrors): string[] =>
  Object.entries(errors)
    .filter(([, message]) => Boolean(message))
    .map(([key, message]) => formatBillFormValidationItem(key, message));

export const getFirstValidationErrorKey = (errors: ValidationErrors): string | undefined => {
  const headerOrder = ['period', 'invoiceNumber', 'contractNumber', 'consumptions'];
  for (const key of headerOrder) {
    if (errors[key]) {
      return key;
    }
  }

  const consumptionKeys = Object.keys(errors)
    .filter((key) => key.startsWith('consumptions.'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  if (consumptionKeys.length > 0) {
    return consumptionKeys[0];
  }

  const locationOrder = ['city', 'businessGroup', 'location', 'dueDate'];
  for (const key of locationOrder) {
    if (errors[key]) {
      return key;
    }
  }

  return Object.keys(errors)[0];
};
