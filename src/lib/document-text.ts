// Client-side document text extraction. Text is extracted in the browser so
// the model reads the real contents without sending large binaries.

export const MAX_DOC_CHARS = 24_000; // stays under the 32KB per-message server limit

export type DocKind = "text" | "pdf" | "docx" | "unsupported";

export function docKind(name: string, mime: string): DocKind {
  const n = name.toLowerCase();
  if (mime.startsWith("text/") || /\.(txt|md|csv|json)$/.test(n)) return "text";
  if (mime === "application/pdf" || n.endsWith(".pdf")) return "pdf";
  if (n.endsWith(".docx")) return "docx";
  return "unsupported";
}

/** Normalizes whitespace and caps length, flagging truncation for the model. */
export function prepareDocText(raw: string, max = MAX_DOC_CHARS): { text: string; truncated: boolean } {
  const clean = raw.replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (clean.length <= max) return { text: clean, truncated: false };
  return { text: clean.slice(0, max), truncated: true };
}

async function extractPdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: string[] = [];
  let total = 0;
  for (let i = 1; i <= doc.numPages && total < MAX_DOC_CHARS; i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    const text = content.items.map((it) => ("str" in it ? it.str : "")).join(" ");
    pages.push(`[Page ${i}]\n${text}`);
    total += text.length;
  }
  return pages.join("\n\n");
}

async function extractDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return value;
}

/** Returns the text block to attach, or an honest note when nothing is readable. */
export async function extractDocumentText(file: File): Promise<string> {
  const kind = docKind(file.name, file.type);
  if (kind === "unsupported") {
    return `[${file.name}: this file type can't be read. Ask the user to save it as PDF, DOCX or TXT.]`;
  }
  try {
    const raw = kind === "text" ? await file.text() : kind === "pdf" ? await extractPdf(file) : await extractDocx(file);
    const { text, truncated } = prepareDocText(raw);
    if (!text) {
      return `[${file.name}: no readable text found (it may be a scanned image). Tell the user you couldn't read it.]`;
    }
    return truncated ? `${text}\n\n[Document truncated — only the first part was included.]` : text;
  } catch {
    return `[${file.name}: the file couldn't be opened. Tell the user it may be damaged or password-protected.]`;
  }
}
