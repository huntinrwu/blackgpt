import { describe, it, expect } from "vitest";
import { docKind, prepareDocText } from "./document-text";

describe("document text", () => {
  it("routes file types", () => {
    expect(docKind("a.pdf", "")).toBe("pdf");
    expect(docKind("a.docx", "")).toBe("docx");
    expect(docKind("a.csv", "")).toBe("text");
    expect(docKind("a.doc", "application/msword")).toBe("unsupported");
  });
  it("caps text and flags truncation", () => {
    expect(prepareDocText("abcdef", 3)).toEqual({ text: "abc", truncated: true });
    expect(prepareDocText("ab", 3)).toEqual({ text: "ab", truncated: false });
  });
});
