import { auth, defineMcp } from "@lovable.dev/mcp-js";
import askBlackgptTool from "./tools/ask-blackgpt";
import listConversationsTool from "./tools/list-conversations";
import getConversationTool from "./tools/get-conversation";
import searchConversationsTool from "./tools/search-conversations";
import renameConversationTool from "./tools/rename-conversation";
import deleteConversationTool from "./tools/delete-conversation";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "blackgpt",
  title: "BlackGPT",
  version: "0.1.0",
  instructions:
    "Tools for BlackGPT, an AI assistant that answers in hood vernacular (AAVE). Use `ask_blackgpt` to get a hood-style answer to any question, and the conversation tools to list, read, search, rename, or delete the signed-in user's saved BlackGPT chats.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    askBlackgptTool,
    listConversationsTool,
    getConversationTool,
    searchConversationsTool,
    renameConversationTool,
    deleteConversationTool,
  ],
});
