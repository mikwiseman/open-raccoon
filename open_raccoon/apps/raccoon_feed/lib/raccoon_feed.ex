defmodule RaccoonFeed do
  @moduledoc """
  Feed context: feed items, likes, follows, trending, quality scoring, ranking.
  """

  alias RaccoonShared.Repo
  alias RaccoonShared.Pagination
  alias RaccoonFeed.{FeedItem, FeedLike, UserFollow}
  alias RaccoonFeed.{SubmissionPipeline, Trending, Ranking}
  import Ecto.Query

  # --- Feed Items (Pipeline-based submission) ---

  @doc """
  Submit a feed item through the full quality pipeline.
  Runs rate limit check, duplicate detection, and quality scoring.
  """
  def submit_item(attrs, opts \\ []) do
    SubmissionPipeline.submit(attrs, opts)
  end

  def get_feed_item(id), do: Repo.get(FeedItem, id)

  @doc """
  Get personalized "For You" feed for a user.
  Delegates to the Ranking module.
  """
  def get_feed(user_id, opts \\ []) do
    Ranking.personalized_feed(user_id, opts)
  end

  @doc """
  Get trending feed items. Delegates to the Trending module.
  """
  def get_trending(opts \\ []) do
    limit = Keyword.get(opts, :limit, 50)
    Trending.top_trending(limit)
  end

  @doc """
  Get feed items from creators the user follows.
  """
  def get_following(user_id, opts \\ []) do
    limit = Keyword.get(opts, :limit, 50)
    cursor = Keyword.get(opts, :cursor)

    following_ids =
      from(f in UserFollow,
        where: f.follower_id == ^user_id,
        select: f.following_id
      )

    from(fi in FeedItem,
      where: fi.creator_id in subquery(following_ids) and fi.quality_score >= 0.3,
      order_by: [desc: fi.inserted_at, desc: fi.id],
      limit: ^limit
    )
    |> apply_inserted_at_cursor(cursor)
    |> Repo.all()
  end

  @doc """
  Get newest feed items.
  """
  def get_new(opts \\ []) do
    limit = Keyword.get(opts, :limit, 50)
    cursor = Keyword.get(opts, :cursor)

    from(fi in FeedItem,
      where: fi.quality_score >= 0.3,
      order_by: [desc: fi.inserted_at, desc: fi.id],
      limit: ^limit
    )
    |> apply_inserted_at_cursor(cursor)
    |> Repo.all()
  end

  @doc """
  Recalculate trending scores for all recent items.
  Should be called periodically (every 15 minutes via Oban).
  """
  def recalculate_trending, do: Trending.recalculate_all()

  # Legacy list functions (kept for backward compatibility)

  def list_feed(opts \\ []) do
    limit = Keyword.get(opts, :limit, 50)
    cursor = Keyword.get(opts, :cursor)

    from(fi in FeedItem,
      order_by: [desc: fi.quality_score, desc: fi.inserted_at, desc: fi.id],
      limit: ^limit
    )
    |> apply_ranked_cursor(cursor, :quality_score)
    |> Repo.all()
  end

  def list_trending(opts \\ []) do
    limit = Keyword.get(opts, :limit, 50)
    cursor = Keyword.get(opts, :cursor)

    from(fi in FeedItem,
      order_by: [desc: fi.trending_score, desc: fi.inserted_at, desc: fi.id],
      limit: ^limit
    )
    |> apply_ranked_cursor(cursor, :trending_score)
    |> Repo.all()
  end

  def list_new(opts \\ []) do
    limit = Keyword.get(opts, :limit, 50)
    cursor = Keyword.get(opts, :cursor)

    from(fi in FeedItem,
      order_by: [desc: fi.inserted_at, desc: fi.id],
      limit: ^limit
    )
    |> apply_inserted_at_cursor(cursor)
    |> Repo.all()
  end

  # --- Likes ---

  def like_item(feed_item_id, user_id) do
    Repo.transaction(fn ->
      case %FeedLike{}
           |> FeedLike.changeset(%{feed_item_id: feed_item_id, user_id: user_id})
           |> Repo.insert() do
        {:ok, like} ->
          from(fi in FeedItem, where: fi.id == ^feed_item_id)
          |> Repo.update_all(inc: [like_count: 1])

          like

        {:error, changeset} ->
          Repo.rollback(changeset)
      end
    end)
  end

  def unlike_item(feed_item_id, user_id) do
    Repo.transaction(fn ->
      {deleted, _} =
        from(l in FeedLike,
          where: l.feed_item_id == ^feed_item_id and l.user_id == ^user_id
        )
        |> Repo.delete_all()

      if deleted > 0 do
        from(fi in FeedItem, where: fi.id == ^feed_item_id)
        |> Repo.update_all(inc: [like_count: -1])
      end

      :ok
    end)
  end

  @doc """
  Fork a feed item, creating a new item owned by the forking user.

  Copies the relevant fields from the original item, sets the forking user
  as the creator, records the fork chain in metadata, and increments the
  original item's fork_count.

  Returns `{:ok, new_feed_item}` or `{:error, reason}`.
  """
  def fork_item(feed_item_id, user_id) do
    Repo.transaction(fn ->
      case Repo.get(FeedItem, feed_item_id) do
        nil ->
          Repo.rollback(:not_found)

        original ->
          fork_attrs = %{
            creator_id: user_id,
            type: :remix,
            reference_id: original.reference_id,
            reference_type: original.reference_type,
            title: original.title,
            description: original.description,
            thumbnail_url: original.thumbnail_url
          }

          case %FeedItem{} |> FeedItem.changeset(fork_attrs) |> Repo.insert() do
            {:ok, forked_item} ->
              from(fi in FeedItem, where: fi.id == ^feed_item_id)
              |> Repo.update_all(inc: [fork_count: 1])

              forked_item

            {:error, changeset} ->
              Repo.rollback(changeset)
          end
      end
    end)
  end

  # --- Follows ---

  def follow_user(follower_id, following_id) do
    %UserFollow{}
    |> UserFollow.changeset(%{follower_id: follower_id, following_id: following_id})
    |> Repo.insert()
  end

  def unfollow_user(follower_id, following_id) do
    from(f in UserFollow,
      where: f.follower_id == ^follower_id and f.following_id == ^following_id
    )
    |> Repo.delete_all()
  end

  def list_following(user_id) do
    from(f in UserFollow,
      where: f.follower_id == ^user_id,
      preload: [:following]
    )
    |> Repo.all()
  end

  def list_followers(user_id) do
    from(f in UserFollow,
      where: f.following_id == ^user_id,
      preload: [:follower]
    )
    |> Repo.all()
  end

  defp apply_inserted_at_cursor(query, nil), do: query

  defp apply_inserted_at_cursor(query, cursor) do
    with {:ok, cursor_id} <- Pagination.decode_cursor(cursor),
         %FeedItem{inserted_at: cursor_inserted_at} <- Repo.get(FeedItem, cursor_id) do
      from(fi in query,
        where:
          fi.inserted_at < ^cursor_inserted_at or
            (fi.inserted_at == ^cursor_inserted_at and fi.id < ^cursor_id)
      )
    else
      _ -> query
    end
  end

  defp apply_ranked_cursor(query, nil, _metric), do: query

  defp apply_ranked_cursor(query, cursor, metric) do
    with {:ok, cursor_id} <- Pagination.decode_cursor(cursor),
         %FeedItem{} = cursor_item <- Repo.get(FeedItem, cursor_id) do
      metric_value = Map.get(cursor_item, metric)
      cursor_inserted_at = cursor_item.inserted_at

      from(fi in query,
        where:
          field(fi, ^metric) < ^metric_value or
            (field(fi, ^metric) == ^metric_value and fi.inserted_at < ^cursor_inserted_at) or
            (field(fi, ^metric) == ^metric_value and fi.inserted_at == ^cursor_inserted_at and
               fi.id < ^cursor_id)
      )
    else
      _ -> query
    end
  end
end
