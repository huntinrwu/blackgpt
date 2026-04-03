import { useState, useRef, useEffect } from "react";
import { Send, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MsgContent } from "@/hooks/useConversations";

interface ChatInputProps {
  onSend: (content: MsgContent) => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const ChatInput = ({ onSend, disabled }: ChatInputProps) => {
  const [input, setInput] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  const handleSubmit = () => {
    const text = input.trim();
    if ((!text && images.length === 0) || disabled) return;

    if (images.length > 0) {
      const parts: MsgContent = [];
      if (text) parts.push({ type: "text", text });
      images.forEach((url) =>
        parts.push({ type: "image_url", image_url: { url } })
      );
      onSend(parts);
    } else {
      onSend(text);
    }

    setInput("");
    setImages([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > MAX_FILE_SIZE) {
        alert("Image too large (max 4MB)");
        continue;
      }
      const base64 = await fileToBase64(file);
      setImages((prev) => [...prev, base64]);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="border-t border-border bg-card">
      {/* Image previews */}
      {images.length > 0 && (
        <div className="flex gap-2 px-4 pt-3 overflow-x-auto">
          {images.map((src, i) => (
            <div key={i} className="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-border">
              <img src={src} alt="upload" className="w-full h-full object-cover" />
              <button
                onClick={() => removeImage(i)}
                className="absolute top-0 right-0 bg-background/80 rounded-bl-lg p-0.5"
              >
                <X className="w-3 h-3 text-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 p-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl h-11 w-11 shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          type="button"
        >
          <ImagePlus className="h-5 w-5 text-muted-foreground" />
        </Button>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Say somethin... or drop an image 📸"
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none bg-secondary text-foreground rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
        />
        <Button
          onClick={handleSubmit}
          disabled={(!input.trim() && images.length === 0) || disabled}
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
