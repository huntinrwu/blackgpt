import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, SwitchCamera, X } from "lucide-react";

interface WebcamCaptureProps {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

const WebcamCapture = ({ open, onClose, onCapture }: WebcamCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [error, setError] = useState("");

  const startCamera = useCallback(async (facing: "user" | "environment") => {
    try {
      // Stop existing stream
      stream?.getTracks().forEach((t) => t.stop());
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setStream(s);
      setError("");
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
    } catch {
      setError("Could not access camera. Please allow camera permissions.");
    }
  }, [stream]);

  useEffect(() => {
    if (open) {
      startCamera(facingMode);
    }
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleFlip = () => {
    const next = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
    startCamera(next);
  };

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" });
        onCapture(file);
        handleClose();
      }
    }, "image/jpeg", 0.9);
  };

  const handleClose = () => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden bg-black border-border">
        <DialogTitle className="sr-only">Camera</DialogTitle>
        <canvas ref={canvasRef} className="hidden" />
        {error ? (
          <div className="p-8 text-center text-destructive">{error}</div>
        ) : (
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full aspect-video object-cover"
            />
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
              <Button size="icon" variant="secondary" className="rounded-full h-10 w-10" onClick={handleFlip}>
                <SwitchCamera className="h-5 w-5" />
              </Button>
              <Button size="icon" className="rounded-full h-14 w-14 bg-white hover:bg-white/90" onClick={handleCapture}>
                <Camera className="h-6 w-6 text-black" />
              </Button>
              <Button size="icon" variant="secondary" className="rounded-full h-10 w-10" onClick={handleClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WebcamCapture;
