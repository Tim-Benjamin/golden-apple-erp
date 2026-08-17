import { supabase } from '../../lib/supabaseClient';
import { logActivity } from '../../lib/activityLog';

export async function fetchAllDisciplinaryRecords({ staffId = 'all' } = {}) {
  let query = supabase
    .from('disciplinary_records')
    .select('*, staff:staff!disciplinary_records_staff_id_fkey(id, full_name), creator:staff!disciplinary_records_created_by_fkey(full_name)')
    .order('incident_date', { ascending: false });

  if (staffId !== 'all') query = query.eq('staff_id', staffId);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createDisciplinaryRecord(record) {
  const { data, error } = await supabase
    .from('disciplinary_records')
    .insert(record)
    .select('*, staff:staff!disciplinary_records_staff_id_fkey(id, full_name)')
    .single();

  if (error) throw error;

  // Deliberately minimal detail in the audit log entry — a disciplinary action is
  // sensitive, so the log confirms *that* something was recorded without exposing
  // the description in a place more people can browse than the restricted table itself.
  logActivity({
    actorId: record.created_by,
    action: 'disciplinary_record_created',
    entityTable: 'disciplinary_records',
    entityId: data.id,
    details: { staff_id: record.staff_id, warning_level: record.warning_level },
  });

  return data;
}

export async function updateDisciplinaryRecord(recordId, updates, actorId) {
  const { data, error } = await supabase
    .from('disciplinary_records')
    .update(updates)
    .eq('id', recordId)
    .select()
    .single();

  if (error) throw error;

  logActivity({
    actorId,
    action: 'disciplinary_record_updated',
    entityTable: 'disciplinary_records',
    entityId: recordId,
    details: { fields_changed: Object.keys(updates) },
  });

  return data;
}