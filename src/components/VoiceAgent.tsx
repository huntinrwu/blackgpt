import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { useCallback, useState, useEffect } from "react";
import { Phone, PhoneOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

const VoiceAgentInner = ({ onClose }: { onClose: () => void }) => {
  const [connecting, setConnecting] = useState(false);

  const conversation = useConversation({
    onConnect: () => setConnecting(false),
    onDisconnect: () => {
      setConnecting(false);
      onClose();
    },
    onError: (error) => {
      console.error("Voice agent error:", error);
      setConnecting(false);
      toast({
        variant: "destructive",
        title: "Voice agent error",
        description: "Couldn't connect. Try again.",
      });
    },
  });

  const isConnected = conversation.status === "connected";

  const start = useCallback(async () => {
    try {
      setConnecting(true);
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const { data, error } = await supabase.functions.invoke<{ signedUrl: string }>(
        "elevenlabs-signed-url",
        { method: "POST" }
      );

      if (error || !data?.signedUrl) {
        throw new Error(error?.message || "No voice session URL returned");
      }

      conversation.startSession({
        signedUrl: data.signedUrl,
        connectionType: "websocket",
      });
    } catch (err) {
      console.error("Voice agent start failed:", err);
      setConnecting(false);
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
    await conversation.endSession();
    onClose();
  }, [conversation, onClose]);

  useEffect(() => {
    if (!isConnected && !connecting) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-30 h-14 w-14 rounded-full gold-glow shadow-lg"
        title="Talk to BlackGPT"
      >
        <Phone className="h-6 w-6" />
      </Button>

      {open && (
        <ConversationProvider>
          <VoiceAgentInner onClose={() => setOpen(false)} />
        </ConversationProvider>
      )}
    </>
  );
};

export default VoiceAgent;
