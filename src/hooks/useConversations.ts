import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type MsgContent =
  | string
  | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;

export type Msg = { role: "user" | "assistant"; content: MsgContent };

export interface Conversation {
  id: string;
  title: string;
  messages: Msg[];
  updatedAt: number;
}

const STORAGE_KEY = "blackgpt-conversations";

function loadLocal(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocal(convos: Conversation[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(convos));
}

function getTextContent(content: MsgContent): string {
  if (typeof content === "string") return content;
  const textPart = content.find((p) => p.type === "text");
  return textPart ? (textPart as { type: "text"; text: string }).text : "";
}

function generateFallbackTitle(messages: Msg[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "New Chat";
  const raw = getTextContent(first.content);
  if (!raw) return "Image Chat 📸";
  const text = raw.slice(0, 40);
  return text.length < raw.length ? text + "…" : text;
}

export function useConversations() {
  const { user } = useAuth();
  const isCloud = !!user;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const migrationDone = useRef(false);
  const initDone = useRef(false);


  // Load conversations on mount or auth change
  useEffect(() => {
    setLoaded(false);
    if (isCloud) {
      loadCloudConversations().then((convos) => {
        setConversations(convos);
        setActiveId(convos.length > 0 ? convos[0].id : null);
        setLoaded(true);

        // Migrate localStorage chats on first login
        if (!migrationDone.current) {
          migrationDone.current = true;
          const localConvos = loadLocal();
          if (localConvos.length > 0) {
            migrateLocalToCloud(localConvos, user!.id).then((migrated) => {
              if (migrated.length > 0) {
                setConversations((prev) => [...migrated, ...prev]);
                localStorage.removeItem(STORAGE_KEY);
              }
            });
          }
        }
      });
    } else {
      const local = loadLocal();
      setConversations(local);
      setActiveId(local.length > 0 ? local[0].id : null);
      setLoaded(true);
    }
  }, [isCloud, user?.id]);


  // Save to localStorage for guests
  useEffect(() => {
    if (!isCloud && loaded) {
      saveLocal(conversations);
    }
  }, [conversations, isCloud, loaded]);


  const activeConversation = conversations.find((c) => c.id === activeId) ?? null;
  const messages = activeConversation?.messages ?? [];

  const setMessages = useCallback(
    (updater: Msg[] | ((prev: Msg[]) => Msg[]), forId?: string) => {
      setConversations((prev) => {
        const targetId = forId || activeId;
        if (!targetId) return prev;
        return prev.map((c) => {
          if (c.id !== targetId) return c;
          const newMsgs = typeof updater === "function" ? updater(c.messages) : updater;
          return {
            ...c,
            messages: newMsgs,
            title: c.title === "New Chat" ? generateFallbackTitle(newMsgs) : c.title,
            updatedAt: Date.now(),
          };
        });
      });
    },
    [activeId]
  );

  // Persist messages to cloud after streaming completes
  const persistMessages = useCallback(
    async (convoId: string, msgs: Msg[], title?: string) => {
      if (!isCloud) return;

      // Update conversation title if provided
      if (title) {
        await supabase
          .from("conversations")
          .update({ title, updated_at: new Date().toISOString() })
          .eq("id", convoId);
      } else {
        await supabase
          .from("conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", convoId);
      }

      // Delete existing messages and re-insert (simpler than diffing)
      await supabase.from("messages").delete().eq("conversation_id", convoId);
      if (msgs.length > 0) {
        const rows = msgs.map((m, i) => ({
          conversation_id: convoId,
          role: m.role,
          content: m.content as any,
          created_at: new Date(Date.now() + i).toISOString(),
        }));
        await supabase.from("messages").insert(rows);
      }
    },
    [isCloud]
  );

  const createConversation = useCallback(async () => {
    const id = crypto.randomUUID();
    const newConvo: Conversation = {
      id,
      title: "New Chat",
      messages: [],
      updatedAt: Date.now(),
    };

    if (isCloud && user) {
      const { data } = await supabase
        .from("conversations")
        .insert({ id, user_id: user.id, title: "New Chat" })
        .select("id")
        .single();
      if (data) {
        newConvo.id = data.id;
      }
    }

    setConversations((prev) => [newConvo, ...prev]);
    setActiveId(newConvo.id);
    return newConvo.id;
  }, [isCloud, user]);

  // Always land on a "New Chat" after every full app load
  useEffect(() => {
    if (!loaded || initDone.current) return;
    initDone.current = true;

    const emptyNewChat = conversations.find(
      (c) => c.messages.length === 0 && c.title === "New Chat"
    );
    if (emptyNewChat) {
      setActiveId(emptyNewChat.id);
    } else {
      createConversation();
    }
  }, [loaded, conversations, createConversation]);

  const deleteConversation = useCallback(

    async (id: string) => {
      if (isCloud) {
        await supabase.from("conversations").delete().eq("id", id);
      }
      setConversations((prev) => {
        const next = prev.filter((c) => c.id !== id);
        if (activeId === id) {
          setActiveId(next.length > 0 ? next[0].id : null);
        }
        return next;
      });
    },
    [activeId, isCloud]
  );

  const ensureConversation = useCallback(async () => {
    if (!activeId) {
      return createConversation();
    }
    return activeId;
  }, [activeId, createConversation]);

  const setTitle = useCallback(
    async (id: string, title: string) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title } : c))
      );
      if (isCloud) {
        await supabase.from("conversations").update({ title }).eq("id", id);
      }
    },
    [isCloud]
  );

  const clearAll = useCallback(async () => {
    if (isCloud && user) {
      // Delete all user's conversations (messages cascade)
      await supabase.from("conversations").delete().eq("user_id", user.id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setConversations([]);
    setActiveId(null);
  }, [isCloud, user]);

  const sortedConversations = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);

  return {
    conversations: sortedConversations,
    activeId,
    messages,
    setMessages,
    setActiveId,
    createConversation,
    deleteConversation,
    ensureConversation,
    setTitle,
    persistMessages,
    isCloud,
    clearAll,
  };
}

