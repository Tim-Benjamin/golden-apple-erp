import { supabase } from '../../lib/supabaseClient';

// Fetches all reservations that overlap the given date window, with guest + room info.
// Includes payments so the calendar can distinguish "Confirmed" (unpaid) vs
// "Reserved & Paid" bookings with a different color.
export async function fetchReservationsInRange(startDate, endDate) {
  const { data, error } = await supabase
    .from('reservations')
    .select('id, status, check_in_date, check_out_date, room_id, guest:guests(full_name), room:rooms(room_number), payments(id)')
    .in('status', ['pending', 'confirmed', 'checked_in'])
    .lte('check_in_date', endDate)
    .gte('check_out_date', startDate);

  if (error) throw error;
  return data;
}

// Basic room list (id + room_number only) — used by the calendar for its row labels.
export async function fetchAllRoomsBasic() {
  const { data, error } = await supabase
    .from('rooms')
    .select('id, room_number')
    .order('room_number');

  if (error) throw error;
  return data;
}

// Returns only the rooms that are genuinely free for the given date range —
// i.e. no active (pending/confirmed/checked_in) reservation overlaps those dates.
// Used by NewReservationModal to populate the room dropdown correctly.
export async function fetchAvailableRooms(checkInDate, checkOutDate, excludeReservationId = null) {
  const { data: allRooms, error: roomsError } = await supabase.from('rooms').select('*').order('room_number');
  if (roomsError) throw roomsError;

  let query = supabase
    .from('reservations')
    .select('room_id')
    .in('status', ['pending', 'confirmed', 'checked_in'])
    .lt('check_in_date', checkOutDate)
    .gt('check_out_date', checkInDate);

  if (excludeReservationId) query = query.neq('id', excludeReservationId);

  const { data: overlapping, error: overlapError } = await query;
  if (overlapError) throw overlapError;

  const bookedRoomIds = new Set(overlapping.map((r) => r.room_id));
  return allRooms.filter((r) => !bookedRoomIds.has(r.id));
}