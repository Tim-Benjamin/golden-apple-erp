import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

webpush.setVapidDetails(VAPID_SUBJECT!, VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // staffId: send to one person. staffIds: send to several. Both accepted.
    const { staffId, staffIds, title, body, url, tag } = await req.json();

    const targetIds = staffIds ?? (staffId ? [staffId] : []);
    if (targetIds.length === 0) throw new Error("No target staff member(s) provided.");

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("staff_id", targetIds);

    if (error) throw error;

    const payload = JSON.stringify({ title, body, url, tag });

    const results = await Promise.allSettled(
      (subscriptions ?? []).map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
          {
            // "high" urgency hints to the browser/OS that this should be delivered
            // promptly even if the device is idle or in a low-power background state —
            // browsers that support RFC 8030 urgency headers (Chrome/Edge) respect this.
            urgency: "high",
            // Keep the message available for pickup for up to 24h if the device is
            // briefly offline, instead of the push service discarding it immediately.
            TTL: 60 * 60 * 24,
          }
        )
      )
    );

    // Clean up subscriptions that are no longer valid (expired/unsubscribed on the device)
    const deadEndpoints = [];
    results.forEach((r, i) => {
      if (r.status === "rejected" && (r.reason?.statusCode === 404 || r.reason?.statusCode === 410)) {
        deadEndpoints.push(subscriptions[i].endpoint);
      }
    });
    if (deadEndpoints.length > 0) {
      await supabase.from("push_subscriptions").delete().in("endpoint", deadEndpoints);
    }

    const sent = results.filter((r) => r.status === "fulfilled").length;

    return new Response(JSON.stringify({ success: true, sent, total: subscriptions?.length ?? 0 }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});