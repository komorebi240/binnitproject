export type TermsBlock =
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[] };

/**
 * Turns the plain text the server sends into blocks to draw: a line starting with "## " is a section heading, a run of
 * lines starting with "- " is one list, any other non-empty line is a paragraph. (A tiny format on purpose: the terms are
 * text, and a markdown library would be a dependency for four rules.)
 */
export function parseTerms(content: string): TermsBlock[] {
  const blocks: TermsBlock[] = [];
  for (const rawLine of content.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("## ")) {
      blocks.push({ kind: "heading", text: line.slice(3).trim() });
    } else if (line.startsWith("- ")) {
      const last = blocks[blocks.length - 1];
      const item = line.slice(2).trim();
      if (last?.kind === "list") last.items.push(item);
      else blocks.push({ kind: "list", items: [item] });
    } else {
      blocks.push({ kind: "paragraph", text: line });
    }
  }
  return blocks;
}
