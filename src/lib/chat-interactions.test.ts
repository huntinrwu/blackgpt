import { describe, expect, it } from "vitest";
import { regenerationHistory, shouldSubmitOnEnter } from "./chat-interactions";

describe("chat interactions", () => {
  it("regenerates through the last prompt without including the previous response", () => {
    const messages = [
      { role: "user" as const, content: "First prompt" },
      { role: "assistant" as const, content: "First response" },
      { role: "user" as const, content: "Second prompt" },
      { role: "assistant" as const, content: "Replace this" },
    ];
    expect(regenerationHistory(messages)).toEqual(messages.slice(0, 3));
    expect(messages).toHaveLength(4);
  });
  it("does not regenerate without a user prompt", () => {
    expect(regenerationHistory([{ role: "assistant", content: "Hello" }])).toBeNull();
  });
  it("submits Enter on desktop only", () => {
    expect(shouldSubmitOnEnter("Enter", false, false, false)).toBe(true);
  });
  it("keeps Return as a newline on phones and tablets", () => {
    expect(shouldSubmitOnEnter("Enter", false, false, true)).toBe(false);
  });
  it("does not submit Shift Enter or an unfinished keyboard composition", () => {
    expect(shouldSubmitOnEnter("Enter", true, false, false)).toBe(false);
    expect(shouldSubmitOnEnter("Enter", false, true, false)).toBe(false);
  });
});