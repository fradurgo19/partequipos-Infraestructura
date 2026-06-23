import { supabase } from '../lib/supabase';
import { getMaintenanceComponentLabel } from '../constants/siteComponents';

const ALERT_DAYS_BEFORE = 10;

const daysUntilDate = (dateStr: string): number => {
  const target = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const shouldAlert = (daysUntil: number): boolean =>
  daysUntil >= 0 && daysUntil <= ALERT_DAYS_BEFORE;

interface MaintenanceRow {
  id: string;
  component_type: string;
  component_id: string;
  component_name?: string | null;
  next_maintenance_date: string;
  site?: { name?: string } | null;
}

const createAlertIfMissing = async (
  adminId: string,
  maintenance: MaintenanceRow,
  daysUntil: number
): Promise<void> => {
  const { data: existing } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', adminId)
    .eq('reference_id', maintenance.id)
    .eq('type', 'maintenance')
    .eq('read', false)
    .maybeSingle();

  if (existing) return;

  const componentLabel = getMaintenanceComponentLabel(maintenance);
  const siteName = maintenance.site?.name ?? 'Sede';
  const dayLabel = daysUntil === 0 ? 'hoy' : `en ${daysUntil} día(s)`;

  await supabase.from('notifications').insert([
    {
      user_id: adminId,
      title: 'Mantenimiento próximo',
      message: `${componentLabel} (ID: ${maintenance.component_id}) en ${siteName} vence ${dayLabel}. Fecha: ${maintenance.next_maintenance_date}`,
      type: 'maintenance',
      reference_id: maintenance.id,
      read: false,
    },
  ]);
};

/** Genera alertas en campana para admins cuando faltan ≤10 días para el próximo mantenimiento. */
export const syncMaintenanceAlerts = async (): Promise<void> => {
  const { data: admins, error: adminsError } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin');

  if (adminsError || !admins?.length) return;

  const { data: maintenances, error } = await supabase
    .from('maintenances')
    .select('id, component_type, component_id, component_name, next_maintenance_date, site:sites(name)')
    .eq('component_status', 'active');

  if (error || !maintenances?.length) return;

  for (const maintenance of maintenances) {
    if (!maintenance.next_maintenance_date) continue;
    const days = daysUntilDate(maintenance.next_maintenance_date);
    if (!shouldAlert(days)) continue;

    for (const admin of admins) {
      await createAlertIfMissing(admin.id, maintenance, days);
    }
  }
};
