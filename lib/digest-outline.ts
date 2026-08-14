/**
 * The section/article outline of a digest, for the in-page index.
 *
 * A digest runs ~12 stories across ~6 sections and about nine minutes; the
 * sticky aside described the issue but offered no way to move inside it. This
 * turns the headings the reader is already scrolling past into a column guide.
 *
 * Pure on purpose — no React, no fs — so both the server-rendered heading ids
 * and the client-rendered index derive from one function and cannot drift.
 */

export type OutlineEntry = {
  /** 2 = section (`##`), 3 = story (`###`). */
  level: 2 | 3;
  text: string;
  id: string;
};

const HEADING_RE = /^(#{2,3})[ \t]+(.+?)[ \t]*$/gm;

/** Inline markdown never reaches the reader, so it must not reach the id either. */
function stripInline(text: string): string {
  return text
    .replace(/\*\*([\s\S]+?)\*\*/g, "$1")
    .replace(/\*([^*\n]+?)\*/g, "$1")
    .replace(/`([^`\n]+?)`/g, "$1")
    .replace(/\[([^\]]+?)\]\([^)]+?\)/g, "$1")
    .trim();
}

/**
 * A heading's anchor id, derived from its text alone.
 *
 * Text — not position — because the two callers cannot agree on position: the
 * outline is parsed from the markdown source, while the heading id is assigned
 * inside a react-markdown renderer that receives no index. Deriving from text
 * keeps them consistent without depending on render order. Headings repeat
 * across issues but not within one (checked over 250 digests: zero collisions),
 * and both sections and stories carry their own numbering.
 *
 * CJK is kept verbatim. It is valid in an id and in a URL fragment, and
 * transliterating it would turn every Chinese heading into the same empty slug.
 */
export function headingId(text: string): string {
  const slug = stripInline(text)
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  // A heading of pure punctuation would otherwise collapse to `h-`, which every
  // such heading would share.
  return slug ? `h-${slug}` : "";
}

export function outlineOf(markdown: string): OutlineEntry[] {
  HEADING_RE.lastIndex = 0;
  const entries: OutlineEntry[] = [];
  for (const match of markdown.matchAll(HEADING_RE)) {
    const text = stripInline(match[2]);
    const id = headingId(text);
    if (!id) continue;
    entries.push({ level: match[1].length === 2 ? 2 : 3, text, id });
  }
  return entries;
}
