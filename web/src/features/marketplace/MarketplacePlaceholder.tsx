'use client';

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { WaiAgentsApi } from '@/lib/api';
import type { SessionUser } from '@/lib/state/session-store';
import type {
  AgentRating,
  MarketplaceAgent,
  MarketplaceAgentProfileResponse,
  MarketplaceCategory,
} from '@/lib/types';
import { toIsoLocal } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type MarketplaceViewProps = {
  api: WaiAgentsApi;
  currentUser: SessionUser;
  onOpenConversation: (conversationId: string) => void;
};

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const DEBOUNCE_MS = 300;

const FALLBACK_CATEGORIES = [
  'Coding & Development',
  'Writing & Content',
  'Data & Analysis',
  'Creative & Design',
  'Productivity',
  'Education',
  'Other',
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Request failed';
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function agentAccentColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 55%)`;
}

/* ------------------------------------------------------------------ */
/*  StarRating (display only)                                          */
/* ------------------------------------------------------------------ */

function StarDisplay({ rating, count }: { rating: number; count: number }) {
  return (
    <span className="mp-star-display">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={star <= Math.round(rating) ? 'mp-star filled' : 'mp-star'}
          viewBox="0 0 20 20"
          width="14"
          height="14"
        >
          <title>{`${star} star`}</title>
          <path d="M10 1.5l2.47 5.01 5.53.8-4 3.9.94 5.49L10 14.26 5.06 16.7 6 11.21l-4-3.9 5.53-.8z" />
        </svg>
      ))}
      <span className="mp-rating-text">{rating.toFixed(1)}</span>
      <span className="mp-rating-count">({count})</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  StarSelector (interactive)                                         */
/* ------------------------------------------------------------------ */

function StarSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  return (
    <span
      className="mp-star-selector"
      onMouseLeave={() => setHovered(0)}
      role="radiogroup"
      aria-label="Rating"
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className="mp-star-btn"
          onMouseEnter={() => setHovered(star)}
          onClick={() => onChange(star)}
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
        >
          <svg
            className={star <= display ? 'mp-star filled' : 'mp-star'}
            viewBox="0 0 20 20"
            width="22"
            height="22"
          >
            <title>{`${star} star`}</title>
            <path d="M10 1.5l2.47 5.01 5.53.8-4 3.9.94 5.49L10 14.26 5.06 16.7 6 11.21l-4-3.9 5.53-.8z" />
          </svg>
        </button>
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  SVG Icons                                                          */
/* ------------------------------------------------------------------ */

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <title>Search</title>
      <circle cx="7" cy="7" r="5" />
      <line x1="11" y1="11" x2="14" y2="14" />
    </svg>
  );
}

function ChatBubbleIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
      <title>Chat</title>
      <path d="M8 1C4.13 1 1 3.58 1 6.75c0 1.77 1.03 3.36 2.66 4.42L3 14l3.34-1.52c.54.1 1.1.15 1.66.15 3.87 0 7-2.58 7-5.75S11.87 1 8 1z" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <title>Back</title>
      <line x1="13" y1="8" x2="3" y2="8" />
      <polyline points="7 4 3 8 7 12" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  MarketplaceView                                                    */
/* ------------------------------------------------------------------ */

export function MarketplaceView({ api, currentUser, onOpenConversation }: MarketplaceViewProps) {
  /* --- state --- */
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [agents, setAgents] = useState<MarketplaceAgent[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [selected, setSelected] = useState<MarketplaceAgent | null>(null);
  const [profile, setProfile] = useState<MarketplaceAgentProfileResponse | null>(null);
  const [ratings, setRatings] = useState<AgentRating[]>([]);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingReview, setRatingReview] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [startingConversation, setStartingConversation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const detail = useMemo(() => profile?.agent ?? selected, [profile?.agent, selected]);

  /* --- debounce search input --- */
  const handleSearchInput = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(value);
    }, DEBOUNCE_MS);
  }, []);

  /* --- load marketplace agents --- */
  const loadMarketplace = useCallback(
    async (nextCursor?: string | null) => {
      setLoading(true);
      setError(null);

      try {
        const response = debouncedQuery.trim()
          ? await api.searchMarketplace(debouncedQuery.trim(), {
              limit: 20,
              cursor: nextCursor ?? undefined,
            })
          : await api.listMarketplace({ limit: 20, cursor: nextCursor ?? undefined });

        setAgents((previous) => {
          if (!nextCursor) {
            return response.items;
          }
          const ids = new Set(previous.map((a) => a.id));
          const merged = [...previous];
          response.items.forEach((a) => {
            if (!ids.has(a.id)) {
              merged.push(a);
            }
          });
          return merged;
        });

        setCursor(response.page_info.next_cursor);
        setHasMore(response.page_info.has_more);

        if (!nextCursor && response.items.length > 0) {
          setSelected(response.items[0]);
        }
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [api, debouncedQuery],
  );

  /* --- effects --- */
  useEffect(() => {
    void loadMarketplace();
  }, [loadMarketplace]);

  useEffect(() => {
    void api
      .marketplaceCategories()
      .then((res) => {
        setCategories(res.categories.map((c: MarketplaceCategory) => c.name));
      })
      .catch(() => {
        setCategories(FALLBACK_CATEGORIES);
      });
  }, [api]);

  useEffect(() => {
    if (!selected) {
      setProfile(null);
      setRatings([]);
      return;
    }
    setLoadingProfile(true);
    void api
      .marketplaceAgent(selected.slug)
      .then((res) => {
        setProfile(res);
        setRatings(res.ratings);
      })
      .catch((err) => {
        setError(getErrorMessage(err));
      })
      .finally(() => {
        setLoadingProfile(false);
      });
  }, [api, selected]);

  /* --- clear info after 4s --- */
  useEffect(() => {
    if (!info) return;
    const t = setTimeout(() => setInfo(null), 4000);
    return () => clearTimeout(t);
  }, [info]);

  /* --- category filter --- */
  const filteredAgents = useMemo(() => {
    if (activeCategory === 'All') return agents;
    return agents.filter(
      (a) => (a.category ?? 'Other').toLowerCase() === activeCategory.toLowerCase(),
    );
  }, [agents, activeCategory]);

  /* --- actions --- */
  const submitRating = async (event: FormEvent) => {
    event.preventDefault();
    if (!detail || ratingValue === 0) return;

    setSubmittingRating(true);
    try {
      const res = await api.rateAgent(detail.id, ratingValue, ratingReview.trim() || undefined);
      setInfo(`Saved rating ${res.rating.rating}/5`);
      setRatingReview('');
      setRatingValue(0);
      setRatings((prev) => [
        {
          id: res.rating.id,
          user_id: currentUser.id,
          rating: res.rating.rating,
          review: res.rating.review,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmittingRating(false);
    }
  };

  const startConversation = async () => {
    if (!detail) return;
    setStartingConversation(true);
    try {
      const res = await api.startAgentConversation(detail.id);
      onOpenConversation(res.conversation.id);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setStartingConversation(false);
    }
  };

  const allCategories = ['All', ...categories];

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <section className="market-layout" aria-label="marketplace-module">
      {/* Header */}
      <header className="panel-header compact">
        <h2>Marketplace</h2>
        <p>
          {loading
            ? 'Loading agents...'
            : `${filteredAgents.length} agent${filteredAgents.length !== 1 ? 's' : ''}`}
        </p>
      </header>

      {/* Banners */}
      {info && <p className="success-banner">{info}</p>}
      {error && <p className="error-banner">{error}</p>}

      <div className="market-grid">
        {/* --- LEFT: search, pills, agent cards --- */}
        <div className="mp-left-panel">
          {/* Search bar */}
          <div className="input-group">
            <span className="input-icon">
              <SearchIcon />
            </span>
            <input
              value={query}
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder="Search agents..."
              aria-label="Search agents"
            />
          </div>

          {/* Category pills */}
          <div className="mp-pill-row">
            {allCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={activeCategory === cat ? 'mp-pill active' : 'mp-pill'}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Agent card grid */}
          <div className="mp-card-grid">
            {filteredAgents.map((agent) => (
              <button
                key={agent.id}
                type="button"
                className={detail?.id === agent.id ? 'mp-agent-card selected' : 'mp-agent-card'}
                onClick={() => setSelected(agent)}
              >
                <div className="mp-agent-card-header">
                  <span className="mp-avatar" style={{ borderColor: agentAccentColor(agent.name) }}>
                    {agent.avatar_url ? (
                      <img src={agent.avatar_url} alt={agent.name} />
                    ) : (
                      getInitials(agent.name)
                    )}
                  </span>
                  <div className="mp-agent-card-meta">
                    <span className="mp-agent-name">{agent.name}</span>
                    <span className="mp-category-badge">{agent.category || 'Other'}</span>
                  </div>
                </div>
                <p className="mp-agent-desc">{agent.description || 'No description available.'}</p>
                <div className="mp-agent-card-footer">
                  <StarDisplay rating={agent.average_rating} count={agent.rating_count} />
                  <span className="mp-usage">
                    <ChatBubbleIcon /> {agent.usage_count}
                  </span>
                </div>
              </button>
            ))}

            {filteredAgents.length === 0 && !loading && (
              <p className="mp-empty">
                No agents found{activeCategory !== 'All' ? ` in "${activeCategory}"` : ''}.
              </p>
            )}
          </div>

          {/* Load more */}
          {hasMore && (
            <button
              type="button"
              className="btn-primary mp-load-more"
              onClick={() => void loadMarketplace(cursor)}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Load more'}
            </button>
          )}
        </div>

        {/* --- RIGHT: agent profile panel --- */}
        <aside className="mp-profile-panel" aria-label="agent-profile-panel">
          {detail ? (
            <>
              {/* Back button (mobile) */}
              <button
                type="button"
                className="mp-back-btn"
                onClick={() => {
                  setSelected(null);
                  setProfile(null);
                }}
              >
                <ArrowLeftIcon /> Back to list
              </button>

              {/* Profile header */}
              <div className="mp-profile-header">
                <span
                  className="mp-avatar mp-avatar-lg"
                  style={{ borderColor: agentAccentColor(detail.name) }}
                >
                  {detail.avatar_url ? (
                    <img src={detail.avatar_url} alt={detail.name} />
                  ) : (
                    getInitials(detail.name)
                  )}
                </span>
                <div className="mp-profile-title">
                  <h3>{detail.name}</h3>
                  <span className="mp-creator">by {detail.creator_id.slice(0, 8)}</span>
                </div>
              </div>

              <div className="mp-profile-meta-row">
                <span className="mp-category-badge">{detail.category || 'Other'}</span>
                <StarDisplay rating={detail.average_rating} count={detail.rating_count} />
              </div>

              {/* Start Conversation button */}
              <button
                type="button"
                className="btn-primary mp-start-btn"
                onClick={() => void startConversation()}
                disabled={startingConversation}
              >
                {startingConversation ? 'Starting...' : 'Start Conversation'}
              </button>

              {loadingProfile ? (
                <div className="mp-profile-loading">
                  <div className="skeleton" style={{ height: 16, width: '80%' }} />
                  <div className="skeleton" style={{ height: 16, width: '60%' }} />
                  <div className="skeleton" style={{ height: 16, width: '70%' }} />
                </div>
              ) : (
                <>
                  {/* About */}
                  <section className="mp-section">
                    <h4>About</h4>
                    <p className="mp-about-text">
                      {detail.description || 'No description provided.'}
                    </p>
                  </section>

                  {/* Details */}
                  <section className="mp-section">
                    <h4>Details</h4>
                    <div className="mp-detail-rows">
                      <div className="mp-detail-row">
                        <span className="mp-detail-label">Model</span>
                        <span className="mp-detail-value">{detail.model || 'Default'}</span>
                      </div>
                      <div className="mp-detail-row">
                        <span className="mp-detail-label">Usage Count</span>
                        <span className="mp-detail-value">{detail.usage_count}</span>
                      </div>
                      <div className="mp-detail-row">
                        <span className="mp-detail-label">Visibility</span>
                        <span className="mp-detail-value">{detail.visibility}</span>
                      </div>
                    </div>
                  </section>

                  {/* Rating section */}
                  <section className="mp-section">
                    <h4>Rate this agent</h4>
                    <form className="mp-rating-form" onSubmit={submitRating}>
                      <StarSelector value={ratingValue} onChange={setRatingValue} />
                      <textarea
                        className="mp-review-input"
                        value={ratingReview}
                        onChange={(e) => setRatingReview(e.target.value)}
                        placeholder="Write a review (optional)..."
                        rows={3}
                      />
                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={ratingValue === 0 || submittingRating}
                      >
                        {submittingRating ? 'Submitting...' : 'Submit Review'}
                      </button>
                    </form>
                  </section>

                  {/* Recent ratings */}
                  {ratings.length > 0 && (
                    <section className="mp-section">
                      <h4>Recent Ratings</h4>
                      <ul className="mp-ratings-list">
                        {ratings.map((r) => (
                          <li key={r.id} className="mp-rating-item">
                            <div className="mp-rating-item-header">
                              <StarDisplay rating={r.rating} count={0} />
                              <span className="mp-rating-date">{toIsoLocal(r.created_at)}</span>
                            </div>
                            {r.review && <p className="mp-rating-review">{r.review}</p>}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                </>
              )}
            </>
          ) : (
            <div className="mp-empty-profile">
              <p>Select an agent to view its profile.</p>
            </div>
          )}
        </aside>
      </div>

      {/* Marketplace-specific styles */}
      <style>{marketplaceStyles}</style>
    </section>
  );
}

export function MarketplacePlaceholder() {
  return <section aria-label="marketplace-placeholder">Marketplace module placeholder</section>;
}

/* ------------------------------------------------------------------ */
/*  Scoped Styles                                                      */
/* ------------------------------------------------------------------ */

const marketplaceStyles = `
/* Left panel */
.mp-left-panel {
  display: grid;
  gap: var(--space-4);
  align-content: start;
  overflow-y: auto;
  max-height: calc(100vh - 180px);
  padding-right: var(--space-2);
}

