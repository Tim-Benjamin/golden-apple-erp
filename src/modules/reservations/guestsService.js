import { supabase } from '../../lib/supabaseClient';

export async function findOrCreateGuest(guestData) {
  // Try to find existing guest by email or phone first, to avoid duplicates
  if (guestData.email) {
    const { data: existing } = await supabase
      .from('guests')
      .select('*')
      .eq('email', guestData.email)
      .maybeSingle();
    if (existing) return existing;
  }

  const { data, error } = await supabase
    .from('guests')
    .insert(guestData)
    .select()
    .single();

  if (error) throw error;
  return data;
}