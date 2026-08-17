import { supabase } from './supabaseClient';

// Calls the send-email Edge Function. Never blocks the main action if email fails —
// we log the error but don't throw, so a Resend outage never breaks check-in/checkout.
export async function sendTransactionalEmail({ to, subject, html, actorId, action, entityTable, entityId, details }) {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { to, subject, html, actorId, action, entityTable, entityId, details },
    });
    if (error) console.error('Email send failed:', error);
    return data;
  } catch (err) {
    console.error('Email send failed:', err);
    return null;
  }
}