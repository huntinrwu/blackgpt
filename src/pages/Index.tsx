import { useState, useRef, useEffect } from "react";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import ConversationSidebar from "@/components/ConversationSidebar";
import { useConversations, Msg, MsgContent } from "@/hooks/useConversations";
import ConversationSidebar from "@/components/ConversationSidebar";
import { useConversations, Msg } from "@/hooks/useConversations";
import { useIsMobile } from "@/hooks/use-mobile";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/blackgpt-chat`;

const Index = () => {
  const {
    conversations,
    activeId,
    messages,
    setMessages,
    setActiveId,
    createConversation,
    deleteConversation,
    ensureConversation,
  } = useConversations();

  const [isLoading, setIsLoading] = useState(false);
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-close sidebar on mobile when switching conversations
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [activeId, isMobile]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (input: MsgContent) => {
    const convId = ensureConversation();
    const userMsg: Msg = { role: "user", content: input };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setIsLoading(true);

    let assistantSoFar = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to get response");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              const snapshot = assistantSoFar;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: snapshot } : m
                  );
                }
                return [...prev, { role: "assistant", content: snapshot }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Aye bruh, somethin went wrong. Try again. 💀" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <ConversationSidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={createConversation}
        onDelete={deleteConversation}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((p) => !p)}
      />

      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="flex items-center justify-center py-5 border-b border-border bg-card">
          <h1 className="text-2xl font-bold font-display">
            <span className="text-gradient-gold">Black</span>
            <span className="text-foreground">GPT</span>
            <span className="text-muted-foreground text-sm font-normal ml-2">v1.0</span>
          </h1>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 max-w-3xl mx-auto w-full">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3">
              <div className="text-5xl">🔥</div>
              <h2 className="text-xl font-bold font-display text-gradient-gold">
                Wassup, what you need?
              </h2>
              <p className="text-muted-foreground text-sm max-w-md">
                Ask me anything and I'll put you on game, no cap. Straight talk, hood certified. 💯
              </p>
            </div>
          )}
          {messages.map((msg, i) => (
            <ChatMessage key={i} role={msg.role} content={msg.content} />
          ))}
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start mb-4">
              <div className="bg-secondary rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse-gold" />
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse-gold [animation-delay:0.2s]" />
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse-gold [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="max-w-3xl mx-auto w-full">
          <ChatInput onSend={send} disabled={isLoading} />
        </div>
      </div>
    </div>
  );
};

export default Index;
