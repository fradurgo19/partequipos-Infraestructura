export interface InternalRequestFormData {
  title: string;
  description: string;
  site_id: string;
  department: string;
  requester_name: string;
  request_date: string;
  measurement_length: string;
  measurement_height: string;
  measurement_depth: string;
  photo_urls: string[];
  design_urls: string[];
}

export const createEmptyInternalRequestForm = (
  defaults: Partial<InternalRequestFormData> = {}
): InternalRequestFormData => ({
  title: '',
  description: '',
  site_id: '',
  department: '',
  requester_name: '',
  request_date: new Date().toISOString().split('T')[0],
  measurement_length: '',
  measurement_height: '',
  measurement_depth: '',
  photo_urls: [],
  design_urls: [],
  ...defaults,
});
