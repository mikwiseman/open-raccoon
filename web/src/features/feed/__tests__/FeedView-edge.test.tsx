import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { WaiAgentsApi } from '@/lib/api/services';
import type { SessionUser } from '@/lib/state/session-store';
import type { FeedItem } from '@/lib/types';
import { FeedView } from '../FeedView';

/* ------------------------------------------------------------------ */
/*  Fixtures                                                           */
/* ------------------------------------------------------------------ */

function makeFeedItem(overrides: Partial<FeedItem> = {}): FeedItem {
  return {
    id: 'feed-1',
    creator_id: 'user-2',
    type: 'agent',
    reference_id: 'agent-1',
    reference_type: 'agent',
    title: 'Cool AI Agent',
    description: 'An amazing agent for coding',
    thumbnail_url: null,
    quality_score: 8.5,
    trending_score: 7.2,
    like_count: 42,
    fork_count: 5,
    view_count: 200,
    created_at: '2026-03-10T12:00:00Z',
    updated_at: '2026-03-10T12:00:00Z',
    creator: {
      id: 'user-2',
      username: 'bob',
      display_name: 'Bob Builder',
      avatar_url: null,
    },
    liked_by_me: false,
    ...overrides,
  };
}

const currentUser: SessionUser = {
  id: 'user-1',
  username: 'alice',
  display_name: 'Alice',
  email: 'alice@test.com',
  avatar_url: null,
  bio: null,
};

