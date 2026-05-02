import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import ConversationSidebar from "@/components/ConversationSidebar";
import { useConversations, Msg, MsgContent } from "@/hooks/useConversations";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { LogIn, LogOut, User, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import VoiceCall from "@/components/VoiceCall";

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
    setTitle,
    persistMessages,
    isCloud,
    clearAll,
  } = useConversations();

  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileProcessorRef = useRef<((files: FileList) => Promise<void>) | null>(null);
  const dragCounterRef = useRef(0);

  const handleFileDrop = useCallback((processor: (files: FileList) => Promise<void>) => {
    fileProcessorRef.current = processor;
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0 && fileProcessorRef.current) {
      await fileProcessorRef.current(e.dataTransfer.files);
    }
  }, []);

  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [activeId, isMobile]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const send = async (input: MsgContent) => {
    const convId = await ensureConversation();
    const userMsg: Msg = { role: "user", content: input };
    const allMessages = [...messages, userMsg];
    const isFirstMessage = messages.length === 0;
    setMessages(allMessages, convId);
    setIsLoading(true);

    let assistantSoFar = "";
    const headers = await getAuthHeaders();

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers,
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
              }, convId);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Persist final messages to cloud
      const finalMessages = [
        ...allMessages,
        ...(assistantSoFar ? [{ role: "assistant" as const, content: assistantSoFar }] : []),
      ];
      await persistMessages(convId, finalMessages);
    } catch (e) {
      console.error(e);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Aye bruh, somethin went wrong. Try again. 💀" },
      ], convId);
    } finally {
      setIsLoading(false);
    }

    // Generate a creative hood title after the first exchange
    if (isFirstMessage) {
      try {
        const titleHeaders = await getAuthHeaders();
        const titleResp = await fetch(CHAT_URL, {
          method: "POST",
          headers: titleHeaders,
          body: JSON.stringify({ messages: allMessages, action: "generate_title" }),
        });
        if (titleResp.ok) {
          const { title } = await titleResp.json();
          if (title) setTitle(convId, title);
        }
      } catch {
        // fallback title already set
      }
    }
  };

  const handleRegenerate = async () => {
    // Remove last assistant message and resend the last user message
    const lastUserIdx = [...messages].reverse().findIndex((m) => m.role === "user");
    if (lastUserIdx === -1) return;
    const idx = messages.length - 1 - lastUserIdx;
    const userMsg = messages[idx];
    // Remove everything after (and including) the last assistant response
    const trimmed = messages.slice(0, idx);
    setMessages(trimmed);
    // Re-send
    await send(userMsg.content);
  };

  const handleNewChat = async () => {
    await createConversation();
  };

  return (
    <div className="flex h-screen bg-background">
      <ConversationSidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={handleNewChat}
        onDelete={deleteConversation}
        onClearAll={clearAll}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((p) => !p)}
        user={user}
        onLogin={() => navigate("/auth")}
        onLogout={signOut}
      />

      <div
        className="flex flex-col flex-1 min-w-0 relative"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-sm border-2 border-dashed border-primary rounded-lg m-2 pointer-events-none">
            <div className="text-center">
              <p className="text-2xl mb-1">📎</p>
              <p className="text-lg font-semibold text-primary">Drop files here</p>
              <p className="text-sm text-muted-foreground">Images, PDFs, docs — we got you</p>
            </div>
          </div>
        )}
        {/* Header */}
        <header className="flex items-center justify-between py-5 px-4 border-b border-border bg-card">
          <div className="flex-1" />
          <h1 className="text-2xl font-bold font-display">
            <span className="text-gradient-gold">Black</span>
            <span className="text-foreground">GPT</span>
            <span className="text-muted-foreground text-sm font-normal ml-2">v1.0</span>
          </h1>
          <div className="flex-1 flex justify-end">
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground hidden sm:inline truncate max-w-[120px]">
                  {user.email}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={signOut}
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-primary gap-1.5"
                onClick={() => navigate("/auth")}
              >
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Sign In</span>
              </Button>
            )}
          </div>
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
              {!user && (
                <button
                  onClick={() => navigate("/auth")}
                  className="mt-2 text-xs text-primary hover:underline"
                >
                  Sign in to sync chats across devices 🔄
                </button>
              )}
            </div>
          )}
          {messages.map((msg, i) => (
            <ChatMessage
              key={i}
              role={msg.role}
              content={msg.content}
              isLast={i === messages.length - 1}
              onRegenerate={msg.role === "assistant" ? () => handleRegenerate() : undefined}
            />
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
          <ChatInput onSend={send} disabled={isLoading} onFileDrop={handleFileDrop} />
        </div>
      </div>
    </div>
  );
};

export default Index;
