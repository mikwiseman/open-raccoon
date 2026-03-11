'use client';

import { useState } from 'react';

export type ToolResultBlockData = {
  type: 'tool_result';
  toolName: string;
  toolCallId?: string;
  result?: unknown;
  durationMs?: number;
  isError?: boolean;
};

export function ToolResultBlock({ block }: { block: ToolResultBlockData }) {
  const [expanded, setExpanded] = useState(false);

  const resultStr =
    typeof block.result === 'string' ? block.result : JSON.stringify(block.result, null, 2);

  const truncated = resultStr.length > 300;
  const displayResult = expanded ? resultStr : resultStr.slice(0, 300);

  return (
    <div className={`cb-tool-result ${block.isError ? 'cb-tool-result-error' : ''}`}>
      <div className="cb-tool-result-header">
        <span className="cb-tool-result-label">
          {block.isError ? '\u2717' : '\u2192'} {block.toolName} result
        </span>
        {typeof block.durationMs === 'number' && (
          <span className="cb-tool-duration-badge">{block.durationMs}ms</span>
        )}
      </div>
      {resultStr && (
        <pre className="cb-tool-result-body">
          {displayResult}
          {truncated && !expanded && '...'}
        </pre>
      )}
      {truncated && (
        <button
          type="button"
          className="cb-tool-result-toggle"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}
