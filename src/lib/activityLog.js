import { supabase } from './supabaseClient';

export async function logActivity({ actorId, action, entityTable, entityId, details }) {
  try {
    const { error } = await supabase.from('audit_log').insert({
      actor_id: actorId ?? null,
      action,
      entity_table: entityTable,
      entity_id: entityId ?? null,
      details: details ?? {},
    });
    if (error) console.error('Activity log failed:', error);
  } catch (err) {
    console.error('Activity log failed:', err);
  }
}