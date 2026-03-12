'use client';

import hljs from 'highlight.js/lib/core';

// Lazy-initialize DOMPurify to avoid SSR crash (dompurify needs window.document)
let _purify: typeof import('dompurify').default | null = null;
function getPurify() {
  if (!_purify && typeof window !== 'undefined') {
    _purify = require('dompurify') as typeof import('dompurify').default; // eslint-disable-line
  }
  return _purify;
}

export type CodeBlockData = {
  type: 'code';
  language?: string;
  code: string;
  output?: string;
};

function escapeHtml(raw: string): string {
  return raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function CodeBlock({ block }: { block: CodeBlockData }) {
  const lang = block.language || '';
  const code = block.code || '';

  let highlighted: string;
  try {
    highlighted =
      lang && hljs.getLanguage(lang)
        ? hljs.highlight(code, { language: lang }).value
        : hljs.highlightAuto(code).value;
  } catch {
    highlighted = escapeHtml(code);
  }

  return (
    <div className="cb-code-block">
      <div className="cb-code-block-header">
        <span className="cb-code-block-lang">{lang || 'code'}</span>
        <button
          type="button"
          className="cb-code-copy-btn"
          onClick={() => void navigator.clipboard.writeText(code)}
        >
          Copy
        </button>
      </div>
      <pre className="cb-code-block-pre">
        <code
          // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized via DOMPurify
          dangerouslySetInnerHTML={{ __html: (getPurify()?.sanitize ?? escapeHtml)(highlighted) }}
        />
      </pre>
      {block.output && (
        <div className="cb-code-block-output">
          <div className="cb-code-block-output-label">Output</div>
          <pre className="cb-code-block-output-pre">{block.output}</pre>
        </div>
      )}
    </div>
  );
}
