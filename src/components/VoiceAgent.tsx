import { useConversation } from "@elevenlabs/react";
import { useCallback, useState, useEffect } from "react";
import { Phone, PhoneOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

const AGENT_ID = "agent_2001kqmrfq7af29t42kapv2z0ah2";

const VoiceAgent = () => {
  const [open, setOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const conversation = useConversation({
    onConnect: () => setConnecting(false),
    onDisconnect: () => {
      setConnecting(false);
      setOpen(false);
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
      await conversation.startSession({
        agentId: AGENT_ID,
        connectionType: "webrtc",
      });
    } catch (err) {
      console.error(err);
      setConnecting(false);
      toast({
        variant: "destructive",
        title: "Mic access denied",
        description: "Enable microphone permissions to use voice chat.",
      });
    }
  }, [conversation]);

  const stop = useCallback(async () => {
    await conversation.endSession();
    setOpen(false);
  }, [conversation]);

  // Auto-start when modal opens
  useEffect(() => {
    if (open && !isConnected && !connecting) {
      start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <>
      {/* Floating voice button */}
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-30 h-14 w-14 rounded-full gold-glow shadow-lg"
        title="Talk to BlackGPT"
      >
        <Phone className="h-6 w-6" />
      </Button>

      {/* Modal */}
      {open && (
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

            {/* Pulsing orb */}
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
                  else setOpen(false);
                }}
                className="flex-1"
              >
                <PhoneOff className="h-4 w-4 mr-2" />
                {isConnected || connecting ? "End call" : "Close"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VoiceAgent;
