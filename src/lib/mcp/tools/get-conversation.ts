import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

type Part = { type?: string; text?: string; image?: string };

function toText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return (content as Part[])
      .map((p) => (p?.type === "text" ? p.text ?? "" : p?.type === "image" ? "[image]" : ""))
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

export default defineTool({
  name: "get_conversation",
  title: "Get conversation",
  description: "Read the full message transcript of one of the signed-in user's BlackGPT conversations.",
  inputSchema: {
    conversation_id: z.string().uuid().describe("The conversation id from list_conversations."),
    limit: z.number().int().min(1).max(200).optional().describe("Max messages to return (default 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ conversation_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data: convo, error: convoError } = await supabase
      .from("conversations")
      .select("id, title, created_at, updated_at")
      .eq("id", conversation_id)
      .maybeSingle();
    if (convoError) return { content: [{ type: "text", text: convoError.message }], isError: true };
    if (!convo) return { content: [{ type: "text", text: "Conversation not found" }], isError: true };

    const { data, error } = await supabase
      .from("messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: true })
      .limit(limit ?? 100);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const messages = (data ?? []).map((m) => ({
      id: m.id,
      role: m.role,
      created_at: m.created_at,
      text: toText(m.content),
    }));
    const transcript = [`# ${convo.title}`, ...messages.map((m) => `**${m.role}:** ${m.text}`)].join("\n\n");
    return {
      content: [{ type: "text", text: transcript }],
      structuredContent: { conversation: convo, messages },
    };
  },
});
