defmodule RaccoonFeed.Trending do
  @moduledoc """
  Trending score calculation for feed items.

  Formula: (likes * 3 + forks * 5 + views * 0.1) / (hours_since_posted + 2)^1.5

  - Fork weight (*5): Forks signal high value
  - Like weight (*3): Likes signal appreciation
  - View weight (*0.1): Views alone don't drive trending
  - Gravity factor (^1.5): Older items decay in trending
  - Recalculated every 15 minutes via Oban scheduled job
  """

  alias RaccoonShared.Repo
  alias RaccoonFeed.FeedItem
  import Ecto.Query

  @trending_window_days 7

  @doc """
  Calculate trending score for a single feed item.
  """
  @spec calculate_score(FeedItem.t()) :: float()
  def calculate_score(%FeedItem{} = item) do
    hours_since_posted = hours_since(item.inserted_at)
    numerator = item.like_count * 3 + item.fork_count * 5 + item.view_count * 0.1
    denominator = :math.pow(hours_since_posted + 2, 1.5)

    Float.round(numerator / denominator, 6)
  end

  @doc """
  Batch update trending scores for all feed items from the last 7 days.
  Uses a single SQL UPDATE for efficiency.
  """
  @spec recalculate_all() :: {integer(), nil}
  def recalculate_all do
    cutoff = DateTime.utc_now() |> DateTime.add(-@trending_window_days * 24 * 3600, :second)

    # Use a raw SQL update with the trending formula for efficiency.
    # This avoids loading all items into memory.
    Repo.query!(
      """
      UPDATE feed_items
      SET trending_score = (
        (like_count * 3 + fork_count * 5 + view_count * 0.1)
        / POWER(EXTRACT(EPOCH FROM (NOW() - inserted_at)) / 3600.0 + 2, 1.5)
      ),
      updated_at = NOW()
      WHERE inserted_at >= $1
      """,
      [cutoff]
    )

    # Return the count of updated rows
    count =
      from(fi in FeedItem, where: fi.inserted_at >= ^cutoff, select: count(fi.id))
      |> Repo.one()

    {count, nil}
  end

  @doc """
  Get top N trending feed items.
  """
  @spec top_trending(pos_integer()) :: [FeedItem.t()]
  def top_trending(limit \\ 50) do
    from(fi in FeedItem,
      where: fi.trending_score > 0,
      order_by: [desc: fi.trending_score],
      limit: ^limit
    )
    |> Repo.all()
  end

  # --- Private ---

  defp hours_since(datetime) do
    now = DateTime.utc_now()
    diff_seconds = DateTime.diff(now, datetime, :second)
    max(0.0, diff_seconds / 3600.0)
  end
end
