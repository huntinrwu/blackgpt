import { useState, useCallback, useEffect } from "react";

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

function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveConversations(convos: Conversation[]) {
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
  const [conversations, setConversations] = useState<Conversation[]>(loadConversations);
  const [activeId, setActiveId] = useState<string | null>(() => {
    const convos = loadConversations();
    return convos.length > 0 ? convos[0].id : null;
  });

  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  const activeConversation = conversations.find((c) => c.id === activeId) ?? null;
  const messages = activeConversation?.messages ?? [];

  const setMessages = useCallback(
    (updater: Msg[] | ((prev: Msg[]) => Msg[])) => {
      setConversations((prev) => {
        if (!activeId) return prev;
        return prev.map((c) => {
          if (c.id !== activeId) return c;
          const newMsgs = typeof updater === "function" ? updater(c.messages) : updater;
          return {
            ...c,
            messages: newMsgs,
            title: generateFallbackTitle(newMsgs),
            updatedAt: Date.now(),
          };
        });
      });
    },
    [activeId]
  );

  const createConversation = useCallback(() => {
    const id = crypto.randomUUID();
    const newConvo: Conversation = {
      id,
      title: "New Chat",
      messages: [],
      updatedAt: Date.now(),
    };
    setConversations((prev) => [newConvo, ...prev]);
    setActiveId(id);
    return id;
  }, []);

  const deleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => {
        const next = prev.filter((c) => c.id !== id);
        if (activeId === id) {
          setActiveId(next.length > 0 ? next[0].id : null);
        }
        return next;
      });
    },
    [activeId]
  );

  const ensureConversation = useCallback(() => {
    if (!activeId) {
      return createConversation();
    }
    return activeId;
  }, [activeId, createConversation]);

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
  };
}
