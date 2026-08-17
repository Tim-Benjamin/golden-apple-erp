import { supabase } from '../../lib/supabaseClient';
import { logActivity } from '../../lib/activityLog';
import { sendPushNotification } from '../../lib/pushService';

// ============================================
// ROOM CLEANING (checklist-based, triggered after checkout)
// ============================================

export async function fetchRoomsNeedingCleaning() {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('status', 'cleaning')
    .order('room_number');

  if (error) throw error;
  return data;
}

export async function fetchAllRoomsForHousekeeping() {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .order('room_number');

  if (error) throw error;
  return data;
}

export async function completeCleaningChecklist(roomId, checklist, housekeeperId, roomNumber) {
  const { error: logError } = await supabase.from('cleaning_logs').insert({
    room_id: roomId,
    housekeeper_id: housekeeperId,
    checklist,
    damage_found: checklist.damage_found ?? false,
  });
  if (logError) throw logError;

  const { data, error } = await supabase
    .from('rooms')
    .update({
      status: 'vacant',
      last_cleaned_at: new Date().toISOString(),
      housekeeper_id: housekeeperId,
    })
    .eq('id', roomId)
    .select()
    .single();

  if (error) throw error;

  if (checklist.damage_found) {
    await supabase.from('maintenance_requests').insert({
      room_id: roomId,
      category: 'other',
      priority: 'medium',
      status: 'open',
      description: `Damage reported during cleaning of ${roomNumber ?? 'room'}: ${checklist.damage_notes || 'No details provided.'}`,
      reported_by: housekeeperId,
    });
  }

  logActivity({
    actorId: housekeeperId,
    action: 'room_cleaned',
    entityTable: 'rooms',
    entityId: roomId,
    details: { room: roomNumber, damage_found: checklist.damage_found ?? false },
  });

  return data;
}

export async function fetchHousekeepers() {
  const { data, error } = await supabase
    .from('staff')
    .select('id, full_name, email')
    .eq('role', 'housekeeper')
    .eq('is_active', true)
    .order('full_name');

  if (error) throw error;
  return data;
}

