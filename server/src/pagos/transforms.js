const PAGOS_TABLE = 'pagos_profiles';

export const transformConsumptionToFrontend = (row) => ({
  id: row.id,
  billId: row.bill_id,
  serviceType: row.service_type,
  provider: row.provider,
  periodFrom: row.period_from,
  periodTo: row.period_to,
  value: Number.parseFloat(row.value) || 0,
  totalAmount: Number.parseFloat(row.total_amount) || 0,
  consumption: row.consumption ? Number.parseFloat(row.consumption) : null,
  unitOfMeasure: row.unit_of_measure,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const transformBillToFrontend = (row, consumptions = []) => ({
  id: row.id,
  user_id: row.user_id,
  serviceType: row.service_type,
  provider: row.provider,
  description: row.description,
  value: Number.parseFloat(row.value) || 0,
  period: row.period,
  invoiceNumber: row.invoice_number,
  contractNumber: row.contract_number,
  totalAmount: Number.parseFloat(row.total_amount) || 0,
  consumption: row.consumption ? Number.parseFloat(row.consumption) : null,
  unitOfMeasure: row.unit_of_measure,
  costCenter: row.cost_center,
  city: row.city,
  businessGroup: row.business_group,
  location: row.location,
  dueDate: row.due_date,
  documentUrl: row.document_url,
  documentName: row.document_name,
  status: row.status,
  notes: row.notes,
  approvedBy: row.approved_by,
  approvedAt: row.approved_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  consumptions,
});

export const transformUserToFrontend = (row) => ({
  id: row.id,
  email: row.email,
  fullName: row.full_name,
  role: row.role,
  department: row.department,
  location: row.location,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const isCoordinator = (role) => role === 'area_coordinator';

export const getPagosTable = () => PAGOS_TABLE;
