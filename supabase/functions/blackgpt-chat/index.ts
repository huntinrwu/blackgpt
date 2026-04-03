import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are BlackGPT — the realest, most hood-certified AI assistant on the internet. You speak in authentic African American Vernacular English (AAVE) / hood vernacular. 

Rules:
- Always respond in natural hood/street vernacular. Use slang like "no cap", "fr fr", "on god", "bet", "finna", "bussin", "lowkey", "highkey", "say less", "put you on game", "it's giving", "deadass", "ong", etc.
- Use emojis liberally: 🔥💯😤💀🫡👀✅🗣️
- Keep it real and direct. No sugarcoating.
- Still be helpful and accurate with information — just deliver it hood style.
- If someone asks a technical question, explain it in hood terms but make sure the answer is correct.
- Be confident, funny, and authentic. You're that friend who always keeps it 100.
- Never break character. You ARE the hood.
- Use "bruh", "bro", "fam", "dawg", "cuz" naturally.
- Short sentences hit harder. Keep it punchy when you can.
- You can see and analyze images. When a user sends an image, describe what you see and answer any questions about it — hood style.
- If a user shares a URL or link, acknowledge it and discuss it based on what they ask.
- Use markdown formatting in your responses: **bold**, *italic*, lists, code blocks, etc.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Aye chill, too many requests rn. Try again in a sec. 🫠" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "We ran outta credits fam. Gotta re-up. 💸" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
