export type UserRole = 'admin' | 'infrastructure' | 'supervision' | 'contractor' | 'internal_client';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export type ServiceOrderStatus = 'draft' | 'pending_approval' | 'approved' | 'in_progress' | 'completed' | 'cancelled';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department?: string;
  phone?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Site {
  id: string;
  name: string;
  location: string;
  coordinates?: { lat: number; lng: number };
  area_to_paint?: number;
  bathrooms_count?: number;
  walls_count?: number;
  characteristics?: string;
  photos_urls?: string[];
  blueprint_urls?: string[];
  network_info?: any;
  site_history?: any;
  cut_pdf_urls?: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
  stats?: {
    pending: number;
    inProgress: number;
    completed: number;
    total: number;
  };
}

export interface Task {
  id: string;
  title: string;
  description: string;
  task_type: string;
  requesting_area: string;
  site_id?: string;
  project_name?: string;
  requester_name?: string;
  requester_id: string;
  assignee_id?: string;
  status: TaskStatus;
  budget_amount?: number;
  photo_urls?: string[];
  signature_url?: string;
  approved_by?: string;
  approved_at?: string;
  started_at?: string;
  completed_at?: string;
  request_date?: string;
  start_date?: string;
  service_order_date?: string;
  budget_approval_date?: string;
  delivery_date?: string;
  completion_date?: string;
  initial_photo_url?: string;
  completion_photo_url?: string;
  service_order_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceOrder {
  id: string;
  order_number: string;
  site_id: string;
  contractor_id: string;
  task_id?: string;
  requester_id?: string;
  executor_id?: string;
  activity_type: string;
  activities?: string[];
  description: string;
  request_date: string;
  start_date?: string;
  end_date?: string;
  oco_date?: string;
  budget_amount: number;
  actual_amount?: number;
  status: ServiceOrderStatus;
  attachment_urls?: string[];
  signature_url?: string;
  authorized_by?: string;
  authorized_at?: string;
  purchase_order_id?: string;
  response_time_hours?: number;
  execution_time_hours?: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Measurement {
  id: string;
  title: string;
  site_id?: string;
  task_id?: string;
  length?: number;
  height?: number;
  depth?: number;
  width?: number;
  measurement_unit?: 'm' | 'm²' | 'm³';
  calculated_area?: number;
  calculated_volume?: number;
  photo_urls?: string[];
  photo_height_url?: string;
  photo_length_url?: string;
  photo_width_url?: string;
  photo_general_url?: string;
  activities?: string;
  globales?: string;
  admin_hours?: number;
  observations?: string;
  how_to_do?: string;
  cut_value?: number;
  edison_signature_url?: string;
  pdf_url?: string;
  submitted_at?: string;
  status: 'pending' | 'approved_edison' | 'approved_felipe' | 'approved_claudia';
  approved_by_edison?: string;
  approved_by_felipe?: string;
  approved_by_claudia?: string;
  approved_at_edison?: string;
  approved_at_felipe?: string;
  approved_at_claudia?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  site?: Site;
  task?: Task;
}

export interface InternalRequest {
  id: string;
  title: string;
  description: string;
  department: string;
  site_id?: string;
  request_date?: string;
  photo_urls?: string[];
  measurement_length?: number;
  measurement_height?: number;
  measurement_depth?: number;
  design_urls?: string[];
  status: TaskStatus;
  assigned_to?: string;
  requester_id?: string;
  task_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  site?: Site;
  task?: Task;
  requester?: User;
}

export interface Quotation {
  id: string;
  title: string;
  description: string;
  tipo_cotizacion?: string;
  cantidad?: number;
  formato_contratista?: string;
  quotation_1_url?: string;
  quotation_2_url?: string;
  quotation_3_url?: string;
  quotation_1_amount?: number;
  quotation_2_amount?: number;
  quotation_3_amount?: number;
  quotation_1_provider?: string;
  quotation_2_provider?: string;
  quotation_3_provider?: string;
  pdf_comparativo_url?: string;
  comparativo_por_monto?: any;
  comparativo_por_valor?: any;
  comparativo_por_descripcion?: any;
  status: 'pending' | 'reviewed' | 'approved';
  reviewed_by?: string;
  reviewed_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Contractor {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  specialty: string[];
  rating?: number;
  nit?: string;
  address?: string;
  city?: string;
  country?: string;
  website?: string;
  tax_id?: string;
  bank_account?: string;
  bank_name?: string;
  notes?: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskTimeline {
  id: string;
  task_id: string;
  event_type: 'created' | 'assigned' | 'started' | 'updated' | 'completed' | 'cancelled';
  description: string;
  user_id: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'task' | 'service_order' | 'quotation' | 'measurement';
  reference_id?: string;
  read: boolean;
  created_at: string;
}

export interface PurchaseOrder {
  id: string;
  order_number: string;
  issued_to: string;
  issued_to_nit: string;
  order_date: string;
  authorized_by?: string;
  activity_type: string;
  items: Array<{ description: string; price: number; quantity: number }>;
  subtotal: number;
  taxes: number;
  total: number;
  site_id?: string;
  project_code?: string;
  cost_center?: string;
  comments?: string;
  quotation_number?: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'completed' | 'cancelled';
  created_by: string;
  prepared_by?: string;
  quotation_attachment_url?: string;
  invoice_attachment_url?: string;
  pdf_url?: string;
  area_code?: string;
  prepared_by_name?: string;
  authorized_by_name?: string;
  prepared_signature_url?: string;
  employee_signature_url?: string;
  prepared_date?: string;
  employee_signature_date?: string;
  tax_type?: string;
  other_taxes?: number;
  company_nit?: string;
  company_phone?: string;
  erpg_number?: string;
  service_order_id?: string;
  created_at: string;
  updated_at: string;
  site?: Site;
  service_order?: ServiceOrder;
}

export interface Contract {
  id: string;
  contract_number: string;
  contractor_id: string;
  contract_type: 'labor' | 'supply' | 'mixed';
  description: string;
  total_amount: number;
  start_date: string;
  end_date?: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  activities?: any;
  additional_activities?: any;
  payment_terms?: string;
  legal_review_status?: string;
  legal_reviewed_by?: string;
  legal_reviewed_at?: string;
  site_id?: string;
  activity_type?: string;
  cost_center?: string;
  internal_client_type?: string;
  contract_document_url?: string;
  legal_review_notes?: string;
  budget_control?: {
    total_budget: number;
    spent: number;
    remaining: number;
    items: Array<{ description: string; amount: number }>;
  };
  project_name?: string;
  payment_schedule?: any;
  deliverables?: any;
  warranty_period?: number;
  warranty_terms?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  contractor?: Contractor;
  site?: Site;
}

export interface ContractAddendum {
  id: string;
  contract_id: string;
  addendum_number: number;
  description: string;
  additional_amount: number;
  additional_activities?: any;
  approved_by?: string;
  approved_at?: string;
  document_url?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ContractTracking {
  id: string;
  contract_id: string;
  tracking_date: string;
  dimensions?: { length?: number; width?: number; height?: number; area?: number; unit: string };
  activity_description: string;
  location_detail?: string;
  photo_urls?: string[];
  budget_review?: string;
  activities_completed?: any;
  reviewer_signature_url?: string;
  reviewed_by?: string;
  compliance_status?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}
