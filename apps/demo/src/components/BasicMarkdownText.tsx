'use client';

/**
 * Renders a string that may contain basic markdown (bold, unordered lists).
 * Used in editor read views and in print/preview. Preserves paragraphs (double newline)
 * and single newlines within paragraphs; supports **bold** and - / * lists.
 */

import { Fragment } from 'react';
import { parseBasicMarkdown, type Block, type Inline } from '@/lib/basic-markdown';

function renderInline(inlines: Inline[]): React.ReactNode {
  return inlines.map((part, i) =>
    part.t === 'bold' ? (
      <strong key={i}>{part.v}</strong>
    ) : (
      <Fragment key={i}>{part.v}</Fragment>
    ),
  );
}

export interface BasicMarkdownTextProps {
  text: string;
  /** Applied to paragraphs and to the list container (ul) for consistent styling */
  className: string;
}

export function BasicMarkdownText({ text, className }: BasicMarkdownTextProps) {
  const blocks = parseBasicMarkdown(text);

  if (blocks.length === 0) {
    if (!text.trim()) {
      return null;
    }
    return <p className={className}>{text}</p>;
  }

  return (
    <>
      {blocks.map((block, i) =>
        block.type === 'paragraph' ? (
          <p key={i} className={className}>
            {block.lines.map((line, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {renderInline(line)}
              </Fragment>
            ))}
          </p>
        ) : (
          <ul key={i} className={className} style={{ listStyle: 'disc', paddingLeft: '1.5em', margin: '0.5em 0' }}>
            {block.items.map((item, j) => (
              <li key={j}>{renderInline(item)}</li>
            ))}
          </ul>
        ),
      )}
    </>
  );
}
