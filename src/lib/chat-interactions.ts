import type { Msg } from "@/hooks/useConversations";

export function regenerationHistory(messages: Msg[]): Msg[] | null {
  const lastUser = messages.map((message) => message.role).lastIndexOf("user");
  return lastUser < 0 ? null : messages.slice(0, lastUser + 1);
}

export function shouldSubmitOnEnter(key: string, shift: boolean, composing: boolean, touchDevice: boolean): boolean {
  return key === "Enter" && !shift && !composing && !touchDevice;
}