import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { useCallback, useState, useEffect, useRef } from "react";
import { Phone, PhoneOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

const VoiceAgentInner = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [connecting, setConnecting] = useState(false);
  const startedRef = useRef(false);
  const wasConnectedRef = useRef(false);

  const conversation = useConversation({
    onConnect: () => {
      wasConnectedRef.current = true;
      setConnecting(false);
    },
    onDisconnect: (details) => {
      console.info("Voice agent disconnected:", details);
      setConnecting(false);
      startedRef.current = false;
      wasConnectedRef.current = false;
    },
    onError: (error) => {
      console.error("Voice agent error:", error);
      setConnecting(false);
      startedRef.current = false;
      toast({
        variant: "destructive",
        title: "Voice agent error",
        description: "Couldn't connect. Try again.",
      });
    },
  });

  const isConnected = conversation.status === "connected";

  const start = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;
    try {
      setConnecting(true);
      const permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      permissionStream.getTracks().forEach((track) => track.stop());

      const { data, error } = await supabase.functions.invoke<{ token: string }>(
        "elevenlabs-conversation-token",
        { method: "POST" }
      );

      if (error || !data?.token) {
        throw new Error(error?.message || "No voice session token returned");
      }

      conversation.startSession({
        conversationToken: data.token,
        connectionType: "webrtc",
        useWakeLock: false,
      });
    } catch (err) {
      console.error("Voice agent start failed:", err);
      setConnecting(false);
      startedRef.current = false;
      toast({
        variant: "destructive",
        title: "Voice agent error",
        description:
          err instanceof DOMException && err.name === "NotAllowedError"
            ? "Enable microphone permissions to use voice chat."
            : "Couldn't start the voice session. Try again.",
      });
    }
  }, [conversation]);

  const stop = useCallback(async () => {
    wasConnectedRef.current = false;
    startedRef.current = false;
    try {
      await conversation.endSession();
    } catch (e) {
      // ignore
    }
    onClose();
  }, [conversation, onClose]);

  useEffect(() => {
    if (open && !startedRef.current) {
      start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-md">
      <div className="flex flex-col items-center gap-6 p-8 rounded-2xl bg-card border border-border max-w-sm w-[90%]">
        <div className="text-center">
          <h2 className="text-2xl font-bold font-display text-gradient-gold mb-1">
            Voice Mode
          </h2>
          <p className="text-sm text-muted-foreground">
            {connecting && "Connecting..."}
            {isConnected && (conversation.isSpeaking ? "BlackGPT speakin' 🔊" : "Listenin'... 🎙️")}
            {!connecting && !isConnected && "Tap to start"}
          </p>
        </div>

        <div className="relative h-32 w-32 flex items-center justify-center">
          <div
            className={`absolute inset-0 rounded-full bg-primary/20 ${
              isConnected ? (conversation.isSpeaking ? "animate-ping" : "animate-pulse") : ""
            }`}
          />
          <div className="relative h-24 w-24 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center gold-glow">
            {connecting ? (
              <Loader2 className="h-10 w-10 text-primary-foreground animate-spin" />
            ) : (
              <Phone className="h-10 w-10 text-primary-foreground" />
            )}
          </div>
        </div>

        <div className="flex gap-3 w-full">
          <Button
            variant="outline"
            onClick={() => {
              if (isConnected || connecting) stop();
              else onClose();
            }}
            className="flex-1"
          >
            <PhoneOff className="h-4 w-4 mr-2" />
            {isConnected || connecting ? "End call" : "Close"}
          </Button>
        </div>
      </div>
    </div>
  );
};

const VoiceAgent = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        className="rounded-xl h-11 w-11 shrink-0 gold-glow"
        title="Talk to BlackGPT"
      >
        <Phone className="h-5 w-5" />
      </Button>

      <ConversationProvider>
        <VoiceAgentInner open={open} onClose={() => setOpen(false)} />
      </ConversationProvider>
    </>
  );
};

export default VoiceAgent;
