import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ToolResultBlock, type ToolResultBlockData } from '../ToolResultBlock';

afterEach(() => {
  cleanup();
});

describe('ToolResultBlock', () => {
  it('renders the tool name', () => {
    const block: ToolResultBlockData = {
      type: 'tool_result',
      toolName: 'web_search',
      result: 'Found 5 results',
    };
    render(<ToolResultBlock block={block} />);
    expect(screen.getByText(/web_search result/)).toBeInTheDocument();
  });

  it('renders a string result', () => {
    const block: ToolResultBlockData = {
      type: 'tool_result',
      toolName: 'search',
      result: 'Hello world',
    };
    render(<ToolResultBlock block={block} />);
    expect(screen.getByText(/Hello world/)).toBeInTheDocument();
  });

  it('renders an object result as JSON', () => {
    const block: ToolResultBlockData = {
      type: 'tool_result',
      toolName: 'api_call',
      result: { status: 'ok', count: 42 },
    };
    const { container } = render(<ToolResultBlock block={block} />);
    const pre = container.querySelector('pre');
    expect(pre?.textContent).toContain('"status"');
    expect(pre?.textContent).toContain('"ok"');
  });

  it('renders the duration badge when durationMs is provided', () => {
    const block: ToolResultBlockData = {
      type: 'tool_result',
      toolName: 'search',
      result: 'ok',
      durationMs: 150,
    };
    render(<ToolResultBlock block={block} />);
    expect(screen.getByText('150ms')).toBeInTheDocument();
  });

  it('does not render duration badge when durationMs is absent', () => {
    const block: ToolResultBlockData = {
      type: 'tool_result',
      toolName: 'search',
      result: 'ok',
    };
    const { container } = render(<ToolResultBlock block={block} />);
    expect(container.querySelector('.cb-tool-duration-badge')).not.toBeInTheDocument();
  });

  it('applies error class when isError is true', () => {
    const block: ToolResultBlockData = {
      type: 'tool_result',
      toolName: 'search',
      result: 'Error occurred',
      isError: true,
    };
    const { container } = render(<ToolResultBlock block={block} />);
    const wrapper = container.querySelector('.cb-tool-result');
    expect(wrapper?.className).toContain('cb-tool-result-error');
  });

  it('does not apply error class when isError is false', () => {
    const block: ToolResultBlockData = {
      type: 'tool_result',
      toolName: 'search',
      result: 'All good',
      isError: false,
    };
    const { container } = render(<ToolResultBlock block={block} />);
    const wrapper = container.querySelector('.cb-tool-result');
    expect(wrapper?.className).not.toContain('cb-tool-result-error');
  });

  it('truncates long results and shows "Show more" button', () => {
    const longResult = 'x'.repeat(400);
    const block: ToolResultBlockData = {
      type: 'tool_result',
      toolName: 'search',
      result: longResult,
    };
    render(<ToolResultBlock block={block} />);
    expect(screen.getByText('Show more')).toBeInTheDocument();
    // The pre should show truncated content
    const pre = screen.getByText(/^x+\.\.\.$/);
    expect(pre).toBeInTheDocument();
  });

  it('expands truncated result when "Show more" is clicked', () => {
    const longResult = 'y'.repeat(400);
    const block: ToolResultBlockData = {
      type: 'tool_result',
      toolName: 'search',
      result: longResult,
    };
    render(<ToolResultBlock block={block} />);
    fireEvent.click(screen.getByText('Show more'));
    expect(screen.getByText('Show less')).toBeInTheDocument();
  });

  it('does not show "Show more" for short results', () => {
    const block: ToolResultBlockData = {
      type: 'tool_result',
      toolName: 'search',
      result: 'Short result',
    };
    render(<ToolResultBlock block={block} />);
    expect(screen.queryByText('Show more')).not.toBeInTheDocument();
  });

  it('shows error marker (x) when isError is true', () => {
    const block: ToolResultBlockData = {
      type: 'tool_result',
      toolName: 'search',
      result: 'Error',
      isError: true,
    };
    render(<ToolResultBlock block={block} />);
    expect(screen.getByText(/\u2717/)).toBeInTheDocument();
  });

  it('shows arrow marker when isError is false', () => {
    const block: ToolResultBlockData = {
      type: 'tool_result',
      toolName: 'search',
      result: 'ok',
      isError: false,
    };
    render(<ToolResultBlock block={block} />);
    expect(screen.getByText(/\u2192/)).toBeInTheDocument();
  });
});
