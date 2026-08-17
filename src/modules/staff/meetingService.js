import { supabase } from '../../lib/supabaseClient';
import { logActivity } from '../../lib/activityLog';

export async function fetchMeetings() {
  const { data, error } = await supabase
    .from('staff_meetings')
    .select('*, creator:staff!staff_meetings_created_by_fkey(full_name)')
    .order('meeting_date', { ascending: false });

  if (error) throw error;
  return data;
}

export async function fetchMeetingDetail(meetingId) {
  const [{ data: meeting, error: meetingError }, { data: attendees, error: attendeesError }, { data: actionItems, error: actionItemsError }] =
    await Promise.all([
      supabase.from('staff_meetings').select('*').eq('id', meetingId).single(),
      supabase.from('meeting_attendees').select('*, staff:staff!meeting_attendees_staff_id_fkey(id, full_name)').eq('meeting_id', meetingId),
      supabase.from('meeting_action_items').select('*, assignee:staff!meeting_action_items_assigned_to_fkey(id, full_name)').eq('meeting_id', meetingId),
    ]);

  if (meetingError) throw meetingError;
  if (attendeesError) throw attendeesError;
  if (actionItemsError) throw actionItemsError;

  return { ...meeting, attendees, actionItems };
}

export async function createMeeting(meeting, attendeeIds) {
  const { data, error } = await supabase.from('staff_meetings').insert(meeting).select().single();
  if (error) throw error;

  if (attendeeIds && attendeeIds.length > 0) {
    const rows = attendeeIds.map((staffId) => ({ meeting_id: data.id, staff_id: staffId }));
    await supabase.from('meeting_attendees').insert(rows);
  }

  logActivity({
    actorId: meeting.created_by,
    action: 'meeting_created',
    entityTable: 'staff_meetings',
    entityId: data.id,
    details: { title: meeting.title, attendee_count: attendeeIds?.length ?? 0 },
  });

  return data;
}

export async function updateMeetingNotes(meetingId, updates) {
  const { data, error } = await supabase.from('staff_meetings').update(updates).eq('id', meetingId).select().single();
  if (error) throw error;
  return data;
}

export async function toggleAttendance(attendeeRowId, attended) {
  const { error } = await supabase.from('meeting_attendees').update({ attended }).eq('id', attendeeRowId);
  if (error) throw error;
}

export async function createActionItem(meetingId, item) {
  const { data, error } = await supabase
    .from('meeting_action_items')
    .insert({ meeting_id: meetingId, ...item })
    .select('*, assignee:staff!meeting_action_items_assigned_to_fkey(id, full_name)')
    .single();

  if (error) throw error;
  return data;
}

export async function markActionItemDone(itemId) {
  const { data, error } = await supabase
    .from('meeting_action_items')
    .update({ status: 'done' })
    .eq('id', itemId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Converts a meeting action item into a real trackable staff task
export async function convertActionItemToTask(item, meetingTitle, actorId) {
  if (!item.assigned_to) throw new Error('This action item has no assignee — assign someone before converting to a task.');

  const { data: task, error: taskError } = await supabase
    .from('staff_tasks')
    .insert({
      title: item.description,
      description: `From meeting: ${meetingTitle}`,
      assigned_to: item.assigned_to,
      assigned_by: actorId,
      priority: 'medium',
      due_at: item.due_date ? new Date(`${item.due_date}T17:00:00`).toISOString() : null,
      status: 'pending',
    })
    .select()
    .single();

  if (taskError) throw taskError;

  const { data: updatedItem, error: updateError } = await supabase
    .from('meeting_action_items')
    .update({ status: 'converted', converted_to_task_id: task.id })
    .eq('id', item.id)
    .select()
    .single();

  if (updateError) throw updateError;

  logActivity({
    actorId,
    action: 'action_item_converted_to_task',
    entityTable: 'meeting_action_items',
    entityId: item.id,
    details: { task_id: task.id },
  });

  return { task, updatedItem };
}