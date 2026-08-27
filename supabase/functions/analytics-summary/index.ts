import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: isAdmin, error: roleError } = await adminClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (roleError) {
      console.error("role check failed:", roleError);
      return json({ error: "Unable to verify access" }, 500);
    }
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    let days = 30;
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const parsed = Number((body as { days?: unknown }).days);
      if (Number.isFinite(parsed)) days = Math.min(365, Math.max(1, Math.trunc(parsed)));
    }

    const { data, error } = await adminClient.rpc("analytics_summary", { _days: days });
    if (error) {
      console.error("analytics_summary failed:", error);
      return json({ error: "Unable to load analytics" }, 500);
    }

    return json(data);
  } catch (e) {
    console.error("analytics-summary error:", e);
    return json({ error: "Unexpected error" }, 500);
  }
});
