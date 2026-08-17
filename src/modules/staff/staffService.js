import { supabase } from '../../lib/supabaseClient';

export async function fetchStaff() {
  const { data, error } = await supabase.from('staff').select('*').order('full_name');
  if (error) throw error;
  return data;
}

export async function createStaffAccount({ email, full_name, role, password }) {
  const { data, error } = await supabase.functions.invoke('admin-create-staff', {
    body: { email, full_name, role, password },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function updateStaffRole(staffId, role) {
  const { data, error } = await supabase
    .from('staff')
    .update({ role })
    .eq('id', staffId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleStaffActive(staffId, isActive) {
  const { data, error } = await supabase
    .from('staff')
    .update({ is_active: isActive })
    .eq('id', staffId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateOwnPassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}