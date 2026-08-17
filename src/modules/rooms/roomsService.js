import { supabase } from '../../lib/supabaseClient';

export async function fetchRooms() {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .order('room_number', { ascending: true });

  if (error) throw error;
  return data;
}

export async function updateRoom(roomId, updates) {
  const { data, error } = await supabase
    .from('rooms')
    .update(updates)
    .eq('id', roomId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateRoomStatus(roomId, status) {
  return updateRoom(roomId, { status });
}