/* Category pills */
.mp-pill-row {
  display: flex;
  gap: var(--space-2);
  overflow-x: auto;
  padding-bottom: var(--space-1);
  -ms-overflow-style: none;
  scrollbar-width: thin;
}

.mp-pill {
  flex-shrink: 0;
  border: 1px solid var(--color-border-primary);
  border-radius: var(--radius-full);
  padding: var(--space-1) var(--space-3);
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  color: var(--color-text-secondary);
  background: var(--color-bg-tertiary);
  cursor: pointer;
  transition: all var(--duration-normal) var(--ease-default);
  white-space: nowrap;
}

.mp-pill:hover {
  border-color: var(--color-text-tertiary);
  color: var(--color-text-primary);
  background: var(--color-bg-tertiary);
}

.mp-pill.active {
  background: var(--color-accent-primary);
  color: #FFFFFF;
  border-color: var(--color-accent-primary);
}

/* Agent card grid — 2 cols on desktop, 1 on mobile */
.mp-card-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3);
}

@media (max-width: 1100px) {
  .mp-card-grid {
    grid-template-columns: 1fr;
  }
}

/* Agent card */
.mp-agent-card {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-4);
  border: 1px solid var(--color-border-primary);
  border-radius: var(--radius-xl);
  background: var(--color-bg-elevated);
  text-align: left;
  cursor: pointer;
  transition: all var(--duration-normal) var(--ease-default);
  width: 100%;
}

