import { useState } from "react";
import { Plus, MessageSquare, Trash2, PanelLeftClose, PanelLeft, LogIn, LogOut, Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Conversation } from "@/hooks/useConversations";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { User } from "@supabase/supabase-js";

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  open: boolean;
  onToggle: () => void;
  user?: User | null;
  onLogin?: () => void;
  onLogout?: () => void;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const ConversationSidebar = ({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onClearAll,
  open,
  onToggle,
  user,
  onLogin,
  onLogout,
}: ConversationSidebarProps) => {
  const [confirmClear, setConfirmClear] = useState(false);
  return (
    <>
      {/* Collapsed toggle */}
      <button
        onClick={onToggle}
        aria-label="Open chat list"
        className={cn(
          "fixed top-4 left-4 z-50 p-2 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-opacity duration-200",
          open ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
      >
        <PanelLeft className="h-5 w-5" />
      </button>

      {/* Overlay for mobile */}
      <div
        onClick={onToggle}
        aria-hidden={!open}
        className={cn(
          "fixed inset-0 z-40 bg-black/60 md:hidden transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      />

      {/* Sidebar */}
      <div
        className={cn(
          "h-[100dvh] w-64 flex flex-col bg-card border-r border-border shrink-0 z-50 md:z-auto",
          "fixed md:relative will-change-transform",
          "transition-[transform,margin-left] duration-300 ease-out",
          open ? "translate-x-0 md:ml-0" : "-translate-x-full md:ml-[-16rem]"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h2 className="text-sm font-semibold font-display text-gradient-gold truncate">
            Chats
          </h2>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={onNew}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={onToggle}
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Conversation list */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-2 space-y-1">
            {conversations.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">
                No chats yet, fam
              </p>
            )}
            {conversations.map((convo) => (
              <div
                key={convo.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(convo.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(convo.id);
                  }
                }}
                className={cn(
                  "w-full group flex items-start gap-2 rounded-lg px-3 py-2.5 text-left cursor-pointer transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                  convo.id === activeId
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
              >
                <MessageSquare className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{convo.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {timeAgo(convo.updatedAt)}
                  </p>
                </div>
                <button
                  aria-label="Delete chat"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(convo.id);
                  }}
                  className="p-1 rounded opacity-60 md:opacity-0 md:group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive transition-opacity duration-150"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Clear all + Auth section */}
        <div className="border-t border-border">
          {conversations.length > 0 && (
            <div className="px-3 pt-2">
              {confirmClear ? (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-destructive">Delete all chats?</span>
                  <button
                    onClick={() => { onClearAll(); setConfirmClear(false); }}
                    className="text-destructive font-semibold hover:underline"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Nah
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <Eraser className="h-3.5 w-3.5" />
                  Clear all chats
                </button>
              )}
            </div>
          )}
          <div className="p-3">
            {user ? (
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="truncate">{user.email}</span>
              </button>
            ) : (
              <button
                onClick={onLogin}
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-primary hover:bg-secondary/50 transition-colors"
              >
                <LogIn className="h-4 w-4" />
                Sign in to sync chats
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ConversationSidebar;
