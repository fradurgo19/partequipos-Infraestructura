import { parseNumeric, parseNumericOrZero } from './parseNumeric.js';

export const buildConsumptionPayload = (billId, consumption) => {
  const value = parseNumericOrZero(consumption.value ?? consumption.totalAmount);
  const totalAmount = parseNumericOrZero(consumption.totalAmount ?? consumption.value);
  const consumptionAmount =
    consumption.consumption === null ||
    consumption.consumption === undefined ||
    String(consumption.consumption).trim() === ''
      ? null
      : parseNumeric(consumption.consumption);

  return {
    bill_id: billId,
    service_type: consumption.serviceType || consumption.service_type,
    provider: consumption.provider,
    period_from: consumption.periodFrom || consumption.period_from,
    period_to: consumption.periodTo || consumption.period_to,
    value,
    total_amount: totalAmount,
    consumption: consumptionAmount,
    unit_of_measure: consumption.unitOfMeasure || consumption.unit_of_measure || null,
  };
};
