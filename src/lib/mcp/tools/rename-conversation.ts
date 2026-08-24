import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "rename_conversation",
  title: "Rename conversation",
  description: "Rename one of the signed-in user's BlackGPT conversations.",
  inputSchema: {
    conversation_id: z.string().uuid().describe("The conversation id to rename."),
    title: z.string().trim().min(1).max(120).describe("The new conversation title."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ conversation_id, title }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("conversations")
      .update({ title })
      .eq("id", conversation_id)
      .select("id, title")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Conversation not found" }], isError: true };
    return {
      content: [{ type: "text", text: `Renamed to "${data.title}"` }],
      structuredContent: { conversation: data },
    };
  },
});
