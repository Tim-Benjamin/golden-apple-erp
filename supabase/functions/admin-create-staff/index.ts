import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "Golden Apple Guest House <onboarding@resend.dev>"; // update once domain verified

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const token = authHeader.replace("Bearer ", "");

    const { data: { user: callerUser }, error: callerError } = await supabaseAdmin.auth.getUser(token);
    if (callerError || !callerUser) throw new Error("Invalid session");

    const { data: callerStaff } = await supabaseAdmin
      .from("staff")
      .select("role")
      .eq("id", callerUser.id)
      .single();

    if (callerStaff?.role !== "super_admin") {
      return new Response(JSON.stringify({ error: "Only Super Admin can create staff accounts." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, full_name, role, password } = await req.json();

    if (!email || !full_name || !role || !password) {
      throw new Error("Missing required fields: email, full_name, role, password");
    }
    if (password.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }

    // Admin sets the password directly now (rather than a system-generated temp
    // password that had to be emailed) — this removes the dependency on email
    // delivery for staff to be able to log in at all.
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role },
    });

    if (createError) throw createError;

    // Best-effort welcome email — nice to have, but the account works regardless
    // of whether this succeeds, since the admin already knows the password.
    let emailSent = false;
    try {
      const emailResult = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [email],
          subject: "Your Golden Apple ERP Account",
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
              <h2 style="color: #a3872b;">Golden Apple Guest House</h2>
              <p>Hi ${full_name},</p>
              <p>An account has been created for you on the Golden Apple ERP system. Please ask your administrator for your login password if it wasn't shared with you directly.</p>
              <p>You can change your password after logging in from your account settings.</p>
              <p style="color: #999; font-size: 12px;">Golden Apple Guest House</p>
            </div>
          `,
        }),
      });
      emailSent = emailResult.ok;
    } catch (_) {
      emailSent = false;
    }

    await supabaseAdmin.from("audit_log").insert({
      actor_id: callerUser.id,
      action: "staff_account_created",
      entity_table: "staff",
      entity_id: newUser.user.id,
      details: { email, role, email_sent: emailSent },
    });

    return new Response(JSON.stringify({ success: true, user: newUser.user }), {
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