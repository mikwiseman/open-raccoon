import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentEvent } from '@/lib/types';
import { ExecutionHistory } from '../ExecutionHistory';

afterEach(() => {
  cleanup();
});

function makeEvent(overrides: Partial<AgentEvent> = {}): AgentEvent {
  return {
    id: 'evt-1',
    agent_id: 'agent-1',
    event_type: 'run',
    trigger_type: null,
    duration_ms: 1500,
    input_tokens: 100,
    output_tokens: 200,
    model: 'claude-sonnet-4-6',
    status: 'completed',
    error_code: null,
    error_message: null,
    inserted_at: '2026-01-15T10:00:00Z',
    ...overrides,
  };
}

function makeMockApi(
  options: {
    items?: AgentEvent[];
    has_more?: boolean;
    next_cursor?: string | null;
    shouldReject?: boolean;
    rejectMessage?: string;
  } = {},
) {
  const {
    items = [],
    has_more = false,
    next_cursor = null,
    shouldReject = false,
    rejectMessage = 'API Error',
  } = options;

  return {
    listAgentEvents: vi.fn().mockImplementation(() => {
      if (shouldReject) {
        return Promise.reject(new Error(rejectMessage));
      }
      return Promise.resolve({
        items,
        page_info: { has_more, next_cursor },
      });
    }),
  } as any;
}

describe('ExecutionHistory', () => {
  let onEventsLoaded: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onEventsLoaded = vi.fn();
  });

  it('renders events after loading', async () => {
    const events = [
      makeEvent({ id: 'evt-1', event_type: 'run', status: 'completed' }),
      makeEvent({ id: 'evt-2', event_type: 'tool_call', status: 'failed' }),
    ];
    const api = makeMockApi({ items: events });

    render(<ExecutionHistory api={api} agentId="agent-1" onEventsLoaded={onEventsLoaded} />);

    await waitFor(() => {
      expect(screen.getByText('completed')).toBeInTheDocument();
    });

    expect(screen.getByText('failed')).toBeInTheDocument();
    expect(onEventsLoaded).toHaveBeenCalledWith(events);
  });

  it('shows empty state when no events exist', async () => {
    const api = makeMockApi({ items: [] });

    render(<ExecutionHistory api={api} agentId="agent-1" onEventsLoaded={onEventsLoaded} />);

    await waitFor(() => {
      expect(screen.getByText('No execution events yet.')).toBeInTheDocument();
    });
  });

  it('shows error state when API fails', async () => {
    const api = makeMockApi({ shouldReject: true, rejectMessage: 'Network error' });

    render(<ExecutionHistory api={api} agentId="agent-1" onEventsLoaded={onEventsLoaded} />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('shows Load More button when has_more is true', async () => {
    const events = [makeEvent()];
    const api = makeMockApi({ items: events, has_more: true, next_cursor: 'cursor-2' });

    render(<ExecutionHistory api={api} agentId="agent-1" onEventsLoaded={onEventsLoaded} />);

    await waitFor(() => {
      expect(screen.getByText('Load More')).toBeInTheDocument();
    });
  });

  it('does not show Load More when has_more is false', async () => {
    const events = [makeEvent()];
    const api = makeMockApi({ items: events, has_more: false });

    render(<ExecutionHistory api={api} agentId="agent-1" onEventsLoaded={onEventsLoaded} />);

    await waitFor(() => {
      expect(screen.getByText('completed')).toBeInTheDocument();
    });

    expect(screen.queryByText('Load More')).not.toBeInTheDocument();
  });

  it('loads more events when Load More is clicked', async () => {
    const firstBatch = [makeEvent({ id: 'evt-1' })];
    const secondBatch = [makeEvent({ id: 'evt-2', status: 'running' })];

    const listAgentEvents = vi
      .fn()
      .mockResolvedValueOnce({
        items: firstBatch,
        page_info: { has_more: true, next_cursor: 'cursor-2' },
      })
      .mockResolvedValueOnce({
        items: secondBatch,
        page_info: { has_more: false, next_cursor: null },
      });

    const api = { listAgentEvents } as any;

    render(<ExecutionHistory api={api} agentId="agent-1" onEventsLoaded={onEventsLoaded} />);

    await waitFor(() => {
      expect(screen.getByText('Load More')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByText('Load More'));

    await waitFor(() => {
      expect(screen.getByText('running')).toBeInTheDocument();
    });

    // Second call should include cursor
    expect(listAgentEvents).toHaveBeenCalledTimes(2);
  });

  it('expands event details on click', async () => {
    const events = [
      makeEvent({
        id: 'evt-1',
        model: 'gpt-4o',
        input_tokens: 150,
        output_tokens: 300,
        duration_ms: 2000,
      }),
    ];
    const api = makeMockApi({ items: events });

    render(<ExecutionHistory api={api} agentId="agent-1" onEventsLoaded={onEventsLoaded} />);

    await waitFor(() => {
      expect(screen.getByText('completed')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    // Click the event row button to expand
    const eventButton = screen.getByRole('button', { name: /completed/i });
    await user.click(eventButton);

    // Detail view should now show model, tokens, etc.
    expect(screen.getByText('gpt-4o')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('300')).toBeInTheDocument();
  });

  it('collapses event details on second click', async () => {
    const events = [makeEvent({ id: 'evt-1', model: 'gpt-4o' })];
    const api = makeMockApi({ items: events });

    render(<ExecutionHistory api={api} agentId="agent-1" onEventsLoaded={onEventsLoaded} />);

    await waitFor(() => {
      expect(screen.getByText('completed')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const eventButton = screen.getByRole('button', { name: /completed/i });

    // Expand
    await user.click(eventButton);
    expect(screen.getByText('gpt-4o')).toBeInTheDocument();

    // Collapse
    await user.click(eventButton);
    expect(screen.queryByText('gpt-4o')).not.toBeInTheDocument();
  });

  it('displays error details when event has error_code', async () => {
    const events = [
      makeEvent({
        id: 'evt-err',
        status: 'failed',
        error_code: 'TIMEOUT',
        error_message: 'Step exceeded maximum duration',
      }),
    ];
    const api = makeMockApi({ items: events });

    render(<ExecutionHistory api={api} agentId="agent-1" onEventsLoaded={onEventsLoaded} />);

    await waitFor(() => {
      expect(screen.getByText('failed')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /failed/i }));

    expect(screen.getByText(/TIMEOUT/)).toBeInTheDocument();
    expect(screen.getByText(/Step exceeded maximum duration/)).toBeInTheDocument();
  });

  it('renders trigger_type when present', async () => {
    const events = [makeEvent({ id: 'evt-trigger', trigger_type: 'webhook' })];
    const api = makeMockApi({ items: events });

    render(<ExecutionHistory api={api} agentId="agent-1" onEventsLoaded={onEventsLoaded} />);

    await waitFor(() => {
      expect(screen.getByText('webhook')).toBeInTheDocument();
    });
  });
});
