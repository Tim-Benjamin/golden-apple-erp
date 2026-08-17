import { supabase } from '../../lib/supabaseClient';
import { logActivity } from '../../lib/activityLog';

export async function fetchTrainingsFor(staffId) {
  const { data, error } = await supabase
    .from('staff_trainings')
    .select('*')
    .eq('staff_id', staffId)
    .order('training_date', { ascending: false });

  if (error) throw error;
  return data;
}

export async function fetchAllTrainings({ staffId = 'all' } = {}) {
  let query = supabase
    .from('staff_trainings')
    .select('*, staff:staff!staff_trainings_staff_id_fkey(id, full_name)')
    .order('training_date', { ascending: false });

  if (staffId !== 'all') query = query.eq('staff_id', staffId);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createTraining(training) {
  const { data, error } = await supabase
    .from('staff_trainings')
    .insert(training)
    .select('*, staff:staff!staff_trainings_staff_id_fkey(id, full_name)')
    .single();

  if (error) throw error;

  logActivity({
    actorId: training.created_by,
    action: 'training_recorded',
    entityTable: 'staff_trainings',
    entityId: data.id,
    details: { staff_id: training.staff_id, training_name: training.training_name },
  });

  return data;
}

export async function deleteTraining(trainingId, actorId) {
  const { error } = await supabase.from('staff_trainings').delete().eq('id', trainingId);
  if (error) throw error;

  logActivity({
    actorId,
    action: 'training_removed',
    entityTable: 'staff_trainings',
    entityId: trainingId,
    details: {},
  });
}

export async function fetchExpiringCertifications(daysAhead = 30) {
  const today = new Date().toISOString().slice(0, 10);
  const future = new Date();
  future.setDate(future.getDate() + daysAhead);
  const futureISO = future.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('staff_trainings')
    .select('*, staff:staff!staff_trainings_staff_id_fkey(full_name)')
    .not('expiry_date', 'is', null)
    .gte('expiry_date', today)
    .lte('expiry_date', futureISO)
    .order('expiry_date');

  if (error) throw error;
  return data;
}