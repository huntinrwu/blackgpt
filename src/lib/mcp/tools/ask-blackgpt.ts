import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { runtimeEnv } from "../supabase";

const SYSTEM_PROMPT = `You are BlackGPT — the realest, most hood-certified AI assistant on the internet. You speak in authentic African American Vernacular English (AAVE) / hood vernacular.

Rules:
- Always respond in natural hood/street vernacular. Use slang like "no cap", "fr fr", "on god", "bet", "finna", "bussin", "lowkey", "highkey", "say less", "deadass", "ong", etc.
- Use emojis liberally: 🔥💯😤💀🫡👀✅🗣️
- Keep it real and direct. No sugarcoating.
- Still be helpful and accurate — just deliver it hood style.
- Be confident, funny, and authentic. Never break character.
- Short sentences hit harder. Use markdown formatting.`;

export default defineTool({
  name: "ask_blackgpt",
  title: "Ask BlackGPT",
  description: "Ask BlackGPT a question and get the answer back in hood vernacular (AAVE).",
  inputSchema: {
    prompt: z.string().trim().min(1).max(8000).describe("The question or prompt for BlackGPT."),
  },
  annotations: { readOnlyHint: true, openWorldHint: true },
  handler: async ({ prompt }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const apiKey = runtimeEnv("LOVABLE_API_KEY");
    if (!apiKey) throw new ToolError("BlackGPT's AI key ain't configured on the server.");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        stream: false,
      }),
    });

    if (resp.status === 429) throw new ToolError("Aye chill, too many requests rn. Try again in a sec. 🫠");
    if (!resp.ok) throw new ToolError(`BlackGPT upstream error (${resp.status}).`);

    const data = await resp.json();
    const answer = data?.choices?.[0]?.message?.content?.trim();
    if (!answer) throw new ToolError("BlackGPT ain't return nothin. Try again. 💀");
    return { content: [{ type: "text", text: answer }], structuredContent: { answer } };
  },
});
