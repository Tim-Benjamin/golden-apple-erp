import { supabase } from '../../lib/supabaseClient';
import { logActivity } from '../../lib/activityLog';

export async function fetchTasks({ assignedTo = 'all', status = 'all', priority = 'all' } = {}) {
  let query = supabase
    .from('staff_tasks')
    .select('*, assignee:staff!staff_tasks_assigned_to_fkey(id, full_name), assigner:staff!staff_tasks_assigned_by_fkey(id, full_name)')
    .order('due_at', { ascending: true, nullsFirst: false });

  if (assignedTo !== 'all') query = query.eq('assigned_to', assignedTo);
  if (status !== 'all') query = query.eq('status', status);
  if (priority !== 'all') query = query.eq('priority', priority);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function fetchMyTasks(staffId) {
  const { data, error } = await supabase
    .from('staff_tasks')
    .select('*, assigner:staff!staff_tasks_assigned_by_fkey(id, full_name)')
    .eq('assigned_to', staffId)
    .in('status', ['pending', 'in_progress'])
    .order('due_at', { ascending: true, nullsFirst: false });

  if (error) throw error;
  return data;
}

export async function createTask(task) {
  const { data, error } = await supabase
    .from('staff_tasks')
    .insert(task)
    .select('*, assignee:staff!staff_tasks_assigned_to_fkey(id, full_name)')
    .single();

  if (error) throw error;

  logActivity({
    actorId: task.assigned_by,
    action: 'task_assigned',
    entityTable: 'staff_tasks',
    entityId: data.id,
    details: { title: task.title, assigned_to: task.assigned_to, priority: task.priority },
  });

  return data;
}

export async function updateTaskStatus(taskId, status, actorId) {
  const updates = { status };
  if (status === 'completed') updates.completed_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('staff_tasks')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw error;

  logActivity({
    actorId,
    action: 'task_status_updated',
    entityTable: 'staff_tasks',
    entityId: taskId,
    details: { status },
  });

  return data;
}

export async function verifyTask(taskId, actorId) {
  const { data, error } = await supabase
    .from('staff_tasks')
    .update({ status: 'verified', verified_at: new Date().toISOString(), verified_by: actorId })
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw error;

  logActivity({
    actorId,
    action: 'task_verified',
    entityTable: 'staff_tasks',
    entityId: taskId,
    details: {},
  });

  return data;
}

export async function deleteTask(taskId, actorId) {
  const { error } = await supabase.from('staff_tasks').delete().eq('id', taskId);
  if (error) throw error;

  logActivity({
    actorId,
    action: 'task_removed',
    entityTable: 'staff_tasks',
    entityId: taskId,
    details: {},
  });
}