function createMockApi(overrides: Partial<WaiAgentsApi> = {}): WaiAgentsApi {
  return {
    listFeed: vi.fn().mockResolvedValue({
      items: [
        makeFeedItem(),
        makeFeedItem({
          id: 'feed-2',
          title: 'Writing Assistant',
          description: 'Helps write better',
          like_count: 20,
          fork_count: 3,
          view_count: 100,
          creator: { id: 'user-3', username: 'carol', display_name: 'Carol', avatar_url: null },
        }),
      ],
      page_info: { next_cursor: null, has_more: false },
    }),
    likeFeedItem: vi.fn().mockResolvedValue({ status: 'liked' }),
    unlikeFeedItem: vi.fn().mockResolvedValue(undefined),
    forkAgent: vi.fn().mockResolvedValue({ agent: { id: 'forked' } }),
    ...overrides,
  } as unknown as WaiAgentsApi;
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('FeedView edge cases', () => {
  let api: WaiAgentsApi;

  beforeEach(() => {
    api = createMockApi();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  /* ---- Tab rendering ---- */

  it('renders all four feed tabs', () => {
    render(<FeedView api={api} currentUser={currentUser} />);
    expect(screen.getByRole('tab', { name: 'For You' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Trending' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Following' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'New' })).toBeInTheDocument();
  });

  it('sets "For You" tab as active by default', () => {
    render(<FeedView api={api} currentUser={currentUser} />);
    const forYouTab = screen.getByRole('tab', { name: 'For You' });
    expect(forYouTab.getAttribute('aria-selected')).toBe('true');
  });

  /* ---- Tab switching ---- */

  it('switches active tab when clicking Trending', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<FeedView api={api} currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('Cool AI Agent')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('tab', { name: 'Trending' }));
    expect(screen.getByRole('tab', { name: 'Trending' }).getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(screen.getByRole('tab', { name: 'For You' }).getAttribute('aria-selected')).toBe(
      'false',
    );
  });

  it('fetches data for Following tab when clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<FeedView api={api} currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('Cool AI Agent')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('tab', { name: 'Following' }));
    await waitFor(() => {
      expect(api.listFeed).toHaveBeenCalledWith('following', expect.any(Object));
    });
  });

  it('fetches data for New tab when clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<FeedView api={api} currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('Cool AI Agent')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('tab', { name: 'New' }));
    await waitFor(() => {
      expect(api.listFeed).toHaveBeenCalledWith('new', expect.any(Object));
    });
  });

  it('uses cached data when switching back to a previously loaded tab', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<FeedView api={api} currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('Cool AI Agent')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('tab', { name: 'Trending' }));
    await waitFor(() => {
      expect(api.listFeed).toHaveBeenCalledWith('trending', expect.any(Object));
    });

    await user.click(screen.getByRole('tab', { name: 'For You' }));

    await waitFor(() => {
      const forYouCalls = (api.listFeed as ReturnType<typeof vi.fn>).mock.calls.filter(
        (c: unknown[]) => c[0] === 'for_you',
      );
      expect(forYouCalls.length).toBe(1);
    });
  });

  /* ---- Loading state ---- */

  it('displays skeleton loader cards during initial load', () => {
    const slowApi = createMockApi({
      listFeed: vi.fn().mockReturnValue(new Promise(() => {})),
    });
    render(<FeedView api={slowApi} currentUser={currentUser} />);
    const skeletons = document.querySelectorAll('.feed-skeleton');
    expect(skeletons.length).toBe(6);
  });

  it('skeleton cards have aria-hidden for accessibility', () => {
    const slowApi = createMockApi({
      listFeed: vi.fn().mockReturnValue(new Promise(() => {})),
    });
    render(<FeedView api={slowApi} currentUser={currentUser} />);
    const skeletons = document.querySelectorAll('.feed-skeleton');
    for (const skeleton of skeletons) {
      expect(skeleton.getAttribute('aria-hidden')).toBe('true');
    }
  });

  /* ---- Empty state ---- */

  it('shows "Nothing here yet" for empty feed', async () => {
    const emptyApi = createMockApi({
      listFeed: vi.fn().mockResolvedValue({
        items: [],
        page_info: { next_cursor: null, has_more: false },
      }),
    });
    render(<FeedView api={emptyApi} currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
    });
  });

  /* ---- Feed items rendering ---- */

  it('renders feed items with titles', async () => {
    render(<FeedView api={api} currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('Cool AI Agent')).toBeInTheDocument();
      expect(screen.getByText('Writing Assistant')).toBeInTheDocument();
    });
  });

  it('renders feed item descriptions', async () => {
    render(<FeedView api={api} currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('An amazing agent for coding')).toBeInTheDocument();
      expect(screen.getByText('Helps write better')).toBeInTheDocument();
    });
  });

  it('renders like counts for each feed item', async () => {
    render(<FeedView api={api} currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('20')).toBeInTheDocument();
    });
  });

  it('renders fork counts for each feed item', async () => {
    render(<FeedView api={api} currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  it('renders creator name in card', async () => {
    render(<FeedView api={api} currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('Bob Builder')).toBeInTheDocument();
      expect(screen.getByText('Carol')).toBeInTheDocument();
    });
  });

  it('renders creator initials when no avatar', async () => {
    render(<FeedView api={api} currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getAllByText('BB').length).toBeGreaterThan(0);
    });
  });

  it('renders thumbnail image when provided', async () => {
    const thumbApi = createMockApi({
      listFeed: vi.fn().mockResolvedValue({
        items: [makeFeedItem({ thumbnail_url: 'https://example.com/thumb.jpg' })],
        page_info: { next_cursor: null, has_more: false },
      }),
    });
    render(<FeedView api={thumbApi} currentUser={currentUser} />);
    await waitFor(() => {
      const img = screen.getByAltText('Cool AI Agent');
      expect(img).toHaveAttribute('src', 'https://example.com/thumb.jpg');
    });
  });

  it('renders type icon placeholder when no thumbnail', async () => {
    render(<FeedView api={api} currentUser={currentUser} />);
    await waitFor(() => {
      const typeIcons = document.querySelectorAll('.feed-card-thumb-placeholder');
      expect(typeIcons.length).toBeGreaterThan(0);
    });
  });

  it('renders fallback title when item has no title', async () => {
    const noTitleApi = createMockApi({
      listFeed: vi.fn().mockResolvedValue({
        items: [makeFeedItem({ id: 'feed-no-title', title: null })],
        page_info: { next_cursor: null, has_more: false },
      }),
    });
    render(<FeedView api={noTitleApi} currentUser={currentUser} />);
    await waitFor(() => {
      const titleEl = document.querySelector('.feed-card-title');
      expect(titleEl).not.toBeNull();
      expect(titleEl?.textContent).toContain('feed-no-');
    });
  });

  it('shows "Unknown" when creator data is missing', async () => {
    const noCreatorApi = createMockApi({
      listFeed: vi.fn().mockResolvedValue({
        items: [makeFeedItem({ creator: undefined })],
        page_info: { next_cursor: null, has_more: false },
      }),
    });
    render(<FeedView api={noCreatorApi} currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getAllByText('Unknown').length).toBeGreaterThan(0);
    });
  });

  it('shows username when display_name is null', async () => {
    const usernameOnlyApi = createMockApi({
      listFeed: vi.fn().mockResolvedValue({
        items: [
          makeFeedItem({
            creator: { id: 'user-x', username: 'xenomorph', display_name: null, avatar_url: null },
          }),
        ],
        page_info: { next_cursor: null, has_more: false },
      }),
    });
    render(<FeedView api={usernameOnlyApi} currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getAllByText('xenomorph').length).toBeGreaterThan(0);
    });
  });

  /* ---- Like button ---- */

  it('toggles like state optimistically when clicking like button', async () => {
    const singleApi = createMockApi({
      listFeed: vi.fn().mockResolvedValue({
        items: [makeFeedItem({ liked_by_me: false, like_count: 10 })],
        page_info: { next_cursor: null, has_more: false },
      }),
    });
    render(<FeedView api={singleApi} currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('Cool AI Agent')).toBeInTheDocument();
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const likeBtn = screen.getByText('10').closest('button')!;
    await user.click(likeBtn);

    await waitFor(() => {
      expect(screen.getByText('11')).toBeInTheDocument();
    });
    expect(singleApi.likeFeedItem).toHaveBeenCalledWith('feed-1');
  });

  it('unlikes when already liked', async () => {
    const likedApi = createMockApi({
      listFeed: vi.fn().mockResolvedValue({
        items: [makeFeedItem({ liked_by_me: true, like_count: 10 })],
        page_info: { next_cursor: null, has_more: false },
      }),
    });
    render(<FeedView api={likedApi} currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('Cool AI Agent')).toBeInTheDocument();
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const likeBtn = screen.getByText('10').closest('button')!;
    await user.click(likeBtn);

    await waitFor(() => {
      expect(screen.getByText('9')).toBeInTheDocument();
    });
    expect(likedApi.unlikeFeedItem).toHaveBeenCalledWith('feed-1');
  });

  it('reverts like count on API failure', async () => {
    const failLikeApi = createMockApi({
      listFeed: vi.fn().mockResolvedValue({
        items: [makeFeedItem({ liked_by_me: false, like_count: 10 })],
        page_info: { next_cursor: null, has_more: false },
      }),
      likeFeedItem: vi.fn().mockRejectedValue(new Error('Like failed')),
    });
    render(<FeedView api={failLikeApi} currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('Cool AI Agent')).toBeInTheDocument();
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const likeBtn = screen.getByText('10').closest('button')!;
    await user.click(likeBtn);

    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument();
    });
    expect(screen.getByText('Like failed')).toBeInTheDocument();
  });

  it('like-pop animation class is applied during animation', async () => {
    const singleApi = createMockApi({
      listFeed: vi.fn().mockResolvedValue({
        items: [makeFeedItem({ liked_by_me: false, like_count: 10 })],
        page_info: { next_cursor: null, has_more: false },
      }),
    });
    render(<FeedView api={singleApi} currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('Cool AI Agent')).toBeInTheDocument();
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const likeBtn = screen.getByText('10').closest('button')!;
    await user.click(likeBtn);

    expect(likeBtn.classList.contains('like-pop')).toBe(true);
  });

  it('cleans up like animation timer on unmount', async () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    const singleApi = createMockApi({
      listFeed: vi.fn().mockResolvedValue({
        items: [makeFeedItem({ liked_by_me: false, like_count: 10 })],
        page_info: { next_cursor: null, has_more: false },
      }),
    });
    const { unmount } = render(<FeedView api={singleApi} currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('Cool AI Agent')).toBeInTheDocument();
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const likeBtn = screen.getByText('10').closest('button')!;
    await user.click(likeBtn);

    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  /* ---- Fork button ---- */

  it('calls forkAgent when fork action is clicked in detail panel', async () => {
    render(<FeedView api={api} currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('Cool AI Agent')).toBeInTheDocument();
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByText('Cool AI Agent'));

    await waitFor(() => {
      const forkBtn = document.querySelector('.feed-detail-actions .feed-action-btn:nth-child(2)');
      expect(forkBtn).not.toBeNull();
    });

    const forkBtn = document.querySelector('.feed-detail-actions .feed-action-btn:nth-child(2)')!;
    await user.click(forkBtn as HTMLElement);
    await waitFor(() => {
      expect(api.forkAgent).toHaveBeenCalledWith('agent-1');
    });
  });

  it('increments fork count after successful fork', async () => {
    const singleApi = createMockApi({
      listFeed: vi.fn().mockResolvedValue({
        items: [makeFeedItem({ fork_count: 5 })],
        page_info: { next_cursor: null, has_more: false },
      }),
    });
    render(<FeedView api={singleApi} currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('Cool AI Agent')).toBeInTheDocument();
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByText('Cool AI Agent'));

    await waitFor(() => {
      const forkBtn = document.querySelector('.feed-detail-actions .feed-action-btn:nth-child(2)');
      expect(forkBtn).not.toBeNull();
    });
    const forkBtn = document.querySelector('.feed-detail-actions .feed-action-btn:nth-child(2)')!;
    await user.click(forkBtn as HTMLElement);

    await waitFor(() => {
      expect(screen.getByText('6')).toBeInTheDocument();
    });
  });

  it('shows error when fork fails', async () => {
    const failForkApi = createMockApi({
      forkAgent: vi.fn().mockRejectedValue(new Error('Fork denied')),
    });
    render(<FeedView api={failForkApi} currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('Cool AI Agent')).toBeInTheDocument();
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByText('Cool AI Agent'));

    await waitFor(() => {
      const forkBtn = document.querySelector('.feed-detail-actions .feed-action-btn:nth-child(2)');
      expect(forkBtn).not.toBeNull();
    });
    const forkBtn = document.querySelector('.feed-detail-actions .feed-action-btn:nth-child(2)')!;
    await user.click(forkBtn as HTMLElement);

    await waitFor(() => {
      expect(screen.getByText('Fork denied')).toBeInTheDocument();
    });
  });

  /* ---- Error state ---- */

  it('shows error banner when feed API fails', async () => {
    const errApi = createMockApi({
      listFeed: vi.fn().mockRejectedValue(new Error('Server error 500')),
    });
    render(<FeedView api={errApi} currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('Server error 500')).toBeInTheDocument();
    });
  });

  it('hides error banner when switching tabs after error', async () => {
    const errApi = createMockApi({
      listFeed: vi
        .fn()
        .mockRejectedValueOnce(new Error('First load failed'))
        .mockResolvedValue({
          items: [makeFeedItem()],
          page_info: { next_cursor: null, has_more: false },
        }),
    });
    render(<FeedView api={errApi} currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('First load failed')).toBeInTheDocument();
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByRole('tab', { name: 'Trending' }));

    await waitFor(() => {
      expect(screen.queryByText('First load failed')).not.toBeInTheDocument();
    });
  });

  /* ---- Load more ---- */

  it('shows "Load more" button when has_more is true', async () => {
    const pagedApi = createMockApi({
      listFeed: vi.fn().mockResolvedValue({
        items: [makeFeedItem()],
        page_info: { next_cursor: 'cursor-2', has_more: true },
      }),
    });
    render(<FeedView api={pagedApi} currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('Load more')).toBeInTheDocument();
    });
  });

  it('does not show "Load more" when has_more is false', async () => {
    render(<FeedView api={api} currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('Cool AI Agent')).toBeInTheDocument();
    });
    expect(screen.queryByText('Load more')).not.toBeInTheDocument();
  });

  it('loads more items when Load more button is clicked', async () => {
    const pagedApi = createMockApi({
      listFeed: vi
        .fn()
        .mockResolvedValueOnce({
          items: [makeFeedItem({ id: 'feed-1', title: 'First Agent' })],
          page_info: { next_cursor: 'cursor-2', has_more: true },
        })
        .mockResolvedValueOnce({
          items: [makeFeedItem({ id: 'feed-3', title: 'Third Agent' })],
          page_info: { next_cursor: null, has_more: false },
        }),
    });
    render(<FeedView api={pagedApi} currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('First Agent')).toBeInTheDocument();
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByText('Load more'));

    await waitFor(() => {
      expect(screen.getByText('Third Agent')).toBeInTheDocument();
    });
    expect(screen.getByText('First Agent')).toBeInTheDocument();
  });

  it('shows "Loading..." and disables button while loading more', async () => {
    const pagedApi = createMockApi({
      listFeed: vi
        .fn()
        .mockResolvedValueOnce({
          items: [makeFeedItem()],
          page_info: { next_cursor: 'cursor-2', has_more: true },
        })
        .mockReturnValueOnce(new Promise(() => {})),
    });
    render(<FeedView api={pagedApi} currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('Load more')).toBeInTheDocument();
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByText('Load more'));

    await waitFor(() => {
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      const btn = screen.getByText('Loading...').closest('button');
      expect(btn).toBeDisabled();
    });
  });

  it('deduplicates feed items with the same id when loading more', async () => {
    const dupeApi = createMockApi({
      listFeed: vi
        .fn()
        .mockResolvedValueOnce({
          items: [makeFeedItem({ id: 'feed-1', title: 'Agent Alpha' })],
          page_info: { next_cursor: 'c2', has_more: true },
        })
        .mockResolvedValueOnce({
          items: [
            makeFeedItem({ id: 'feed-1', title: 'Agent Alpha' }),
            makeFeedItem({ id: 'feed-2', title: 'Agent Beta' }),
          ],
          page_info: { next_cursor: null, has_more: false },
        }),
    });
    render(<FeedView api={dupeApi} currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('Agent Alpha')).toBeInTheDocument();
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByText('Load more'));

    await waitFor(() => {
      expect(screen.getByText('Agent Beta')).toBeInTheDocument();
    });
    expect(screen.getAllByText('Agent Alpha').length).toBe(1);
  });

  /* ---- Detail panel ---- */

  it('shows detail panel with stats when a feed item is selected', async () => {
    render(<FeedView api={api} currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('Cool AI Agent')).toBeInTheDocument();
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByText('Cool AI Agent'));

    await waitFor(() => {
      const statsLabels = document.querySelectorAll('.feed-detail-stat-label');
      const labels = Array.from(statsLabels).map((el) => el.textContent);
      expect(labels).toContain('Views');
      expect(labels).toContain('Quality');
      expect(labels).toContain('Trending');
    });
  });

  it('shows quality score in detail panel', async () => {
    render(<FeedView api={api} currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('Cool AI Agent')).toBeInTheDocument();
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByText('Cool AI Agent'));

    await waitFor(() => {
      expect(screen.getByText('8.5')).toBeInTheDocument();
    });
  });

  it('shows type badge in detail panel', async () => {
    render(<FeedView api={api} currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('Cool AI Agent')).toBeInTheDocument();
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByText('Cool AI Agent'));

    await waitFor(() => {
      const badge = document.querySelector('.feed-type-badge');
      expect(badge).toBeInTheDocument();
      expect(badge?.textContent).toBe('agent');
    });
  });

  it('shows share button in detail panel', async () => {
    render(<FeedView api={api} currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('Cool AI Agent')).toBeInTheDocument();
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByText('Cool AI Agent'));

    await waitFor(() => {
      const shareBtn = document.querySelector('.feed-detail-actions .feed-action-btn:nth-child(3)');
      expect(shareBtn).not.toBeNull();
      expect(shareBtn?.textContent).toContain('Share');
    });
  });

  it('clears selected item when switching tabs', async () => {
    render(<FeedView api={api} currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('Cool AI Agent')).toBeInTheDocument();
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByText('Cool AI Agent'));
    await waitFor(() => {
      expect(screen.getByText('Views')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('tab', { name: 'Trending' }));
    await waitFor(() => {
      expect(screen.getByText('Select an item to view details')).toBeInTheDocument();
    });
  });

  it('shows "Like" text when not liked in detail panel', async () => {
    const singleApi = createMockApi({
      listFeed: vi.fn().mockResolvedValue({
        items: [makeFeedItem({ liked_by_me: false })],
        page_info: { next_cursor: null, has_more: false },
      }),
    });
    render(<FeedView api={singleApi} currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('Cool AI Agent')).toBeInTheDocument();
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByText('Cool AI Agent'));

    await waitFor(() => {
      const likeBtn = document.querySelector('.feed-detail-actions .feed-action-btn:nth-child(1)');
      expect(likeBtn).not.toBeNull();
      expect(likeBtn?.textContent).toContain('Like');
      expect(likeBtn?.textContent).not.toContain('Liked');
    });
  });

  it('shows "Liked" text when already liked in detail panel', async () => {
    const likedApi = createMockApi({
      listFeed: vi.fn().mockResolvedValue({
        items: [makeFeedItem({ liked_by_me: true })],
        page_info: { next_cursor: null, has_more: false },
      }),
    });
    render(<FeedView api={likedApi} currentUser={currentUser} />);
    await waitFor(() => {
      expect(screen.getByText('Cool AI Agent')).toBeInTheDocument();
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByText('Cool AI Agent'));

    await waitFor(() => {
      const likeBtn = document.querySelector('.feed-detail-actions .feed-action-btn:nth-child(1)');
      expect(likeBtn).not.toBeNull();
      expect(likeBtn?.textContent).toContain('Liked');
    });
  });
});