// ---------- Cloud helpers ----------

async function loadCloudConversations(): Promise<Conversation[]> {
  const { data: convos } = await supabase
    .from("conversations")
    .select("*")
    .order("updated_at", { ascending: false });

  if (!convos || convos.length === 0) return [];

  const ids = convos.map((c) => c.id);
  const { data: msgs } = await supabase
    .from("messages")
    .select("*")
    .in("conversation_id", ids)
    .order("created_at", { ascending: true });

  const msgMap = new Map<string, Msg[]>();
  for (const m of msgs || []) {
    const list = msgMap.get(m.conversation_id) || [];
    list.push({ role: m.role as "user" | "assistant", content: m.content as MsgContent });
    msgMap.set(m.conversation_id, list);
  }

  return convos.map((c) => ({
    id: c.id,
    title: c.title,
    messages: msgMap.get(c.id) || [],
    updatedAt: new Date(c.updated_at).getTime(),
  }));
}

async function migrateLocalToCloud(convos: Conversation[], userId: string): Promise<Conversation[]> {
  const migrated: Conversation[] = [];
  for (const convo of convos) {
    if (convo.messages.length === 0) continue;
    const { data } = await supabase
      .from("conversations")
      .insert({
        user_id: userId,
        title: convo.title,
        updated_at: new Date(convo.updatedAt).toISOString(),
      })
      .select("id")
      .single();

    if (data) {
      const rows = convo.messages.map((m, i) => ({
        conversation_id: data.id,
        role: m.role,
        content: m.content as any,
        created_at: new Date(convo.updatedAt - convo.messages.length + i).toISOString(),
      }));
      await supabase.from("messages").insert(rows);
      migrated.push({ ...convo, id: data.id });
    }
  }
  return migrated;
}
