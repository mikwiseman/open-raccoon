import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import python from 'highlight.js/lib/languages/python';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { CodeBlock, type CodeBlockData } from '../content-blocks/CodeBlock';
import {
  type ContentBlock,
  ContentBlockRenderer,
  parseContentBlocks,
} from '../content-blocks/ContentBlockRenderer';
import { ImageBlock, type ImageBlockData } from '../content-blocks/ImageBlock';
import { TextBlock, type TextBlockData } from '../content-blocks/TextBlock';
import { ThinkingBlock, type ThinkingBlockData } from '../content-blocks/ThinkingBlock';
import { ToolCallBlock, type ToolCallBlockData } from '../content-blocks/ToolCallBlock';
import { ToolResultBlock, type ToolResultBlockData } from '../content-blocks/ToolResultBlock';

beforeAll(() => {
  hljs.registerLanguage('javascript', javascript);
  hljs.registerLanguage('js', javascript);
  hljs.registerLanguage('python', python);
  hljs.registerLanguage('py', python);
});

afterEach(() => {
  cleanup();
});

/* ================================================================ */
/*  TextBlock                                                        */
/* ================================================================ */

describe('TextBlock edge cases', () => {
  it('renders plain text content', () => {
    const block: TextBlockData = { type: 'text', text: 'Simple paragraph of text.' };
    render(<TextBlock block={block} />);
    expect(screen.getByText('Simple paragraph of text.')).toBeInTheDocument();
  });

  it('renders bold markdown', () => {
    const block: TextBlockData = { type: 'text', text: '**bold words** here' };
    const { container } = render(<TextBlock block={block} />);
    const strong = container.querySelector('strong');
    expect(strong).toBeInTheDocument();
    expect(strong?.textContent).toBe('bold words');
  });

  it('renders italic markdown', () => {
    const block: TextBlockData = { type: 'text', text: '*italic words* here' };
    const { container } = render(<TextBlock block={block} />);
    const em = container.querySelector('em');
    expect(em).toBeInTheDocument();
    expect(em?.textContent).toBe('italic words');
  });

  it('renders markdown links with correct href', () => {
    const block: TextBlockData = {
      type: 'text',
      text: 'See [docs](https://docs.example.com/guide)',
    };
    const { container } = render(<TextBlock block={block} />);
    const link = container.querySelector('a');
    expect(link).toBeInTheDocument();
    expect(link?.getAttribute('href')).toBe('https://docs.example.com/guide');
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('renders unordered list items as text with line breaks', () => {
    const block: TextBlockData = {
      type: 'text',
      text: 'Items:\n- First\n- Second\n- Third',
    };
    const { container } = render(<TextBlock block={block} />);
    expect(container.textContent).toContain('First');
    expect(container.textContent).toContain('Second');
    expect(container.textContent).toContain('Third');
    // Line breaks should be converted to <br/>
    const brs = container.querySelectorAll('br');
    expect(brs.length).toBeGreaterThanOrEqual(3);
  });

  it('renders fenced code blocks within text', () => {
    const block: TextBlockData = {
      type: 'text',
      text: 'Run this:\n```python\nprint("hello")\n```',
    };
    const { container } = render(<TextBlock block={block} />);
    const codeFence = container.querySelector('.cb-code-fence');
    expect(codeFence).toBeInTheDocument();
    expect(screen.getByText('python')).toBeInTheDocument();
  });

  it('renders code fence with Copy button', () => {
    const block: TextBlockData = {
      type: 'text',
      text: '```js\nconst x = 1;\n```',
    };
    render(<TextBlock block={block} />);
    expect(screen.getByText('Copy')).toBeInTheDocument();
  });

  it('renders very long text without crashing', () => {
    const longText = 'word '.repeat(2000);
    const block: TextBlockData = { type: 'text', text: longText };
    const { container } = render(<TextBlock block={block} />);
    expect(container.querySelector('.cb-text-block')).toBeInTheDocument();
  });

  it('strips script tags via DOMPurify/escape', () => {
    const block: TextBlockData = {
      type: 'text',
      text: '<script>alert("xss")</script> safe content',
    };
    const { container } = render(<TextBlock block={block} />);
    expect(container.querySelector('script')).not.toBeInTheDocument();
    expect(container.textContent).toContain('safe content');
  });

  it('renders mixed bold, italic, and inline code', () => {
    const block: TextBlockData = {
      type: 'text',
      text: '**bold**, *italic*, `code`',
    };
    const { container } = render(<TextBlock block={block} />);
    expect(container.querySelector('strong')?.textContent).toBe('bold');
    expect(container.querySelector('em')?.textContent).toBe('italic');
    expect(container.querySelector('code')?.textContent).toBe('code');
  });

  it('handles empty text without crashing', () => {
    const block: TextBlockData = { type: 'text', text: '' };
    const { container } = render(<TextBlock block={block} />);
    expect(container.querySelector('.cb-text-block')).toBeInTheDocument();
  });

  it('rejects javascript: protocol URLs as plain text', () => {
    const block: TextBlockData = {
      type: 'text',
      text: '[click](javascript:void(0)) safe',
    };
    const { container } = render(<TextBlock block={block} />);
    expect(container.querySelector('a')).not.toBeInTheDocument();
  });

  it('renders mailto: links correctly', () => {
    const block: TextBlockData = {
      type: 'text',
      text: '[email us](mailto:test@example.com)',
    };
    const { container } = render(<TextBlock block={block} />);
    const link = container.querySelector('a');
    expect(link).toBeInTheDocument();
    expect(link?.getAttribute('href')).toBe('mailto:test@example.com');
  });

  it('renders code fence with "code" label when no language specified', () => {
    const block: TextBlockData = {
      type: 'text',
      text: '```\nplain code\n```',
    };
    const { container } = render(<TextBlock block={block} />);
    const langLabel = container.querySelector('.cb-code-fence-lang');
    expect(langLabel?.textContent).toBe('code');
  });
});

/* ================================================================ */
/*  CodeBlock                                                        */
/* ================================================================ */

describe('CodeBlock edge cases', () => {
  it('renders code with language label', () => {
    const block: CodeBlockData = {
      type: 'code',
      language: 'python',
      code: 'print("hello")',
    };
    render(<CodeBlock block={block} />);
    expect(screen.getByText('python')).toBeInTheDocument();
  });

  it('renders "code" label when language is not specified', () => {
    const block: CodeBlockData = { type: 'code', code: 'some code here' };
    const { container } = render(<CodeBlock block={block} />);
    const langLabel = container.querySelector('.cb-code-block-lang');
    expect(langLabel?.textContent).toBe('code');
  });

  it('renders Copy button', () => {
    const block: CodeBlockData = { type: 'code', code: 'const x = 1;' };
    render(<CodeBlock block={block} />);
    expect(screen.getByText('Copy')).toBeInTheDocument();
  });

  it('renders code with syntax highlighting', () => {
    const block: CodeBlockData = {
      type: 'code',
      language: 'javascript',
      code: 'const x = 1;',
    };
    const { container } = render(<CodeBlock block={block} />);
    const codeEl = container.querySelector('code');
    expect(codeEl).toBeInTheDocument();
  });

  it('renders output section when output is provided', () => {
    const block: CodeBlockData = {
      type: 'code',
      code: 'print("hi")',
      output: 'hi',
    };
    render(<CodeBlock block={block} />);
    expect(screen.getByText('Output')).toBeInTheDocument();
    expect(screen.getByText('hi')).toBeInTheDocument();
  });

  it('does not render output section when output is absent', () => {
    const block: CodeBlockData = { type: 'code', code: 'const x = 1;' };
    render(<CodeBlock block={block} />);
    expect(screen.queryByText('Output')).not.toBeInTheDocument();
  });

  it('handles empty code string without crashing', () => {
    const block: CodeBlockData = { type: 'code', code: '' };
    const { container } = render(<CodeBlock block={block} />);
    expect(container.querySelector('.cb-code-block')).toBeInTheDocument();
  });
});

/* ================================================================ */
/*  ImageBlock                                                       */
/* ================================================================ */

describe('ImageBlock edge cases', () => {
  it('shows loading spinner before image loads', () => {
    const block: ImageBlockData = {
      type: 'image',
      url: 'https://example.com/image.png',
    };
    const { container } = render(<ImageBlock block={block} />);
    expect(container.querySelector('.cb-image-loading')).toBeInTheDocument();
  });

  it('hides loading spinner after image loads', () => {
    const block: ImageBlockData = {
      type: 'image',
      url: 'https://example.com/image.png',
    };
    const { container } = render(<ImageBlock block={block} />);
    const img = container.querySelector('img') as HTMLImageElement;
    fireEvent.load(img);

    expect(container.querySelector('.cb-image-loading')).not.toBeInTheDocument();
    expect(img.classList.contains('cb-image-loaded')).toBe(true);
  });

  it('shows error state when image fails to load', () => {
    const block: ImageBlockData = {
      type: 'image',
      url: 'https://example.com/broken.png',
    };
    const { container } = render(<ImageBlock block={block} />);
    const img = container.querySelector('img') as HTMLImageElement;
    fireEvent.error(img);

    expect(screen.getByText('Failed to load image')).toBeInTheDocument();
    expect(container.querySelector('.cb-image-error')).toBeInTheDocument();
  });

  it('uses provided alt text', () => {
    const block: ImageBlockData = {
      type: 'image',
      url: 'https://example.com/photo.jpg',
      alt: 'A beautiful sunset',
    };
    render(<ImageBlock block={block} />);
    expect(screen.getByAltText('A beautiful sunset')).toBeInTheDocument();
  });

  it('uses default alt text when alt is not provided', () => {
    const block: ImageBlockData = {
      type: 'image',
      url: 'https://example.com/photo.jpg',
    };
    render(<ImageBlock block={block} />);
    expect(screen.getByAltText('Image')).toBeInTheDocument();
  });

  it('sets width and height attributes when provided', () => {
    const block: ImageBlockData = {
      type: 'image',
      url: 'https://example.com/photo.jpg',
      width: 400,
      height: 300,
    };
    const { container } = render(<ImageBlock block={block} />);
    const img = container.querySelector('img');
    expect(img?.getAttribute('width')).toBe('400');
    expect(img?.getAttribute('height')).toBe('300');
  });

  it('image is hidden class before load completes', () => {
    const block: ImageBlockData = {
      type: 'image',
      url: 'https://example.com/photo.jpg',
    };
    const { container } = render(<ImageBlock block={block} />);
    const img = container.querySelector('img');
    expect(img?.classList.contains('cb-image-hidden')).toBe(true);
  });
});

/* ================================================================ */
/*  ToolCallBlock                                                    */
/* ================================================================ */

describe('ToolCallBlock edge cases', () => {
  it('renders tool name', () => {
    const block: ToolCallBlockData = {
      type: 'tool_call',
      toolName: 'web_search',
      status: 'running',
    };
    render(<ToolCallBlock block={block} />);
    expect(screen.getByText('web_search')).toBeInTheDocument();
  });

  it('shows running status icon and spinner', () => {
    const block: ToolCallBlockData = {
      type: 'tool_call',
      toolName: 'search',
      status: 'running',
    };
    const { container } = render(<ToolCallBlock block={block} />);
    expect(container.querySelector('.cb-tool-status-running')).toBeInTheDocument();
    expect(container.querySelector('.cb-tool-spinner')).toBeInTheDocument();
  });

  it('shows done status icon without spinner', () => {
    const block: ToolCallBlockData = {
      type: 'tool_call',
      toolName: 'search',
      status: 'done',
    };
    const { container } = render(<ToolCallBlock block={block} />);
    expect(container.querySelector('.cb-tool-status-done')).toBeInTheDocument();
    expect(container.querySelector('.cb-tool-spinner')).not.toBeInTheDocument();
  });

  it('shows error status icon', () => {
    const block: ToolCallBlockData = {
      type: 'tool_call',
      toolName: 'search',
      status: 'error',
    };
    const { container } = render(<ToolCallBlock block={block} />);
    expect(container.querySelector('.cb-tool-status-error')).toBeInTheDocument();
  });

  it('renders truncated input preview for large input', () => {
    const largeInput: Record<string, unknown> = {};
    for (let i = 0; i < 50; i++) {
      largeInput[`key_${i}`] = `value_${i}_${'x'.repeat(20)}`;
    }
    const block: ToolCallBlockData = {
      type: 'tool_call',
      toolName: 'tool',
      status: 'running',
      input: largeInput,
    };
    const { container } = render(<ToolCallBlock block={block} />);
    const preview = container.querySelector('.cb-tool-input-preview');
    expect(preview).toBeInTheDocument();
    expect(preview?.textContent).toContain('...');
  });

  it('does not render input preview when input is empty', () => {
    const block: ToolCallBlockData = {
      type: 'tool_call',
      toolName: 'tool',
      status: 'done',
      input: {},
    };
    const { container } = render(<ToolCallBlock block={block} />);
    expect(container.querySelector('.cb-tool-input-preview')).not.toBeInTheDocument();
  });

  it('does not render input preview when input is undefined', () => {
    const block: ToolCallBlockData = {
      type: 'tool_call',
      toolName: 'tool',
      status: 'done',
    };
    const { container } = render(<ToolCallBlock block={block} />);
    expect(container.querySelector('.cb-tool-input-preview')).not.toBeInTheDocument();
  });
});

/* ================================================================ */
/*  ToolResultBlock                                                  */
/* ================================================================ */

describe('ToolResultBlock edge cases', () => {
  it('renders tool result with tool name', () => {
    const block: ToolResultBlockData = {
      type: 'tool_result',
      toolName: 'search',
      result: 'Found 5 results',
    };
    render(<ToolResultBlock block={block} />);
    expect(screen.getByText(/search result/)).toBeInTheDocument();
  });

  it('renders error result with error styling', () => {
    const block: ToolResultBlockData = {
      type: 'tool_result',
      toolName: 'fetch',
      result: 'Connection timeout',
      isError: true,
    };
    const { container } = render(<ToolResultBlock block={block} />);
    expect(container.querySelector('.cb-tool-result-error')).toBeInTheDocument();
  });

  it('shows duration badge when durationMs is provided', () => {
    const block: ToolResultBlockData = {
      type: 'tool_result',
      toolName: 'api_call',
      result: 'OK',
      durationMs: 250,
    };
    render(<ToolResultBlock block={block} />);
    expect(screen.getByText('250ms')).toBeInTheDocument();
  });

  it('shows "Show more" button for long results', () => {
    const longResult = 'A'.repeat(500);
    const block: ToolResultBlockData = {
      type: 'tool_result',
      toolName: 'query',
      result: longResult,
    };
    render(<ToolResultBlock block={block} />);
    expect(screen.getByText('Show more')).toBeInTheDocument();
  });

  it('toggles between "Show more" and "Show less"', async () => {
    const longResult = 'B'.repeat(500);
    const block: ToolResultBlockData = {
      type: 'tool_result',
      toolName: 'query',
      result: longResult,
    };
    render(<ToolResultBlock block={block} />);

    const user = userEvent.setup();
    await user.click(screen.getByText('Show more'));
    expect(screen.getByText('Show less')).toBeInTheDocument();

    await user.click(screen.getByText('Show less'));
    expect(screen.getByText('Show more')).toBeInTheDocument();
  });

  it('does not show toggle for short results', () => {
    const block: ToolResultBlockData = {
      type: 'tool_result',
      toolName: 'ping',
      result: 'pong',
    };
    render(<ToolResultBlock block={block} />);
    expect(screen.queryByText('Show more')).not.toBeInTheDocument();
  });

  it('renders JSON object result as pretty-printed string', () => {
    const block: ToolResultBlockData = {
      type: 'tool_result',
      toolName: 'api',
      result: { status: 'ok', count: 3 },
    };
    const { container } = render(<ToolResultBlock block={block} />);
    const resultBody = container.querySelector('.cb-tool-result-body');
    expect(resultBody?.textContent).toContain('"status"');
    expect(resultBody?.textContent).toContain('"ok"');
  });
});

/* ================================================================ */
/*  ThinkingBlock                                                    */
/* ================================================================ */

describe('ThinkingBlock edge cases', () => {
  it('renders collapsed by default with "Thinking..." label', () => {
    const block: ThinkingBlockData = {
      type: 'thinking',
      text: 'Considering the options...',
    };
    render(<ThinkingBlock block={block} />);
    expect(screen.getByText('Thinking...')).toBeInTheDocument();
    expect(screen.queryByText('Considering the options...')).not.toBeInTheDocument();
  });

  it('expands to show thinking text on click', async () => {
    const block: ThinkingBlockData = {
      type: 'thinking',
      text: 'Analyzing the data...',
    };
    render(<ThinkingBlock block={block} />);

    const user = userEvent.setup();
    await user.click(screen.getByText('Thinking...'));

    expect(screen.getByText('Analyzing the data...')).toBeInTheDocument();
  });

  it('collapses again on second click', async () => {
    const block: ThinkingBlockData = {
      type: 'thinking',
      text: 'Deep thought...',
    };
    render(<ThinkingBlock block={block} />);

    const user = userEvent.setup();
    await user.click(screen.getByText('Thinking...'));
    expect(screen.getByText('Deep thought...')).toBeInTheDocument();

    await user.click(screen.getByText('Thinking...'));
    expect(screen.queryByText('Deep thought...')).not.toBeInTheDocument();
  });

  it('shows collapsed icon when collapsed', () => {
    const block: ThinkingBlockData = { type: 'thinking', text: 'test' };
    const { container } = render(<ThinkingBlock block={block} />);
    const icon = container.querySelector('.cb-thinking-icon');
    expect(icon?.textContent).toBe('\u25B6');
  });

  it('shows expanded icon when expanded', async () => {
    const block: ThinkingBlockData = { type: 'thinking', text: 'test' };
    const { container } = render(<ThinkingBlock block={block} />);

    const user = userEvent.setup();
    await user.click(screen.getByText('Thinking...'));

    const icon = container.querySelector('.cb-thinking-icon');
    expect(icon?.textContent).toBe('\u25BC');
  });
});

/* ================================================================ */
/*  ContentBlockRenderer                                             */
/* ================================================================ */

describe('ContentBlockRenderer edge cases', () => {
  it('renders nothing for empty blocks array', () => {
    const { container } = render(<ContentBlockRenderer blocks={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders a single text block', () => {
    const blocks: ContentBlock[] = [{ type: 'text', text: 'Hello from renderer' }];
    render(<ContentBlockRenderer blocks={blocks} />);
    expect(screen.getByText('Hello from renderer')).toBeInTheDocument();
  });

  it('renders mixed content blocks in sequence', () => {
    const blocks: ContentBlock[] = [
      { type: 'text', text: 'Intro text' },
      { type: 'code', code: 'const x = 1;', language: 'javascript' },
      { type: 'text', text: 'Outro text' },
    ];
    const { container } = render(<ContentBlockRenderer blocks={blocks} />);
    expect(container.querySelector('.cb-renderer')).toBeInTheDocument();
    expect(screen.getByText('Intro text')).toBeInTheDocument();
    expect(screen.getByText('Outro text')).toBeInTheDocument();
  });

  it('renders unknown block type as JSON', () => {
    const blocks = [{ type: 'unknown_type', data: 'test' }] as unknown as ContentBlock[];
    const { container } = render(<ContentBlockRenderer blocks={blocks} />);
    const unknownEl = container.querySelector('.cb-unknown-block');
    expect(unknownEl).toBeInTheDocument();
    expect(unknownEl?.textContent).toContain('unknown_type');
  });
});

/* ================================================================ */
/*  parseContentBlocks                                               */
/* ================================================================ */

describe('parseContentBlocks edge cases', () => {
  it('returns empty array for null content', () => {
    expect(parseContentBlocks(null)).toEqual([]);
  });

  it('returns empty array for undefined content', () => {
    expect(parseContentBlocks(undefined)).toEqual([]);
  });

  it('wraps plain string as text block', () => {
    const result = parseContentBlocks('Hello world');
    expect(result).toEqual([{ type: 'text', text: 'Hello world' }]);
  });

  it('parses JSON string array into blocks', () => {
    const json = JSON.stringify([
      { type: 'text', text: 'block 1' },
      { type: 'code', code: 'x = 1' },
    ]);
    const result = parseContentBlocks(json);
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('text');
    expect(result[1].type).toBe('code');
  });

  it('passes through an existing array directly', () => {
    const blocks = [{ type: 'text', text: 'direct' }];
    const result = parseContentBlocks(blocks);
    expect(result).toEqual(blocks);
  });

  it('wraps legacy { text: "..." } object as text block', () => {
    const result = parseContentBlocks({ text: 'legacy format' });
    expect(result).toEqual([{ type: 'text', text: 'legacy format' }]);
  });

  it('unwraps { blocks: [...] } wrapper', () => {
    const result = parseContentBlocks({
      blocks: [{ type: 'text', text: 'wrapped' }],
    });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('text');
  });

  it('wraps single object with type field as single-element array', () => {
    const result = parseContentBlocks({ type: 'thinking', text: 'thought' });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('thinking');
  });

  it('parses JSON string with single object with type field', () => {
    const json = JSON.stringify({ type: 'code', code: 'print(1)' });
    const result = parseContentBlocks(json);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('code');
  });

  it('treats non-JSON string as plain text', () => {
    const result = parseContentBlocks('not { valid json');
    expect(result).toEqual([{ type: 'text', text: 'not { valid json' }]);
  });

  it('returns empty array for empty object without recognized fields', () => {
    const result = parseContentBlocks({ unknown: true });
    expect(result).toEqual([]);
  });
});
