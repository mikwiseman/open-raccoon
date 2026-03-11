import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ContentBlockRenderer, parseContentBlocks } from '../ContentBlockRenderer';

afterEach(() => {
  cleanup();
});

/* ================================================================
 * ContentBlockRenderer component
 * ================================================================ */
describe('ContentBlockRenderer', () => {
  it('renders nothing for empty blocks array', () => {
    const { container } = render(<ContentBlockRenderer blocks={[]} />);
    expect(container.querySelector('.cb-renderer')).not.toBeInTheDocument();
  });

  it('renders a single text block', () => {
    const blocks = [{ type: 'text' as const, text: 'Hello world' }];
    render(<ContentBlockRenderer blocks={blocks} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders multiple blocks', () => {
    const blocks = [
      { type: 'text' as const, text: 'First block' },
      { type: 'text' as const, text: 'Second block' },
    ];
    render(<ContentBlockRenderer blocks={blocks} />);
    expect(screen.getByText('First block')).toBeInTheDocument();
    expect(screen.getByText('Second block')).toBeInTheDocument();
  });

  it('renders an image block', () => {
    const blocks = [{ type: 'image' as const, url: 'https://example.com/img.png' }];
    const { container } = render(<ContentBlockRenderer blocks={blocks} />);
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img?.getAttribute('src')).toBe('https://example.com/img.png');
  });

  it('renders a file block', () => {
    const blocks = [
      { type: 'file' as const, url: 'https://example.com/doc.pdf', name: 'doc.pdf', size: 1024 },
    ];
    render(<ContentBlockRenderer blocks={blocks} />);
    expect(screen.getByText('doc.pdf')).toBeInTheDocument();
  });

  it('renders a table block', () => {
    const blocks = [
      {
        type: 'table' as const,
        headers: ['Name', 'Age'],
        rows: [['Alice', '30']],
      },
    ];
    render(<ContentBlockRenderer blocks={blocks} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('renders unknown block types as JSON', () => {
    const blocks = [{ type: 'unknown_type' as never, data: 'test' }];
    const { container } = render(<ContentBlockRenderer blocks={blocks} />);
    const unknownBlock = container.querySelector('.cb-unknown-block');
    expect(unknownBlock).toBeInTheDocument();
  });
});

/* ================================================================
 * parseContentBlocks
 * ================================================================ */
describe('parseContentBlocks', () => {
  it('returns empty array for null', () => {
    expect(parseContentBlocks(null)).toEqual([]);
  });

  it('returns empty array for undefined', () => {
    expect(parseContentBlocks(undefined)).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(parseContentBlocks('')).toEqual([]);
  });

  it('returns empty array for zero', () => {
    expect(parseContentBlocks(0)).toEqual([]);
  });

  it('returns empty array for false', () => {
    expect(parseContentBlocks(false)).toEqual([]);
  });

  it('parses a plain string as a text block', () => {
    const result = parseContentBlocks('Hello world');
    expect(result).toEqual([{ type: 'text', text: 'Hello world' }]);
  });

  it('parses a JSON string containing an array of blocks', () => {
    const json = JSON.stringify([{ type: 'text', text: 'From JSON' }]);
    const result = parseContentBlocks(json);
    expect(result).toEqual([{ type: 'text', text: 'From JSON' }]);
  });

  it('parses a JSON string containing a single block object', () => {
    const json = JSON.stringify({ type: 'text', text: 'Single block' });
    const result = parseContentBlocks(json);
    expect(result).toEqual([{ type: 'text', text: 'Single block' }]);
  });

  it('treats invalid JSON strings as plain text', () => {
    const result = parseContentBlocks('{not valid json}');
    expect(result).toEqual([{ type: 'text', text: '{not valid json}' }]);
  });

  it('returns an array directly if content is already an array', () => {
    const blocks = [{ type: 'text', text: 'Direct array' }];
    const result = parseContentBlocks(blocks);
    expect(result).toEqual(blocks);
  });

  it('wraps a single block object into an array', () => {
    const block = { type: 'text', text: 'Single object' };
    const result = parseContentBlocks(block);
    expect(result).toEqual([block]);
  });

  it('handles legacy { text: "..." } format', () => {
    const result = parseContentBlocks({ text: 'Legacy format' });
    expect(result).toEqual([{ type: 'text', text: 'Legacy format' }]);
  });

  it('handles legacy { blocks: [...] } wrapper', () => {
    const data = { blocks: [{ type: 'text', text: 'Wrapped' }] };
    const result = parseContentBlocks(data);
    expect(result).toEqual([{ type: 'text', text: 'Wrapped' }]);
  });

  it('returns empty array for object without type, text, or blocks', () => {
    const result = parseContentBlocks({ foo: 'bar' });
    expect(result).toEqual([]);
  });

  it('returns empty array for a number', () => {
    expect(parseContentBlocks(42)).toEqual([]);
  });

  it('parses a JSON string of a non-array/non-type object as plain text', () => {
    const json = JSON.stringify({ foo: 'bar' });
    const result = parseContentBlocks(json);
    // Not an array, no "type" field -> falls through to text
    expect(result).toEqual([{ type: 'text', text: json }]);
  });
});
