'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { WaiAgentsApi } from '@/lib/api';
import type { FeedItem } from '@/lib/types';
import { toIsoLocal } from '@/lib/utils';

type FeedKind = 'for_you' | 'trending' | 'following' | 'new';

type FeedViewProps = {
  api: WaiAgentsApi;
};

const TABS: Array<{ key: FeedKind; label: string }> = [
  { key: 'for_you', label: 'For You' },
  { key: 'trending', label: 'Trending' },
  { key: 'following', label: 'Following' },
  { key: 'new', label: 'New' },
];

export function FeedView({ api }: FeedViewProps) {
  const [kind, setKind] = useState<FeedKind>('for_you');
  const [items, setItems] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const selected = useMemo(() => items[0] ?? null, [items]);

  const load = useCallback(
    async (nextKind: FeedKind, nextCursor?: string | null) => {
      setLoading(true);
      setError(null);

      try {
        const response = await api.listFeed(nextKind, {
          limit: 20,
          cursor: nextCursor ?? undefined,
        });

        setItems((previous) => {
          if (!nextCursor) {
            return response.items;
          }

          const ids = new Set(previous.map((item) => item.id));
          const merged = [...previous];

          response.items.forEach((item) => {
            if (!ids.has(item.id)) {
              merged.push(item);
            }
          });

          return merged;
        });

        setCursor(response.page_info.next_cursor);
        setHasMore(response.page_info.has_more);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [api],
  );

  useEffect(() => {
    void load(kind);
  }, [kind, load]);

  const onLikeToggle = async (item: FeedItem) => {
    setError(null);

    try {
      if (liked[item.id]) {
        await api.unlikeFeedItem(item.id);
        setLiked((previous) => ({ ...previous, [item.id]: false }));
        setItems((previous) =>
          previous.map((current) =>
            current.id === item.id
              ? { ...current, like_count: Math.max(0, current.like_count - 1) }
              : current,
          ),
        );
      } else {
        await api.likeFeedItem(item.id);
        setLiked((previous) => ({ ...previous, [item.id]: true }));
        setItems((previous) =>
          previous.map((current) =>
            current.id === item.id ? { ...current, like_count: current.like_count + 1 } : current,
          ),
        );
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const onFork = async (item: FeedItem) => {
    setError(null);

    try {
      await api.forkFeedItem(item.id);
      setItems((previous) =>
        previous.map((current) =>
          current.id === item.id ? { ...current, fork_count: current.fork_count + 1 } : current,
        ),
      );
      setInfo(`Forked ${item.title ?? item.id.slice(0, 8)}`);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <section className="feed-layout" aria-label="feed-module">
      <header className="panel-header compact">
        <h2>Feed</h2>
        <p>{loading ? 'Refreshing...' : `${items.length} items`}</p>
      </header>

      <div className="tab-row" role="tablist" aria-label="feed-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={tab.key === kind ? 'active' : ''}
            onClick={() => setKind(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="feed-grid">
        <div>
          <ul className="feed-list">
            {items.map((item) => (
              <li key={item.id} className="feed-card" data-feed-id={item.id}>
                <header>
                  <h3>{item.title || `${item.type} · ${item.id.slice(0, 8)}`}</h3>
                  <small>{toIsoLocal(item.created_at)}</small>
                </header>
                <p>{item.description || 'No description'}</p>
                <footer className="inline-buttons">
                  <button type="button" onClick={() => void onLikeToggle(item)}>
                    {liked[item.id] ? 'Unlike' : 'Like'} ({item.like_count})
                  </button>
                  <button type="button" onClick={() => void onFork(item)}>
                    Fork ({item.fork_count})
                  </button>
                </footer>
              </li>
            ))}
          </ul>

          {hasMore && (
            <button type="button" onClick={() => void load(kind, cursor)} disabled={loading}>
              {loading ? 'Loading...' : 'Load more'}
            </button>
          )}
        </div>

        <aside className="detail-card">
          <h3>Detail</h3>
          {selected ? (
            <>
              <p>
                <strong>{selected.title || selected.id}</strong>
              </p>
              <p>{selected.description || 'No description'}</p>
              <p>
                Score {selected.quality_score.toFixed(2)} · Trending{' '}
                {selected.trending_score.toFixed(2)}
              </p>
              <p>
                Likes {selected.like_count} · Forks {selected.fork_count} · Views{' '}
                {selected.view_count}
              </p>
            </>
          ) : (
            <p>No feed item selected.</p>
          )}
        </aside>
      </div>

      {info && <p className="info-banner">{info}</p>}
      {error && <p className="error-banner">{error}</p>}
    </section>
  );
}

export function FeedPlaceholder() {
  return <section aria-label="feed-placeholder">Feed module placeholder</section>;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Request failed';
}
