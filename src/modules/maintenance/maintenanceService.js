import { supabase } from '../../lib/supabaseClient';

export async function fetchMaintenanceRequests() {
  const { data, error } = await supabase
    .from('maintenance_requests')
    .select(`*, room:rooms(room_number), assigned:staff!maintenance_requests_assigned_to_fkey(full_name), reporter:staff!maintenance_requests_reported_by_fkey(full_name)`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function fetchMaintenanceOfficers() {
  const { data, error } = await supabase
    .from('staff')
    .select('id, full_name, email')
    .eq('role', 'maintenance_officer')
    .eq('is_active', true)
    .order('full_name');

  if (error) throw error;
  return data;
}

export async function createMaintenanceRequest(request) {
  const { data, error } = await supabase
    .from('maintenance_requests')
    .insert(request)
    .select(`*, room:rooms(room_number)`)
    .single();

  if (error) throw error;
  return data;
}

export async function assignMaintenanceRequest(requestId, staffId) {
  const { data, error } = await supabase
    .from('maintenance_requests')
    .update({ assigned_to: staffId, status: 'in_progress' })
    .eq('id', requestId)
    .select(`*, room:rooms(room_number)`)
    .single();

  if (error) throw error;
  return data;
}

export async function completeMaintenanceRequest(requestId, cost) {
  const { data, error } = await supabase
    .from('maintenance_requests')
    .update({ status: 'completed', completed_at: new Date().toISOString(), cost })
    .eq('id', requestId)
    .select(`*, room:rooms(room_number)`)
    .single();

  if (error) throw error;

  // If the room was under maintenance status, restore it to vacant
  if (data.room_id) {
    await supabase.from('rooms').update({ status: 'vacant', last_maintenance_at: new Date().toISOString() }).eq('id', data.room_id);
  }

  return data;
}