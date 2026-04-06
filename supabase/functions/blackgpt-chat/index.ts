import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

// Simple in-memory rate limiter (per isolate)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30; // requests per window
const RATE_WINDOW_MS = 60_000; // 1 minute

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitMap) {
    if (now > val.resetAt) rateLimitMap.delete(key);
  }
}, 60_000);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Authentication ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing authorization. Sign in to use BlackGPT. 🔐" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    // Allow both authenticated users and anon key (guest mode)
    let userId = "guest";
    if (!userError && user) {
      userId = user.id;
    }

    // --- Rate Limiting ---
    if (!checkRateLimit(userId)) {
      return new Response(
        JSON.stringify({ error: "Slow down fam, you sendin too many messages. Wait a min. ⏳" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { messages, action } = body;

    // Input validation
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages array is required and must not be empty." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (messages.length > 100) {
      return new Response(
        JSON.stringify({ error: "Too many messages. Max 100 per request." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    for (const msg of messages) {
      if (!msg.role || !["user", "assistant", "system"].includes(msg.role)) {
        return new Response(
          JSON.stringify({ error: "Each message must have a valid role (user, assistant, system)." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (!msg.content) {
        return new Response(
          JSON.stringify({ error: "Each message must have content." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (typeof msg.content === "string" && msg.content.length > 32768) {
        return new Response(
          JSON.stringify({ error: "Message content too long. Max 32KB per message." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    if (action && !["generate_title"].includes(action)) {
      return new Response(
        JSON.stringify({ error: "Invalid action." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Title generation (non-streaming)
    if (action === "generate_title") {
      const titleResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: `You generate short, creative, hood-style conversation titles (2-5 words max). Think of how ChatGPT or Gemini name conversations, but make it hood/street certified. Use AAVE slang, be creative and funny. Examples: "Finna Debug This Jawn", "Tax Season Got Me Stressed", "Coding Up A Lick", "Recipe Went Crazy Fr", "That Math Ain't Mathin", "Drip Check on the Resume", "Tryna Get This Bread". Just respond with the title only, no quotes, no explanation.`,
            },
            {
              role: "user",
              content: `Generate a short hood-style title for a conversation that starts with this message: "${
                typeof messages[0]?.content === "string"
                  ? messages[0].content.slice(0, 200)
                  : "[image message]"
              }"`,
            },
          ],
          stream: false,
        }),
      });

      if (!titleResp.ok) {
        return new Response(JSON.stringify({ title: "New Chat 💬" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const titleData = await titleResp.json();
      const title = titleData.choices?.[0]?.message?.content?.trim() || "New Chat 💬";
      return new Response(JSON.stringify({ title }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Limit conversation history sent to AI (last 40 messages to control costs)
    const trimmedMessages = messages.slice(-40);

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
          ...trimmedMessages,
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
