/**
 * Parsea montos/cantidades en formato colombiano (miles con punto, decimales con coma)
 * o numérico estándar. Devuelve null si el valor no es válido.
 */
export const parseNumeric = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const val = String(value).trim().replaceAll(/\s/g, '');
  if (!val) {
    return null;
  }

  if (val.includes(',')) {
    const parts = val.split(',');
    const intPart = (parts[0] || '0').replaceAll('.', '');
    const decPart = (parts[1] || '0').replaceAll(/\D/g, '');
    const parsed = Number.parseFloat(`${intPart}.${decPart}`);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const dotCount = val.match(/\./g)?.length ?? 0;
  if (dotCount > 1) {
    const parsed = Number.parseFloat(val.replaceAll('.', ''));
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (dotCount === 1) {
    const after = val.substring(val.indexOf('.') + 1).replaceAll(/\D/g, '');
    if (after.length === 3 && /^\d{3}$/.test(after)) {
      const parsed = Number.parseFloat(val.replaceAll('.', ''));
      return Number.isFinite(parsed) ? parsed : null;
    }
  }

  const cleaned = val.replaceAll(/[^0-9.]/g, '');
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};

export const parseNumericOrZero = (value) => parseNumeric(value) ?? 0;
