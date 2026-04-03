import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { MsgContent } from "@/hooks/useConversations";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: MsgContent;
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

const ChatMessage = ({ role, content }: ChatMessageProps) => {
  const isUser = role === "user";
  const text = extractText(content);
  const images = extractImages(content);

  // Check if assistant response contains base64 images
  const assistantImages: string[] = [];
  if (!isUser && typeof content === "string") {
    // Images will be handled via markdown img tags
  }

  return (
    <div className={cn("flex w-full mb-4", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
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
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
