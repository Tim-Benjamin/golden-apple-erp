import { supabase } from '../../lib/supabaseClient';
import { logActivity } from '../../lib/activityLog';

const LATE_GRACE_MINUTES = 15;

export async function fetchTodayAttendanceFor(staffId) {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('staff_id', staffId)
    .eq('work_date', today)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function findTodayScheduledShift(staffId) {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from('roster_entries')
    .select('*, shift:shift_types(*)')
    .eq('staff_id', staffId)
    .eq('work_date', today)
    .eq('status', 'scheduled')
    .maybeSingle();
  return data;
}

export async function clockIn(staffId) {
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();

  const scheduled = await findTodayScheduledShift(staffId);

  let status = 'present';
  if (scheduled?.shift) {
    const [h, m] = scheduled.shift.start_time.split(':').map(Number);
    const shiftStart = new Date(now);
    shiftStart.setHours(h, m + LATE_GRACE_MINUTES, 0, 0);
    if (now > shiftStart) status = 'late';
  }

  const { data, error } = await supabase
    .from('attendance_records')
    .upsert(
      {
        staff_id: staffId,
        work_date: today,
        clock_in: now.toISOString(),
        status,
        roster_entry_id: scheduled?.id ?? null,
      },
      { onConflict: 'staff_id,work_date' }
    )
    .select()
    .single();

  if (error) throw error;

  logActivity({
    actorId: staffId,
    action: 'staff_clocked_in',
    entityTable: 'attendance_records',
    entityId: data.id,
    details: { status, time: now.toISOString() },
  });

  return data;
}

export async function clockOut(staffId) {
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();

  const { data, error } = await supabase
    .from('attendance_records')
    .update({ clock_out: now.toISOString() })
    .eq('staff_id', staffId)
    .eq('work_date', today)
    .select()
    .single();

  if (error) throw error;

  logActivity({
    actorId: staffId,
    action: 'staff_clocked_out',
    entityTable: 'attendance_records',
    entityId: data.id,
    details: { time: now.toISOString() },
  });

  return data;
}

export async function fetchTodaySummary() {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase.from('attendance_records').select('status').eq('work_date', today);
  if (error) throw error;

  return {
    present: data.filter((a) => a.status === 'present').length,
    late: data.filter((a) => a.status === 'late').length,
    absent: data.filter((a) => a.status === 'absent').length,
    onLeave: data.filter((a) => a.status === 'on_leave').length,
  };
}

export async function fetchAttendanceLog({ fromDate = '', toDate = '', staffId = 'all', status = 'all' } = {}) {
  let query = supabase
    .from('attendance_records')
    .select('*, staff:staff!attendance_records_staff_id_fkey(id, full_name)')
    .order('work_date', { ascending: false });

  if (fromDate) query = query.gte('work_date', fromDate);
  if (toDate) query = query.lte('work_date', toDate);
  if (staffId !== 'all') query = query.eq('staff_id', staffId);
  if (status !== 'all') query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}