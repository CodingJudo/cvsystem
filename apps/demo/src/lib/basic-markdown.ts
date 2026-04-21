/**
 * Minimal markdown parser for CV text: paragraphs, bold (** or __), unordered lists (- or *).
 * Used by BasicMarkdownText for editor read view and print/preview.
 * Supports multi-line list items (continuation lines without - or * belong to the previous item).
 * Supports mixed blocks: paragraph and list can appear in either order within one block.
 */

export type Inline =
  | { t: 'text'; v: string }
  | { t: 'bold'; v: string };

export type Block =
  | { type: 'paragraph'; lines: Inline[][] }
  | { type: 'list'; items: Inline[][] };

const LIST_PREFIX = /^\s*[-*]\s+/;

/** Splits a line into text and bold segments (non-greedy). */
function parseInline(line: string): Inline[] {
  const parts: Inline[] = [];
  const re = /\*\*(.+?)\*\*|__(.+?)__/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    if (m.index > lastIndex) {
      parts.push({ t: 'text', v: line.slice(lastIndex, m.index) });
    }
    const boldText = m[1] ?? m[2] ?? '';
    parts.push({ t: 'bold', v: boldText });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < line.length) {
    parts.push({ t: 'text', v: line.slice(lastIndex) });
  }
  return parts.length > 0 ? parts : [{ t: 'text', v: line }];
}

function isListItem(line: string): boolean {
  return LIST_PREFIX.test(line);
}

function stripListPrefix(line: string): string {
  return line.replace(LIST_PREFIX, '').trim();
}

/**
 * Parses a string into blocks (paragraphs and lists).
 * Double newlines separate blocks. Within a block:
 * - Lines starting with "- " or "* " start a new list item; following lines without that prefix
 *   are continuations of the current list item.
 * - Leading non-list lines form a paragraph; then a run of list lines (with continuations) forms a list.
 * - Order is preserved: paragraph (if any) then list (if any) for that block.
 *
 * Single newlines within a paragraph are collapsed to a space so that pasted or
 * word-wrapped text (e.g. "Norden,\ninklusive") flows as one line. Only double
 * newlines create paragraph breaks; lists still support multi-line items.
 *
 * Bold (or text ending with :) can be followed by a list on the same line with no
 * newline, e.g. "**Title:** - Item 1 - Item 2" or "**Title:**- Item 1".
 */
/** True if s looks like a heading/label that can be followed by a list on the same line. */
function canBeFollowedByListOnSameLine(s: string): boolean {
  const t = s.trimEnd();
  return /:\s*$/.test(t) || /\*\*\s*$/.test(t) || /__\s*$/.test(t);
}

/** Find list start in a line: " - " or ":**-" or ":-". Returns [labelEndIndex, listStartIndex] or null. */
function findListOnSameLine(line: string): [number, number] | null {
  const spaceDash = line.indexOf(' - ');
  if (spaceDash !== -1 && canBeFollowedByListOnSameLine(line.slice(0, spaceDash))) {
    return [spaceDash, spaceDash + 3];
  }
  const dash = line.indexOf('- ');
  if (dash > 0 && canBeFollowedByListOnSameLine(line.slice(0, dash))) {
    return [dash, dash + 2];
  }
  return null;
}

export function parseBasicMarkdown(text: string): Block[] {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }

  const blocks: Block[] = [];
  const rawBlocks = trimmed.split(/\n\n+/);

  for (const raw of rawBlocks) {
    const lines = raw.split('\n').map((l) => l.trimEnd());
    if (lines.length === 0) continue;

    const paragraphLines: string[] = [];
    const listItems: string[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      if (isListItem(line)) {
        listItems.push(stripListPrefix(line));
        i++;
        while (i < lines.length && !isListItem(lines[i])) {
          listItems[listItems.length - 1] += ' ' + lines[i].trim();
          i++;
        }
      } else {
        paragraphLines.push(line);
        i++;
      }
    }

    if (paragraphLines.length > 0) {
      // If the last paragraph line is a single line that looks like "**Title:** - Item 1 - Item 2"
      // or "**Title:**- Item 1", split so we emit paragraph (title) + list (items) without a newline.
      let merged = paragraphLines.join(' ').trim();
      let extraListItems: string[] = [];
      if (paragraphLines.length === 1 && listItems.length === 0) {
        const found = findListOnSameLine(merged);
        if (found) {
          const [labelEnd, listStart] = found;
          const before = merged.slice(0, labelEnd).trim();
          const after = merged.slice(listStart);
          const rest = after.split(' - ').map((s) => s.trim()).filter(Boolean);
          merged = before;
          extraListItems = rest;
        }
      }
      blocks.push({
        type: 'paragraph',
        lines: [parseInline(merged)],
      });
      if (extraListItems.length > 0) {
        blocks.push({
          type: 'list',
          items: extraListItems.map((item) => parseInline(item)),
        });
      }
    }
    if (listItems.length > 0) {
      blocks.push({
        type: 'list',
        items: listItems.map((item) => parseInline(item)),
      });
    }
  }

  return blocks;
}
