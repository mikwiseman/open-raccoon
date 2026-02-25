defmodule RaccoonFeed.Ranking do
  @moduledoc """
  Feed ranking for the "For You" personalized feed.

  Formula:
    final_score = quality * 0.3 + trending * 0.2 + recency * 0.2 + relevance * 0.2 + diversity * 0.1

  - quality: item's quality_score (0.0-1.0)
  - trending: normalized trending_score (0.0-1.0)
  - recency: exponential decay over 7 days (0.0-1.0)
  - relevance: based on user's follow list (0.0-1.0)
  - diversity: penalizes seeing same author repeatedly (0.0-1.0)
  """

  alias RaccoonShared.Repo
  alias RaccoonFeed.{FeedItem, UserFollow}
  import Ecto.Query

  @recency_half_life_hours 48.0
  @recency_window_days 7

  @doc """
  Build a personalized "For You" feed for a user.

  ## Parameters
  - `user_id` - The current user's ID
  - `opts` - Options: `:limit` (default 50), `:cursor` (for pagination)

  ## Returns
  A list of FeedItem structs ordered by personalized ranking score.
  """
  @spec personalized_feed(String.t(), keyword()) :: [FeedItem.t()]
  def personalized_feed(user_id, opts \\ []) do
    limit = Keyword.get(opts, :limit, 50)

    # Get user's follow list for relevance scoring
    following_ids = get_following_ids(user_id)

    # Get candidate items (quality threshold met, from last 7 days window + some evergreen)
    candidates = get_candidates(limit * 3)

    # Find max trending score for normalization
    max_trending =
      candidates
      |> Enum.map(& &1.trending_score)
      |> Enum.max(fn -> 1.0 end)

    max_trending = if max_trending == 0, do: 1.0, else: max_trending

    # Score and rank each candidate
    candidates
    |> Enum.with_index()
    |> Enum.map(fn {item, index} ->
      score = rank_item(item, following_ids, max_trending, index, candidates)
      {item, score}
    end)
    |> Enum.sort_by(fn {_item, score} -> score end, :desc)
    |> Enum.take(limit)
    |> Enum.map(fn {item, _score} -> item end)
  end

  @doc """
  Calculate recency score based on age. Uses exponential decay over 7 days.
  Returns a float between 0.0 and 1.0.
  """
  @spec recency_score(DateTime.t()) :: float()
  def recency_score(created_at) do
    hours_old = DateTime.diff(DateTime.utc_now(), created_at, :second) / 3600.0
    max_hours = @recency_window_days * 24.0

    if hours_old > max_hours do
      0.0
    else
      :math.exp(-0.693 * hours_old / @recency_half_life_hours)
    end
  end

  @doc """
  Calculate relevance score based on whether the user follows the item's creator.
  Returns 1.0 if following, 0.0 otherwise.
  """
  @spec relevance_score(FeedItem.t(), [String.t()]) :: float()
  def relevance_score(%FeedItem{} = item, following_ids) do
    if item.creator_id in following_ids, do: 1.0, else: 0.0
  end

  @doc """
  Calculate diversity score. Penalizes seeing the same author repeatedly in the feed.
  Looks at surrounding items to detect author clustering.
  Returns 1.0 (no penalty) down to 0.0 (heavy penalty).
  """
  @spec diversity_score(FeedItem.t(), integer(), [FeedItem.t()]) :: float()
  def diversity_score(%FeedItem{} = item, current_index, all_items) do
    # Check the 5 items before and after this position
    window_start = max(0, current_index - 5)
    window_end = min(length(all_items) - 1, current_index + 5)

    window_items =
      all_items
      |> Enum.slice(window_start..window_end)
      |> Enum.reject(fn i -> i.id == item.id end)

    same_author_count =
      Enum.count(window_items, fn i -> i.creator_id == item.creator_id end)

    # Each repeated author in the window reduces diversity score
    max(0.0, 1.0 - same_author_count * 0.25)
  end

  # --- Private ---

  defp rank_item(item, following_ids, max_trending, index, all_items) do
    quality = item.quality_score || 0.0
    trending_normalized = (item.trending_score || 0.0) / max_trending
    recency = recency_score(item.inserted_at)
    relevance = relevance_score(item, following_ids)
    diversity = diversity_score(item, index, all_items)

    quality * 0.3 +
      trending_normalized * 0.2 +
      recency * 0.2 +
      relevance * 0.2 +
      diversity * 0.1
  end

  defp get_following_ids(user_id) do
    from(f in UserFollow,
      where: f.follower_id == ^user_id,
      select: f.following_id
    )
    |> Repo.all()
  end

  defp get_candidates(limit) do
    from(fi in FeedItem,
      where: fi.quality_score >= 0.3,
      order_by: [desc: fi.inserted_at],
      limit: ^limit
    )
    |> Repo.all()
  end
end
