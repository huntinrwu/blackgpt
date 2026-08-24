import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "search_conversations",
  title: "Search conversations",
  description: "Search the signed-in user's BlackGPT conversations by title keyword.",
  inputSchema: {
    query: z.string().trim().min(1).describe("Keyword to match against conversation titles."),
    limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const escaped = query.replace(/[%_,]/g, " ").trim();
    if (!escaped) return { content: [{ type: "text", text: "Query is empty after sanitizing." }], isError: true };

    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("conversations")
      .select("id, title, updated_at")
      .ilike("title", `%${escaped}%`)
      .order("updated_at", { ascending: false })
      .limit(limit ?? 20);

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { conversations: data ?? [] },
    };
  },
});
