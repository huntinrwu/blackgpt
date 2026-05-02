import { useCallback, useEffect, useState } from "react";
import { useConversation } from "@elevenlabs/react";
import { Phone, PhoneOff, Loader2, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VoiceCallProps {
  open: boolean;
  onClose: () => void;
}

const VoiceCall = ({ open, onClose }: VoiceCallProps) => {
  const [isConnecting, setIsConnecting] = useState(false);

  const conversation = useConversation({
    onConnect: () => setIsConnecting(false),
    onDisconnect: () => setIsConnecting(false),
    onError: (err) => {
      console.error("Voice call error:", err);
      toast.error("Voice call failed. Try again.");
      setIsConnecting(false);
    },
  });

  const status = conversation.status;
  const isConnected = status === "connected";
  const isSpeaking = conversation.isSpeaking;

  const start = useCallback(async () => {
    try {
      setIsConnecting(true);
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const { data, error } = await supabase.functions.invoke("elevenlabs-token");
      if (error || !data?.token) throw new Error(error?.message || "No token");

      await conversation.startSession({
        conversationToken: data.token,
        connectionType: "webrtc",
      });
    } catch (e) {
      console.error(e);
      toast.error((e as Error).message || "Couldn't start call. Check mic permissions.");
      setIsConnecting(false);
    }
  }, [conversation]);

  const stop = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  // End session when dialog closes
  useEffect(() => {
    if (!open && isConnected) {
      conversation.endSession();
    }
  }, [open, isConnected, conversation]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { stop(); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            <span className="text-gradient-gold">Voice</span> Mode
          </DialogTitle>
          <DialogDescription>
            Talk to BlackGPT live. Tap the phone to start.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-8 gap-6">
          {/* Pulse orb */}
          <div className="relative flex items-center justify-center w-40 h-40">
            {isConnected && (
              <>
                <div
                  className={`absolute inset-0 rounded-full bg-primary/20 ${isSpeaking ? "animate-ping" : "animate-pulse"}`}
                />
                <div className="absolute inset-4 rounded-full bg-primary/30" />
              </>
            )}
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center gold-glow">
              <Mic className="w-10 h-10 text-primary-foreground" />
            </div>
          </div>

          <p className="text-sm text-muted-foreground h-5">
            {isConnecting && "Connecting..."}
            {isConnected && (isSpeaking ? "BlackGPT speakin'..." : "Listenin'...")}
            {!isConnecting && !isConnected && "Ready when you are"}
          </p>

          {!isConnected ? (
            <Button onClick={start} disabled={isConnecting} size="lg" className="rounded-full h-14 w-14 p-0 gold-glow">
              {isConnecting ? <Loader2 className="h-6 w-6 animate-spin" /> : <Phone className="h-6 w-6" />}
            </Button>
          ) : (
            <Button onClick={stop} variant="destructive" size="lg" className="rounded-full h-14 w-14 p-0">
              <PhoneOff className="h-6 w-6" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VoiceCall;
