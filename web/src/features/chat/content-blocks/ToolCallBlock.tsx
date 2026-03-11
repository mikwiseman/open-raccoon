'use client';

export type ToolCallBlockData = {
  type: 'tool_call';
  toolName: string;
  toolCallId?: string;
  input?: Record<string, unknown>;
  status: 'running' | 'done' | 'error';
};

function truncateInput(input: Record<string, unknown> | undefined): string {
  if (!input) return '';
  const serialized = JSON.stringify(input, null, 2);
  if (serialized.length <= 200) return serialized;
  return `${serialized.slice(0, 200)}\n...`;
}

export function ToolCallBlock({ block }: { block: ToolCallBlockData }) {
  const statusIcon =
    block.status === 'running'
      ? '\u25CF' // filled circle
      : block.status === 'done'
        ? '\u2713' // checkmark
        : '\u2717'; // X

  const statusClass =
    block.status === 'running'
      ? 'cb-tool-status-running'
      : block.status === 'done'
        ? 'cb-tool-status-done'
        : 'cb-tool-status-error';

  return (
    <div className="cb-tool-call">
      <div className="cb-tool-call-header">
        <span className={`cb-tool-status-icon ${statusClass}`}>{statusIcon}</span>
        <span className="cb-tool-name">{block.toolName}</span>
        {block.status === 'running' && <span className="cb-tool-spinner" />}
      </div>
      {block.input && Object.keys(block.input).length > 0 && (
        <pre className="cb-tool-input-preview">{truncateInput(block.input)}</pre>
      )}
    </div>
  );
}
