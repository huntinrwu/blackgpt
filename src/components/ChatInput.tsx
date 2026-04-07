import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Paperclip, FileText, X, Camera, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import WebcamCapture from "@/components/WebcamCapture";
import ImageLightbox from "@/components/ImageLightbox";
import type { MsgContent } from "@/hooks/useConversations";

interface ChatInputProps {
  onSend: (content: MsgContent, files?: File[]) => void;
  disabled?: boolean;
  onFileDrop?: (processor: (files: FileList) => Promise<void>) => void;
}

const MAX_IMAGE_SIZE = 4 * 1024 * 1024; // 4MB
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ACCEPTED_FILE_TYPES = "image/*,.pdf,.txt,.md,.csv,.doc,.docx";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

interface AttachedFile {
  name: string;
  type: string;
  preview?: string; // base64 for images
  textContent?: string; // extracted text for docs
  file: File;
}

const ChatInput = ({ onSend, disabled, onFileDrop }: ChatInputProps) => {
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [webcamOpen, setWebcamOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleTranscript = useCallback((text: string) => {
    setInput((prev) => prev + (prev && !prev.endsWith(" ") ? " " : "") + text);
  }, []);

  const { isListening, interimText, isSupported: micSupported, toggle: toggleMic } =
    useSpeechRecognition(handleTranscript);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  const handleSubmit = () => {
    const text = input.trim();
    const images = attachments.filter((a) => a.type.startsWith("image/"));
    const docs = attachments.filter((a) => !a.type.startsWith("image/"));

    if ((!text && attachments.length === 0) || disabled) return;

    // Build text with doc contents appended
    let fullText = text;
    for (const doc of docs) {
      if (doc.textContent) {
        fullText += `\n\n📎 **${doc.name}:**\n${doc.textContent}`;
      }
    }

    if (images.length > 0) {
      const parts: MsgContent = [];
      if (fullText) parts.push({ type: "text", text: fullText });
      images.forEach((img) => {
        if (img.preview) {
          parts.push({ type: "image_url", image_url: { url: img.preview } });
        }
      });
      onSend(parts);
    } else {
      onSend(fullText);
    }

    setInput("");
    setAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const processFiles = async (files: FileList) => {
    for (const file of Array.from(files)) {
      if (file.type.startsWith("image/")) {
        if (file.size > MAX_IMAGE_SIZE) {
          alert("Image too large (max 4MB)");
          continue;
        }
        const base64 = await fileToBase64(file);
        setAttachments((prev) => [...prev, { name: file.name, type: file.type, preview: base64, file }]);
      } else {
        if (file.size > MAX_FILE_SIZE) {
          alert("File too large (max 20MB)");
          continue;
        }
        let textContent = "";
        if (file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".md") || file.name.endsWith(".csv")) {
          textContent = await readTextFile(file);
        } else if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
          textContent = `[PDF file: ${file.name} — PDF text extraction happens server-side. File attached for context.]`;
        } else {
          textContent = `[Document: ${file.name} — Content attached for context.]`;
        }
        setAttachments((prev) => [...prev, { name: file.name, type: file.type || "application/octet-stream", textContent, file }]);
      }
    }
  };

  // Expose processFiles for external drag-and-drop
  useEffect(() => {
    onFileDrop?.((files: FileList) => processFiles(files));
  }, [onFileDrop]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    await processFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    await processFiles(files);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="border-t border-border bg-card">
      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="flex gap-2 px-4 pt-3 overflow-x-auto">
          {attachments.map((att, i) => (
            <div key={i} className="relative shrink-0 rounded-lg overflow-hidden border border-border">
              {att.preview ? (
                <div className="w-16 h-16">
                  <img src={att.preview} alt="upload" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-auto h-10 px-3 flex items-center gap-1.5 bg-muted/50">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-xs text-foreground truncate max-w-[100px]">{att.name}</span>
                </div>
              )}
              <button
                onClick={() => removeAttachment(i)}
                className="absolute top-0 right-0 bg-background/80 rounded-bl-lg p-0.5"
              >
                <X className="w-3 h-3 text-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 p-4">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_FILE_TYPES}
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Hidden camera input */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleCameraCapture}
        />

        {/* Upload button */}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl h-11 w-11 shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          type="button"
          title="Upload file or image"
        >
          <Paperclip className="h-5 w-5 text-muted-foreground" />
        </Button>

        {/* Camera button */}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl h-11 w-11 shrink-0"
          onClick={() => isMobile ? cameraInputRef.current?.click() : setWebcamOpen(true)}
          disabled={disabled}
          type="button"
          title="Take a photo"
        >
          <Camera className="h-5 w-5 text-muted-foreground" />
        </Button>

        <WebcamCapture
          open={webcamOpen}
          onClose={() => setWebcamOpen(false)}
          onCapture={async (file) => {
            const fl = new DataTransfer();
            fl.items.add(file);
            await processFiles(fl.files);
          }}
        />

        <textarea
          ref={textareaRef}
          value={input + (interimText ? (input ? " " : "") + interimText : "")}
          onChange={(e) => {
            // Strip interim text portion when user types
            setInput(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? "Listening... 🎙️" : "Say somethin... or drop a file 📎"}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none bg-secondary text-foreground rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
        />

        {/* Mic button */}
        {micSupported && (
          <Button
            variant="ghost"
            size="icon"
            className={`rounded-xl h-11 w-11 shrink-0 ${isListening ? "text-red-500 animate-pulse" : ""}`}
            onClick={toggleMic}
            disabled={disabled}
            type="button"
            title={isListening ? "Stop listening" : "Voice input"}
          >
            {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5 text-muted-foreground" />}
          </Button>
        )}

        <Button
          onClick={handleSubmit}
          disabled={(!input.trim() && attachments.length === 0) || disabled}
          size="icon"
          className="rounded-xl h-11 w-11 shrink-0 gold-glow"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ChatInput;
