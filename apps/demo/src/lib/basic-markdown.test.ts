import { describe, it, expect } from 'vitest';
import { parseBasicMarkdown } from './basic-markdown';

describe('parseBasicMarkdown', () => {
  it('returns empty array for empty or whitespace-only input', () => {
    expect(parseBasicMarkdown('')).toEqual([]);
    expect(parseBasicMarkdown('   ')).toEqual([]);
    expect(parseBasicMarkdown('\n\n')).toEqual([]);
  });

  it('parses a single paragraph', () => {
    const blocks = parseBasicMarkdown('Hello world');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('paragraph');
    expect(blocks[0].type === 'paragraph' && blocks[0].lines).toHaveLength(1);
    expect(blocks[0].type === 'paragraph' && blocks[0].lines[0]).toEqual([{ t: 'text', v: 'Hello world' }]);
  });

  it('parses bold (** and __)', () => {
    const blocks = parseBasicMarkdown('Hello **bold** and __also__');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('paragraph');
    const line = blocks[0].type === 'paragraph' ? blocks[0].lines[0] : [];
    expect(line).toEqual([
      { t: 'text', v: 'Hello ' },
      { t: 'bold', v: 'bold' },
      { t: 'text', v: ' and ' },
      { t: 'bold', v: 'also' },
    ]);
  });

  it('splits by double newlines into separate blocks', () => {
    const blocks = parseBasicMarkdown('First para\n\nSecond para');
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe('paragraph');
    expect(blocks[1].type).toBe('paragraph');
    expect(blocks[0].type === 'paragraph' && blocks[0].lines[0]).toEqual([{ t: 'text', v: 'First para' }]);
    expect(blocks[1].type === 'paragraph' && blocks[1].lines[0]).toEqual([{ t: 'text', v: 'Second para' }]);
  });

  it('parses unordered list (- and *)', () => {
    const blocks = parseBasicMarkdown('- item one\n- item two');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('list');
    expect(blocks[0].type === 'list' && blocks[0].items).toHaveLength(2);
    expect(blocks[0].type === 'list' && blocks[0].items[0]).toEqual([{ t: 'text', v: 'item one' }]);
    expect(blocks[0].type === 'list' && blocks[0].items[1]).toEqual([{ t: 'text', v: 'item two' }]);
  });

  it('parses list with * prefix', () => {
    const blocks = parseBasicMarkdown('* first\n* second');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('list');
    expect(blocks[0].type === 'list' && blocks[0].items[0]).toEqual([{ t: 'text', v: 'first' }]);
  });

  it('parses list items with bold', () => {
    const blocks = parseBasicMarkdown('- **important** point');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('list');
    expect(blocks[0].type === 'list' && blocks[0].items[0]).toEqual([
      { t: 'bold', v: 'important' },
      { t: 'text', v: ' point' },
    ]);
  });

  it('parses paragraph followed by list in same block', () => {
    const blocks = parseBasicMarkdown('Some text\n- list item');
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe('paragraph');
    expect(blocks[0].type === 'paragraph' && blocks[0].lines).toHaveLength(1);
    expect(blocks[1].type).toBe('list');
    expect(blocks[1].type === 'list' && blocks[1].items).toHaveLength(1);
  });

  it('parses multi-line list items (continuation lines)', () => {
    const blocks = parseBasicMarkdown('- item one\n  continuation\n- item two');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('list');
    expect(blocks[0].type === 'list' && blocks[0].items).toHaveLength(2);
    const firstItem = blocks[0].type === 'list' ? blocks[0].items[0] : [];
    expect(firstItem).toHaveLength(1);
    expect(firstItem[0].t).toBe('text');
    expect(firstItem[0].t === 'text' && firstItem[0].v).toContain('continuation');
  });

  it('parses bold followed by list on same line with space before dash', () => {
    const blocks = parseBasicMarkdown('**Hans huvudsakliga ansvarsområden var:** - Item 1 - Item 2');
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe('paragraph');
    expect(blocks[0].type === 'paragraph' && blocks[0].lines[0]).toEqual([
      { t: 'bold', v: 'Hans huvudsakliga ansvarsområden var:' },
    ]);
    expect(blocks[1].type).toBe('list');
    expect(blocks[1].type === 'list' && blocks[1].items).toHaveLength(2);
    expect(blocks[1].type === 'list' && blocks[1].items[0]).toEqual([{ t: 'text', v: 'Item 1' }]);
    expect(blocks[1].type === 'list' && blocks[1].items[1]).toEqual([{ t: 'text', v: 'Item 2' }]);
  });

  it('parses bold followed by list on same line with no space before dash', () => {
    const blocks = parseBasicMarkdown('**Title:**- Item 1');
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe('paragraph');
    expect(blocks[0].type === 'paragraph' && blocks[0].lines[0]).toEqual([{ t: 'bold', v: 'Title:' }]);
    expect(blocks[1].type).toBe('list');
    expect(blocks[1].type === 'list' && blocks[1].items).toHaveLength(1);
    expect(blocks[1].type === 'list' && blocks[1].items[0]).toEqual([{ t: 'text', v: 'Item 1' }]);
  });

  it('does not split normal text containing " - "', () => {
    const blocks = parseBasicMarkdown('We have one - the first - and two');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('paragraph');
    expect(blocks[0].type === 'paragraph' && blocks[0].lines[0]).toEqual([
      { t: 'text', v: 'We have one - the first - and two' },
    ]);
  });
});
