import { useState, useEffect, useRef } from "react";
import { Plus, MessageSquare, Trash2, PanelLeftClose, PanelLeft, LogIn, LogOut, Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Conversation } from "@/hooks/useConversations";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { User } from "@supabase/supabase-js";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";

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
  busy?: boolean;
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
  busy,
}: ConversationSidebarProps) => {
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    panel.inert = !open;
    if (!open) return;
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    if (mobile) panel.querySelector<HTMLButtonElement>("button")?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onToggle();
        toggleRef.current?.focus();
      }
      if (!mobile || event.key !== "Tab") return;
      const controls = Array.from(panel.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus();
      }
    };
    panel.addEventListener("keydown", handleKey);
    return () => panel.removeEventListener("keydown", handleKey);
  }, [open, onToggle]);
  return (
    <>
      {/* Collapsed toggle */}
      <Button variant="outline" size="icon"
        ref={toggleRef}
        onClick={onToggle}
        aria-label="Open chat list"
        aria-expanded={open}
        aria-controls="chat-sidebar"
        tabIndex={open ? -1 : 0}
        className={cn(
          "fixed top-3 left-3 z-40 h-11 w-11 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-opacity duration-200",
          open ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
      >
        <PanelLeft className="h-5 w-5" />
      </Button>

      {/* Overlay for mobile */}
      <div
        onClick={onToggle}
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-40 bg-background/80 md:hidden transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      />

      {/* Sidebar */}
      <div
        id="chat-sidebar"
        ref={panelRef}
        aria-label="Chat history"
        aria-hidden={!open}
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
              className="h-10 w-10 text-muted-foreground hover:text-foreground"
              onClick={onNew}
              aria-label="New chat"
              title="New chat"
              disabled={busy}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-muted-foreground hover:text-foreground"
              onClick={onToggle}
              aria-label="Close chat list"
              title="Close chat list"
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
                className={cn(
                  "w-full group flex items-center gap-1 rounded-lg px-2 py-1 text-left transition-colors duration-150",
                  convo.id === activeId
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
              >
                <Button variant="ghost" className="flex-1 min-w-0 h-auto justify-start gap-2 px-1 py-2 hover:bg-transparent" disabled={busy} onClick={() => onSelect(convo.id)} aria-current={convo.id === activeId ? "true" : undefined} title={convo.title}>
                <MessageSquare className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm truncate">{convo.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {timeAgo(convo.updatedAt)}
                  </p>
                </div>
                </Button>
                <Button variant="ghost" size="icon" disabled={busy}
                  aria-label="Delete chat"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPendingDelete(convo.id);
                  }}
                  title="Delete chat"
                  className="h-9 w-9 shrink-0 opacity-60 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 hover:bg-destructive/20 hover:text-destructive transition-opacity duration-150"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Clear all + Auth section */}
        <div className="border-t border-border pb-[env(safe-area-inset-bottom)]">
          {conversations.length > 0 && (
            <div className="px-3 pt-2">
                <Button variant="ghost" disabled={busy}
                  onClick={() => setPendingDelete("all")}
                  className="w-full justify-start gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Eraser className="h-3.5 w-3.5" />
                  Clear all chats
                </Button>
            </div>
          )}
          <div className="p-3">
            {user ? (
              <Button variant="ghost"
                onClick={onLogout}
                disabled={busy}
                title="Sign out"
                className="w-full justify-start min-w-0 gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                <span className="truncate min-w-0">{user.email}</span>
              </Button>
            ) : (
              <Button variant="ghost"
                onClick={onLogin}
                className="w-full justify-start gap-2 rounded-lg px-3 py-2 text-sm text-primary hover:bg-secondary/50"
              >
                <LogIn className="h-4 w-4" />
                Sign in to sync chats
              </Button>
            )}
          </div>
        </div>
      </div>
      <AlertDialog open={pendingDelete !== null} onOpenChange={(value) => { if (!value) setPendingDelete(null); }}>
        <AlertDialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingDelete === "all" ? "Clear all chats, fam?" : "Delete this chat?"}</AlertDialogTitle>
            <AlertDialogDescription>{pendingDelete === "all" ? "Your entire chat history will be deleted. No undo on this one." : "This conversation will be deleted. No undo on this one."}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Nah</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => {
              if (pendingDelete === "all") onClearAll();
              else if (pendingDelete) onDelete(pendingDelete);
              setPendingDelete(null);
            }}>Yes, delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ConversationSidebar;