.mp-agent-card:hover {
  border-color: var(--color-text-tertiary);
  box-shadow: var(--shadow-sm);
  background: var(--color-bg-elevated);
}

.mp-agent-card.selected {
  border-color: var(--color-accent-primary);
  background: var(--color-accent-subtle);
}

.mp-agent-card-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.mp-agent-card-meta {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.mp-agent-name {
  font-size: var(--text-md);
  font-weight: var(--weight-medium);
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mp-agent-desc {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  line-height: var(--leading-normal);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0;
}

.mp-agent-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

/* Avatar */
.mp-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-full);
  border: 2px solid var(--color-accent-primary);
  background: var(--color-accent-subtle);
  color: var(--color-accent-primary);
  font-weight: var(--weight-semibold);
  font-size: var(--text-sm);
  flex-shrink: 0;
  overflow: hidden;
}

.mp-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mp-avatar.mp-avatar-lg {
  width: 72px;
  height: 72px;
  font-size: var(--text-xl);
  border-width: 3px;
}

/* Category badge */
.mp-category-badge {
  display: inline-block;
  padding: 1px var(--space-2);
  border-radius: var(--radius-full);
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  white-space: nowrap;
}

/* Star display */
.mp-star-display {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.mp-star {
  fill: var(--color-bg-tertiary);
  stroke: var(--color-border-primary);
  stroke-width: 0.5;
}

.mp-star.filled {
  fill: #F59E0B;
  stroke: #F59E0B;
  stroke-width: 0.5;
}

.mp-rating-text {
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  color: var(--color-text-primary);
  margin-left: 2px;
}

.mp-rating-count {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

/* Usage count */
.mp-usage {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

/* Load more */
.mp-load-more {
  width: 100%;
}

/* Empty state */
.mp-empty {
  grid-column: 1 / -1;
  text-align: center;
  color: var(--color-text-tertiary);
  padding: var(--space-8) 0;
  font-size: var(--text-sm);
}

/* ====== Profile Panel ====== */

.mp-profile-panel {
  display: grid;
  gap: var(--space-4);
  align-content: start;
  overflow-y: auto;
  max-height: calc(100vh - 180px);
  border: 1px solid var(--color-border-primary);
  border-radius: var(--radius-xl);
  background: var(--color-bg-elevated);
  padding: var(--space-5);
}

.mp-back-btn {
  display: none;
  align-items: center;
  gap: var(--space-2);
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  padding: 0;
  cursor: pointer;
}

.mp-back-btn:hover {
  color: var(--color-text-primary);
  background: transparent;
}

@media (max-width: 1100px) {
  .mp-back-btn {
    display: inline-flex;
  }
}

.mp-profile-header {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.mp-profile-title {
  display: grid;
  gap: 2px;
}

.mp-profile-title h3 {
  font-size: var(--text-xl);
  font-weight: var(--weight-semibold);
  color: var(--color-text-primary);
  margin: 0;
}

.mp-creator {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.mp-profile-meta-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

/* Start conversation button */
.mp-start-btn {
  width: 100%;
  height: 48px;
  font-size: var(--text-base);
  font-weight: var(--weight-semibold);
}

/* Profile sections */
.mp-section {
  display: grid;
  gap: var(--space-2);
}

.mp-section h4 {
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  color: var(--color-text-primary);
  margin: 0;
}

.mp-about-text {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: var(--leading-relaxed);
  margin: 0;
}

/* Details key-value */
.mp-detail-rows {
  display: grid;
  gap: var(--space-1);
}

.mp-detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-border-secondary);
}

.mp-detail-row:last-child {
  border-bottom: none;
}

.mp-detail-label {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.mp-detail-value {
  font-size: var(--text-xs);
  color: var(--color-text-primary);
  font-weight: var(--weight-medium);
}

/* Star selector */
.mp-star-selector {
  display: inline-flex;
  gap: 2px;
}

.mp-star-btn {
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}

.mp-star-btn:hover {
  background: transparent;
  transform: scale(1.1);
}

/* Rating form */
.mp-rating-form {
  display: grid;
  gap: var(--space-3);
}

.mp-review-input {
  min-height: 80px;
  resize: vertical;
  border-radius: var(--radius-lg);
}

/* Ratings list */
.mp-ratings-list {
  display: grid;
  gap: var(--space-2);
  list-style: none;
  padding: 0;
  margin: 0;
}

.mp-rating-item {
  display: grid;
  gap: var(--space-1);
  padding: var(--space-3);
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius-lg);
  background: var(--color-bg-secondary);
}

.mp-rating-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mp-rating-date {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.mp-rating-review {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin: 0;
}

/* Empty profile */
.mp-empty-profile {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

.mp-empty-profile p {
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
}

/* Profile loading skeleton */
.mp-profile-loading {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-4) 0;
}
`;
