import { supabase } from './supabaseClient';

// Uploads a photo to the staff-avatars bucket under the staff member's own folder
// (required by the storage RLS policy) and returns a public URL to store on their profile.
export async function uploadAvatar(staffId, file) {
  const ext = file.name.split('.').pop();
  const path = `${staffId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('staff-avatars')
    .upload(path, file, { upsert: true, cacheControl: '3600' });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('staff-avatars').getPublicUrl(path);
  // Cache-bust so the new photo shows immediately instead of a stale cached one
  return `${data.publicUrl}?t=${Date.now()}`;
}