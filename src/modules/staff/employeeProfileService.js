import { supabase } from '../../lib/supabaseClient';
import { logActivity } from '../../lib/activityLog';

export async function fetchEmployeeProfile(staffId) {
  const { data, error } = await supabase.from('staff').select('*').eq('id', staffId).single();
  if (error) throw error;
  return data;
}

export async function updateEmployeeProfile(staffId, updates, actorId) {
  const { data, error } = await supabase
    .from('staff')
    .update(updates)
    .eq('id', staffId)
    .select()
    .single();

  if (error) throw error;

  logActivity({
    actorId,
    action: 'employee_profile_updated',
    entityTable: 'staff',
    entityId: staffId,
    details: { fields_changed: Object.keys(updates) },
  });

  return data;
}

export async function fetchStaffStats() {
  const { data, error } = await supabase.from('staff').select('role, is_active');
  if (error) throw error;

  const total = data.length;
  const active = data.filter((s) => s.is_active).length;
  const inactive = total - active;

  const byRole = {};
  data.forEach((s) => {
    byRole[s.role] = (byRole[s.role] || 0) + 1;
  });

  return {
    total,
    active,
    inactive,
    byRole: Object.entries(byRole).map(([role, count]) => ({ name: role.replace('_', ' '), value: count })),
  };
}