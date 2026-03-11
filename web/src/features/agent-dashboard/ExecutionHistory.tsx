'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { WaiAgentsApi } from '@/lib/api/services';
import type { AgentEvent } from '@/lib/types';

type Props = {
  api: WaiAgentsApi;
  agentId: string;
  onEventsLoaded: (events: AgentEvent[]) => void;
};

export function ExecutionHistory({ api, agentId, onEventsLoaded }: Props) {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  // Use a ref to always read the current cursor value, avoiding stale closures
  const cursorRef = useRef(cursor);
  cursorRef.current = cursor;

  const loadEvents = useCallback(
    async (append = false) => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.listAgentEvents(agentId, {
          cursor: append ? (cursorRef.current ?? undefined) : undefined,
          limit: 20,
        });
        setEvents((prev) => {
          const next = append ? [...prev, ...res.items] : res.items;
          onEventsLoaded(next);
          return next;
        });
        setCursor(res.page_info.next_cursor);
        setHasMore(res.page_info.has_more);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load events');
      } finally {
        setLoading(false);
      }
    },
    [api, agentId, onEventsLoaded],
  );

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  function statusColor(status: AgentEvent['status']): string {
    switch (status) {
      case 'completed':
        return 'ad-status-success';
      case 'running':
        return 'ad-status-running';
      case 'failed':
        return 'ad-status-error';
      case 'timeout':
        return 'ad-status-warning';
      default:
        return '';
    }
  }

  return (
    <div className="ad-execution-history">
      {error && <p className="error-text">{error}</p>}

      {!loading && events.length === 0 && <p className="ab-empty-hint">No execution events yet.</p>}

      <div className="ad-event-list">
        {events.map((event) => (
          <div key={event.id} className="ad-event-row">
            <button
              type="button"
              className="ad-event-summary"
              onClick={() => setExpandedId(expandedId === event.id ? null : event.id)}
            >
              <span className={`ad-event-status ${statusColor(event.status)}`}>{event.status}</span>
              <span className="ad-event-type">{event.event_type}</span>
              {event.trigger_type && <span className="ad-event-trigger">{event.trigger_type}</span>}
              <span className="ad-event-duration">
                {event.duration_ms != null ? `${event.duration_ms}ms` : '--'}
              </span>
              <span className="ad-event-tokens">
                {(event.input_tokens ?? 0) + (event.output_tokens ?? 0)} tok
              </span>
              <span className="ad-event-time">{new Date(event.inserted_at).toLocaleString()}</span>
            </button>

            {expandedId === event.id && (
              <div className="ad-event-detail">
                <div className="ad-detail-grid">
                  <div className="ad-detail-item">
                    <span className="ad-detail-label">Model</span>
                    <span className="ad-detail-value">{event.model ?? '--'}</span>
                  </div>
                  <div className="ad-detail-item">
                    <span className="ad-detail-label">Input Tokens</span>
                    <span className="ad-detail-value">{event.input_tokens ?? 0}</span>
                  </div>
                  <div className="ad-detail-item">
                    <span className="ad-detail-label">Output Tokens</span>
                    <span className="ad-detail-value">{event.output_tokens ?? 0}</span>
                  </div>
                  <div className="ad-detail-item">
                    <span className="ad-detail-label">Duration</span>
                    <span className="ad-detail-value">{event.duration_ms ?? 0}ms</span>
                  </div>
                  {event.error_code && (
                    <div className="ad-detail-item ad-detail-full">
                      <span className="ad-detail-label">Error</span>
                      <span className="ad-detail-value ad-detail-error">
                        [{event.error_code}] {event.error_message}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {loading && (
        <div className="loading-spinner-container">
          <div className="loading-spinner" />
        </div>
      )}

      {hasMore && !loading && (
        <button
          type="button"
          className="ab-btn ab-btn-secondary"
          onClick={() => void loadEvents(true)}
        >
          Load More
        </button>
      )}
    </div>
  );
}
