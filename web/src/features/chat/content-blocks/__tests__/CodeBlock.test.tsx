import { cleanup, render, screen } from '@testing-library/react';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import python from 'highlight.js/lib/languages/python';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { CodeBlock, type CodeBlockData } from '../CodeBlock';

beforeAll(() => {
  hljs.registerLanguage('javascript', javascript);
  hljs.registerLanguage('js', javascript);
  hljs.registerLanguage('python', python);
  hljs.registerLanguage('py', python);
});

afterEach(() => {
  cleanup();
});

describe('CodeBlock', () => {
  it('renders code content inside a <pre><code> block', () => {
    const block: CodeBlockData = { type: 'code', code: 'const x = 1;' };
    const { container } = render(<CodeBlock block={block} />);
    const codeEl = container.querySelector('code');
    expect(codeEl).toBeInTheDocument();
    expect(codeEl?.textContent).toContain('const');
    expect(codeEl?.textContent).toContain('x');
  });

  it('renders the language label when language is provided', () => {
    const block: CodeBlockData = { type: 'code', language: 'javascript', code: 'let a = 1;' };
    render(<CodeBlock block={block} />);
    expect(screen.getByText('javascript')).toBeInTheDocument();
  });

  it('renders "code" as the language label when no language is provided', () => {
    const block: CodeBlockData = { type: 'code', code: 'something()' };
    render(<CodeBlock block={block} />);
    expect(screen.getByText('code')).toBeInTheDocument();
  });

  it('applies syntax highlighting via highlight.js for a known language', () => {
    const block: CodeBlockData = { type: 'code', language: 'javascript', code: 'const x = 42;' };
    const { container } = render(<CodeBlock block={block} />);
    const codeEl = container.querySelector('code');
    // highlight.js wraps tokens in <span> elements with hljs-* classes
    const spans = codeEl?.querySelectorAll('span[class*="hljs-"]');
    expect(spans?.length).toBeGreaterThan(0);
  });

  it('falls back to highlightAuto when no language is specified', () => {
    const block: CodeBlockData = { type: 'code', code: 'function hello() { return 1; }' };
    const { container } = render(<CodeBlock block={block} />);
    const codeEl = container.querySelector('code');
    // highlightAuto should still produce highlighted output
    expect(codeEl?.innerHTML).not.toBe('function hello() { return 1; }');
  });

  it('shows the Copy button', () => {
    const block: CodeBlockData = { type: 'code', code: 'copy me' };
    render(<CodeBlock block={block} />);
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });

  it('calls navigator.clipboard.writeText when Copy is clicked', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    const block: CodeBlockData = { type: 'code', code: 'copied content' };
    render(<CodeBlock block={block} />);

    await screen.getByRole('button', { name: 'Copy' }).click();
    expect(writeText).toHaveBeenCalledWith('copied content');
  });

  it('renders empty code without crashing', () => {
    const block: CodeBlockData = { type: 'code', code: '' };
    const { container } = render(<CodeBlock block={block} />);
    const codeEl = container.querySelector('code');
    expect(codeEl).toBeInTheDocument();
    expect(codeEl?.textContent).toBe('');
  });

  it('sanitizes output via DOMPurify (strips dangerous tags)', () => {
    // Even though highlight.js wouldn't produce script tags, DOMPurify
    // is the safety net. We verify that a <script> injected into the code
    // field does not appear as-is in the rendered HTML.
    const block: CodeBlockData = {
      type: 'code',
      code: '<script>alert("xss")</script>',
    };
    const { container } = render(<CodeBlock block={block} />);
    const codeEl = container.querySelector('code');
    // The raw <script> tag should not appear in innerHTML
    expect(codeEl?.innerHTML).not.toContain('<script>');
  });

  it('renders the output section when block.output is provided', () => {
    const block: CodeBlockData = { type: 'code', code: 'print("hi")', output: 'hi' };
    render(<CodeBlock block={block} />);
    expect(screen.getByText('Output')).toBeInTheDocument();
    expect(screen.getByText('hi')).toBeInTheDocument();
  });

  it('does not render the output section when block.output is absent', () => {
    const block: CodeBlockData = { type: 'code', code: 'print("hi")' };
    render(<CodeBlock block={block} />);
    expect(screen.queryByText('Output')).not.toBeInTheDocument();
  });
});
