import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState, useCallback } from "react";
import { Copy, Check, RefreshCw } from "lucide-react";
import type { MsgContent } from "@/hooks/useConversations";

function CopyCodeBlock({ children, className }: { children: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [children]);

  const lang = className?.replace("language-", "") || "";

  return (
    <div className="relative group my-2">
      {lang && (
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-3 pt-2 pb-0 bg-background/50 rounded-t-lg border-b border-border/30">
          {lang}
        </div>
      )}
      <pre className={cn("bg-background/50 rounded-lg p-3 overflow-x-auto", lang && "rounded-t-none")}>
        <code className={className}>{children}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Copy code"
      >
        {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
      </button>
    </div>
  );
}

interface ChatMessageProps {
  role: "user" | "assistant";
  content: MsgContent;
  onRegenerate?: () => void;
  isLast?: boolean;
}

function extractText(content: MsgContent): string {
  if (typeof content === "string") return content;
  return content
    .filter((p) => p.type === "text")
    .map((p) => (p as { type: "text"; text: string }).text)
    .join("\n");
}

function extractImages(content: MsgContent): string[] {
  if (typeof content === "string") return [];
  return content
    .filter((p) => p.type === "image_url")
    .map((p) => (p as { type: "image_url"; image_url: { url: string } }).image_url.url);
}

const ChatMessage = ({ role, content, onRegenerate, isLast }: ChatMessageProps) => {
  const isUser = role === "user";
  const text = extractText(content);
  const images = extractImages(content);
  const [copied, setCopied] = useState(false);

  const handleCopyText = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <div className={cn("flex w-full mb-4 group/msg", isUser ? "justify-end" : "justify-start")}>
      <div className="flex flex-col max-w-[80%]">
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-secondary text-secondary-foreground rounded-bl-sm"
          )}
        >
          {/* User-attached images */}
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {images.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt="shared"
                  className="max-w-[200px] max-h-[200px] rounded-lg object-cover"
                />
              ))}
            </div>
          )}

          {/* Text content */}
          {text && (
            isUser ? (
              <p className="whitespace-pre-wrap">{text}</p>
            ) : (
              <div className="prose prose-sm prose-invert max-w-none [&_p]:mb-2 [&_p:last-child]:mb-0 [&_pre]:bg-background/50 [&_pre]:rounded-lg [&_pre]:p-3 [&_code]:text-primary [&_a]:text-primary [&_a]:underline">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ className, children, ...props }) {
                      const isBlock = className?.startsWith("language-") || String(children).includes("\n");
                      if (isBlock) {
                        return <CopyCodeBlock className={className}>{String(children).replace(/\n$/, "")}</CopyCodeBlock>;
                      }
                      return <code className={className} {...props}>{children}</code>;
                    },
                    pre({ children }) {
                      return <>{children}</>;
                    },
                  }}
                >
                  {text}
                </ReactMarkdown>
              </div>
            )
          )}
        </div>

        {/* Action buttons */}
        {text && (
          <div className={cn(
            "flex gap-1 mt-1 opacity-0 group-hover/msg:opacity-100 transition-opacity",
            isUser ? "justify-end" : "justify-start"
          )}>
            <button
              onClick={handleCopyText}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              aria-label="Copy message"
              title="Copy text"
            >
              {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
            </button>
            {!isUser && isLast && onRegenerate && (
              <button
                onClick={onRegenerate}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                aria-label="Regenerate response"
                title="Regenerate"
              >
                <RefreshCw size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
