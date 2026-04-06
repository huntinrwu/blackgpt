import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MsgContent } from "@/hooks/useConversations";

interface ChatInputProps {
  onSend: (content: MsgContent, files?: File[]) => void;
  disabled?: boolean;
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

const ChatInput = ({ onSend, disabled }: ChatInputProps) => {
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > MAX_IMAGE_SIZE) {
        alert("Image too large (max 4MB)");
        continue;
      }
      const base64 = await fileToBase64(file);
      setAttachments((prev) => [...prev, { name: file.name, type: file.type, preview: base64, file }]);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDocChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
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

    if (docInputRef.current) docInputRef.current.value = "";
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
        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleImageChange}
        />
        <input
          ref={docInputRef}
          type="file"
          accept=".pdf,.txt,.md,.csv,.doc,.docx"
          multiple
          className="hidden"
          onChange={handleDocChange}
        />

        {/* Image upload button */}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl h-11 w-11 shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          type="button"
          title="Upload image"
        >
          <ImagePlus className="h-5 w-5 text-muted-foreground" />
        </Button>

        {/* Doc upload button */}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl h-11 w-11 shrink-0"
          onClick={() => docInputRef.current?.click()}
          disabled={disabled}
          type="button"
          title="Upload file (.pdf, .txt, .doc)"
        >
          <FileText className="h-5 w-5 text-muted-foreground" />
        </Button>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Say somethin... or drop a file 📎"
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none bg-secondary text-foreground rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
        />
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