export async function assignHousekeeper(roomId, housekeeperId) {
  const { data, error } = await supabase
    .from('rooms')
    .update({ housekeeper_id: housekeeperId })
    .eq('id', roomId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function unassignHousekeeper(roomId) {
  return assignHousekeeper(roomId, null);
}

// ============================================
// DUTY SCHEDULING (calendar-based, admin assigns, housekeeper checks done)
// ============================================

export async function fetchDutiesForMonth(year, month) {
  const startDate = new Date(year, month, 1).toISOString().slice(0, 10);
  const endDate = new Date(year, month + 1, 0).toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('housekeeping_duties')
    .select('*, housekeeper:staff!housekeeping_duties_housekeeper_id_fkey(id, full_name), room:rooms(room_number)')
    .gte('duty_date', startDate)
    .lte('duty_date', endDate)
    .order('duty_date');

  if (error) throw error;
  return data;
}

export async function createDuty(duty) {
  const { data, error } = await supabase
    .from('housekeeping_duties')
    .insert(duty)
    .select('*, housekeeper:staff!housekeeping_duties_housekeeper_id_fkey(id, full_name), room:rooms(room_number)')
    .single();

  if (error) throw error;

  logActivity({
    actorId: duty.created_by,
    action: 'duty_scheduled',
    entityTable: 'housekeeping_duties',
    entityId: data.id,
    details: { housekeeper_id: duty.housekeeper_id, duty_date: duty.duty_date, duty_area: duty.duty_area },
  });

  sendPushNotification({
    staffId: duty.housekeeper_id,
    title: 'New Duty Scheduled',
    body: `${duty.duty_area} on ${duty.duty_date}`,
    url: '/housekeeping',
    tag: `duty-${data.id}`,
  }).catch(() => {});

  return data;
}

// Schedules the SAME duty (housekeeper + area) across every day in a date range —
// used for "assign this whole month" or "this person cleans the lobby for the next 2 weeks"
// style scheduling, instead of adding one day at a time.
export async function createDutiesForDateRange({ housekeeperId, dutyArea, roomId, notes, startDate, endDate, createdBy }) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const rows = [];

  const cursor = new Date(start);
  while (cursor <= end) {
    rows.push({
      housekeeper_id: housekeeperId,
      duty_date: cursor.toISOString().slice(0, 10),
      duty_area: dutyArea,
      room_id: roomId || null,
      notes: notes || null,
      status: 'scheduled',
      created_by: createdBy,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  if (rows.length === 0) return [];

  const { data, error } = await supabase
    .from('housekeeping_duties')
    .insert(rows)
    .select('*, housekeeper:staff!housekeeping_duties_housekeeper_id_fkey(id, full_name), room:rooms(room_number)');

  if (error) throw error;

  logActivity({
    actorId: createdBy,
    action: 'duty_scheduled',
    entityTable: 'housekeeping_duties',
    details: { housekeeper_id: housekeeperId, duty_area: dutyArea, from: startDate, to: endDate, days: rows.length },
  });

  sendPushNotification({
    staffId: housekeeperId,
    title: 'New Duties Scheduled',
    body: `${dutyArea} scheduled for ${rows.length} day(s) starting ${startDate}`,
    url: '/housekeeping',
  }).catch(() => {});

  return data;
}

export async function deleteDuty(dutyId, actorId) {
  const { error } = await supabase.from('housekeeping_duties').delete().eq('id', dutyId);
  if (error) throw error;

  logActivity({
    actorId,
    action: 'duty_removed',
    entityTable: 'housekeeping_duties',
    entityId: dutyId,
    details: {},
  });
}

export async function completeDuty(dutyId, completionNotes, actorId) {
  const completedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from('housekeeping_duties')
    .update({ status: 'completed', completed_at: completedAt, completion_notes: completionNotes || null })
    .eq('id', dutyId)
    .select('*, housekeeper:staff!housekeeping_duties_housekeeper_id_fkey(id, full_name), room:rooms(room_number)')
    .single();

  if (error) throw error;

  logActivity({
    actorId,
    action: 'duty_completed',
    entityTable: 'housekeeping_duties',
    entityId: dutyId,
    details: { duty_area: data.duty_area, duty_date: data.duty_date, completed_at: completedAt },
  });

  return data;
}

// ============================================
// COMPLETED LOG — unifies scheduled duty completions AND reactive room-cleaning
// checklist completions into a single chronological log for the admin view.
// ============================================

export async function fetchCompletedDutiesLog({ fromDate = '', toDate = '', housekeeperId = 'all', search = '' } = {}) {
  // Source 1: scheduled duties marked completed
  let dutyQuery = supabase
    .from('housekeeping_duties')
    .select('*, housekeeper:staff!housekeeping_duties_housekeeper_id_fkey(id, full_name), room:rooms(room_number)')
    .eq('status', 'completed')
    .order('completed_at', { ascending: false });

  if (fromDate) dutyQuery = dutyQuery.gte('duty_date', fromDate);
  if (toDate) dutyQuery = dutyQuery.lte('duty_date', toDate);
  if (housekeeperId !== 'all') dutyQuery = dutyQuery.eq('housekeeper_id', housekeeperId);

  // Source 2: reactive room-cleaning checklist completions (post-checkout cleaning)
  let cleaningQuery = supabase
    .from('cleaning_logs')
    .select('*, housekeeper:staff(id, full_name), room:rooms(room_number)')
    .order('created_at', { ascending: false });

  if (fromDate) cleaningQuery = cleaningQuery.gte('created_at', `${fromDate}T00:00:00.000Z`);
  if (toDate) cleaningQuery = cleaningQuery.lte('created_at', `${toDate}T23:59:59.999Z`);
  if (housekeeperId !== 'all') cleaningQuery = cleaningQuery.eq('housekeeper_id', housekeeperId);

  const [{ data: duties, error: dutiesError }, { data: cleanings, error: cleaningsError }] = await Promise.all([
    dutyQuery,
    cleaningQuery,
  ]);

  if (dutiesError) throw dutiesError;
  if (cleaningsError) throw cleaningsError;

  const unifiedDuties = (duties ?? []).map((d) => {
    const scheduledDate = d.duty_date;
    const completedDate = d.completed_at ? d.completed_at.slice(0, 10) : null;
    return {
      id: `duty-${d.id}`,
      source: 'duty',
      typeLabel: 'Scheduled Duty',
      housekeeper: d.housekeeper,
      area: d.room?.room_number ? `${d.duty_area} (${d.room.room_number})` : d.duty_area,
      scheduledDate,
      completedAt: d.completed_at,
      onTime: scheduledDate && completedDate ? scheduledDate === completedDate : null,
      notes: d.completion_notes,
    };
  });

  const unifiedCleanings = (cleanings ?? []).map((c) => ({
    id: `clean-${c.id}`,
    source: 'room_cleaning',
    typeLabel: 'Room Cleaning',
    housekeeper: c.housekeeper,
    area: c.room?.room_number ? `Room ${c.room.room_number}` : 'Room',
    scheduledDate: null, // reactive — triggered by checkout, not pre-scheduled
    completedAt: c.created_at,
    onTime: null,
    notes: c.damage_found ? 'Damage reported during cleaning' : null,
  }));

  let combined = [...unifiedDuties, ...unifiedCleanings].sort(
    (a, b) => new Date(b.completedAt) - new Date(a.completedAt)
  );

  if (search) {
    const q = search.toLowerCase();
    combined = combined.filter(
      (row) => row.housekeeper?.full_name?.toLowerCase().includes(q) || row.area?.toLowerCase().includes(q)
    );
  }

  return combined;
}