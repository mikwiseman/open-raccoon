import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ToolCallBlock, type ToolCallBlockData } from '../ToolCallBlock';

afterEach(() => {
  cleanup();
});

describe('ToolCallBlock', () => {
  it('renders the tool name', () => {
    const block: ToolCallBlockData = {
      type: 'tool_call',
      toolName: 'web_search',
      status: 'done',
    };
    render(<ToolCallBlock block={block} />);
    expect(screen.getByText('web_search')).toBeInTheDocument();
  });

  it('renders the checkmark icon for "done" status', () => {
    const block: ToolCallBlockData = {
      type: 'tool_call',
      toolName: 'read_file',
      status: 'done',
    };
    const { container } = render(<ToolCallBlock block={block} />);
    const icon = container.querySelector('.cb-tool-status-icon');
    expect(icon?.textContent).toBe('\u2713');
    expect(icon?.classList.contains('cb-tool-status-done')).toBe(true);
  });

  it('renders the filled circle icon for "running" status', () => {
    const block: ToolCallBlockData = {
      type: 'tool_call',
      toolName: 'execute_code',
      status: 'running',
    };
    const { container } = render(<ToolCallBlock block={block} />);
    const icon = container.querySelector('.cb-tool-status-icon');
    expect(icon?.textContent).toBe('\u25CF');
    expect(icon?.classList.contains('cb-tool-status-running')).toBe(true);
  });

  it('renders the X icon for "error" status', () => {
    const block: ToolCallBlockData = {
      type: 'tool_call',
      toolName: 'api_call',
      status: 'error',
    };
    const { container } = render(<ToolCallBlock block={block} />);
    const icon = container.querySelector('.cb-tool-status-icon');
    expect(icon?.textContent).toBe('\u2717');
    expect(icon?.classList.contains('cb-tool-status-error')).toBe(true);
  });

  it('shows a spinner element when status is "running"', () => {
    const block: ToolCallBlockData = {
      type: 'tool_call',
      toolName: 'long_task',
      status: 'running',
    };
    const { container } = render(<ToolCallBlock block={block} />);
    expect(container.querySelector('.cb-tool-spinner')).toBeInTheDocument();
  });

  it('does not show a spinner when status is "done"', () => {
    const block: ToolCallBlockData = {
      type: 'tool_call',
      toolName: 'done_task',
      status: 'done',
    };
    const { container } = render(<ToolCallBlock block={block} />);
    expect(container.querySelector('.cb-tool-spinner')).not.toBeInTheDocument();
  });

  it('does not show a spinner when status is "error"', () => {
    const block: ToolCallBlockData = {
      type: 'tool_call',
      toolName: 'failed_task',
      status: 'error',
    };
    const { container } = render(<ToolCallBlock block={block} />);
    expect(container.querySelector('.cb-tool-spinner')).not.toBeInTheDocument();
  });

  it('renders input arguments as JSON in a <pre>', () => {
    const block: ToolCallBlockData = {
      type: 'tool_call',
      toolName: 'web_search',
      status: 'done',
      input: { query: 'vitest react testing', limit: 10 },
    };
    const { container } = render(<ToolCallBlock block={block} />);
    const pre = container.querySelector('.cb-tool-input-preview');
    expect(pre).toBeInTheDocument();
    expect(pre?.textContent).toContain('"query"');
    expect(pre?.textContent).toContain('vitest react testing');
    expect(pre?.textContent).toContain('"limit"');
  });

  it('does not render input preview when input is undefined', () => {
    const block: ToolCallBlockData = {
      type: 'tool_call',
      toolName: 'no_args',
      status: 'done',
    };
    const { container } = render(<ToolCallBlock block={block} />);
    expect(container.querySelector('.cb-tool-input-preview')).not.toBeInTheDocument();
  });

  it('does not render input preview when input is an empty object', () => {
    const block: ToolCallBlockData = {
      type: 'tool_call',
      toolName: 'empty_args',
      status: 'done',
      input: {},
    };
    const { container } = render(<ToolCallBlock block={block} />);
    expect(container.querySelector('.cb-tool-input-preview')).not.toBeInTheDocument();
  });

  it('truncates long input arguments with "..."', () => {
    const longValue = 'x'.repeat(300);
    const block: ToolCallBlockData = {
      type: 'tool_call',
      toolName: 'big_input',
      status: 'done',
      input: { data: longValue },
    };
    const { container } = render(<ToolCallBlock block={block} />);
    const pre = container.querySelector('.cb-tool-input-preview');
    expect(pre).toBeInTheDocument();
    expect(pre?.textContent).toContain('...');
    // The full 300-char value should NOT appear since it's truncated at 200
    expect(pre?.textContent?.length).toBeLessThan(longValue.length);
  });
});
