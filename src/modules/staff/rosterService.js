import { supabase } from '../../lib/supabaseClient';
import { logActivity } from '../../lib/activityLog';

export async function fetchShiftTypes() {
  const { data, error } = await supabase.from('shift_types').select('*').order('start_time');
  if (error) throw error;
  return data;
}

export async function createShiftType(shiftType) {
  const { data, error } = await supabase.from('shift_types').insert(shiftType).select().single();
  if (error) throw error;
  return data;
}

export async function fetchRosterForMonth(year, month) {
  const startDate = new Date(year, month, 1).toISOString().slice(0, 10);
  const endDate = new Date(year, month + 1, 0).toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('roster_entries')
    .select('*, staff:staff!roster_entries_staff_id_fkey(id, full_name), shift:shift_types(*)')
    .gte('work_date', startDate)
    .lte('work_date', endDate)
    .order('work_date');

  if (error) throw error;
  return data;
}

export async function createRosterEntry(entry) {
  const { data, error } = await supabase
    .from('roster_entries')
    .insert(entry)
    .select('*, staff:staff!roster_entries_staff_id_fkey(id, full_name), shift:shift_types(*)')
    .single();

  if (error) throw error;

  logActivity({
    actorId: entry.created_by,
    action: 'roster_entry_created',
    entityTable: 'roster_entries',
    entityId: data.id,
    details: { staff_id: entry.staff_id, work_date: entry.work_date },
  });

  return data;
}

// Copies every roster entry from one week onto another — used for "Duplicate weekly schedules"
export async function duplicateWeek(sourceWeekStart, targetWeekStart, actorId) {
  const source = new Date(sourceWeekStart);
  const target = new Date(targetWeekStart);
  const offsetDays = Math.round((target - source) / (1000 * 60 * 60 * 24));

  const sourceWeekEnd = new Date(source);
  sourceWeekEnd.setDate(sourceWeekEnd.getDate() + 6);

  const { data: sourceEntries, error } = await supabase
    .from('roster_entries')
    .select('staff_id, shift_type_id, work_date, notes')
    .gte('work_date', source.toISOString().slice(0, 10))
    .lte('work_date', sourceWeekEnd.toISOString().slice(0, 10))
    .eq('status', 'scheduled');

  if (error) throw error;
  if (!sourceEntries || sourceEntries.length === 0) return [];

  const newRows = sourceEntries.map((e) => {
    const newDate = new Date(e.work_date);
    newDate.setDate(newDate.getDate() + offsetDays);
    return {
      staff_id: e.staff_id,
      shift_type_id: e.shift_type_id,
      work_date: newDate.toISOString().slice(0, 10),
      notes: e.notes,
      status: 'scheduled',
      created_by: actorId,
    };
  });

  const { data, error: insertError } = await supabase
    .from('roster_entries')
    .upsert(newRows, { onConflict: 'staff_id,work_date,shift_type_id', ignoreDuplicates: true })
    .select();

  if (insertError) throw insertError;

  logActivity({
    actorId,
    action: 'roster_week_duplicated',
    entityTable: 'roster_entries',
    details: { from: sourceWeekStart, to: targetWeekStart, count: newRows.length },
  });

  return data;
}

export async function markUnavailable(staffId, workDate, shiftTypeId, actorId, notes) {
  const { data, error } = await supabase
    .from('roster_entries')
    .insert({
      staff_id: staffId,
      shift_type_id: shiftTypeId,
      work_date: workDate,
      status: 'unavailable',
      notes: notes || null,
      created_by: actorId,
    })
    .select('*, staff:staff!roster_entries_staff_id_fkey(id, full_name), shift:shift_types(*)')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteRosterEntry(entryId, actorId) {
  const { error } = await supabase.from('roster_entries').delete().eq('id', entryId);
  if (error) throw error;

  logActivity({
    actorId,
    action: 'roster_entry_removed',
    entityTable: 'roster_entries',
    entityId: entryId,
    details: {},
  });
}

export async function fetchTodayRosterWithAttendance() {
  const today = new Date().toISOString().slice(0, 10);

  const { data: roster, error: rosterError } = await supabase
    .from('roster_entries')
    .select('*, staff:staff!roster_entries_staff_id_fkey(id, full_name), shift:shift_types(*)')
    .eq('work_date', today)
    .eq('status', 'scheduled');

  if (rosterError) throw rosterError;

  const { data: attendance, error: attendanceError } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('work_date', today);

  if (attendanceError) throw attendanceError;

  const attendanceByStaff = {};
  (attendance ?? []).forEach((a) => { attendanceByStaff[a.staff_id] = a; });

  return (roster ?? []).map((r) => ({
    ...r,
    attendance: attendanceByStaff[r.staff_id] ?? null,
  }));
}