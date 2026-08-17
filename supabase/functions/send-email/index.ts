import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const FROM_EMAIL = "Golden Apple Guest House <onboarding@resend.dev>"; // update once domain verified

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// NOTE: This function is responsible ONLY for sending email. Activity logging to
// audit_log now happens exclusively on the client via lib/activityLog.js, so every
// action gets logged consistently whether or not the guest has an email on file.
// (Previously this function also wrote to audit_log, which caused actions with no
// guest email to go completely unlogged, and actions with an email to sometimes log
// twice.)

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { to, subject, html } = await req.json();

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { data: superAdmins } = await supabase
      .from("staff")
      .select("email")
      .eq("role", "super_admin")
      .eq("is_active", true);

    const superAdminEmails = (superAdmins ?? [])
      .map((s) => s.email)
      .filter((email) => email !== to);

    const sendResult = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        cc: superAdminEmails.length > 0 ? superAdminEmails : undefined,
        subject,
        html,
      }),
    });

    const sendData = await sendResult.json();

    if (!sendResult.ok) {
      return new Response(JSON.stringify({ error: sendData }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, data: sendData }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});