import { supabase } from './supabaseClient';

// Fire-and-forget, same pattern as sendTransactionalEmail — never blocks the
// action that triggered it, and a failure here should never break the workflow.
export async function sendPushNotification({ staffId, staffIds, title, body, url, tag }) {
  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: { staffId, staffIds, title, body, url, tag },
    });
    if (error) console.error('Push notification failed:', error);
    return data;
  } catch (err) {
    console.error('Push notification failed:', err);
    return null;
  }
}