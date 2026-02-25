defmodule RaccoonFeed do
  @moduledoc """
  Feed context: feed items, likes, follows, trending, quality scoring, ranking.
  """

  alias RaccoonShared.Repo
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
  Get newest feed items.
  """
  def get_new(opts \\ []) do
    limit = Keyword.get(opts, :limit, 50)

    from(fi in FeedItem,
      where: fi.quality_score >= 0.3,
      order_by: [desc: fi.inserted_at],
      limit: ^limit
    )
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

    from(fi in FeedItem,
      order_by: [desc: fi.quality_score, desc: fi.inserted_at],
      limit: ^limit
    )
    |> Repo.all()
  end

  def list_trending(opts \\ []) do
    limit = Keyword.get(opts, :limit, 50)

    from(fi in FeedItem,
      order_by: [desc: fi.trending_score],
      limit: ^limit
    )
    |> Repo.all()
  end

  def list_new(opts \\ []) do
    limit = Keyword.get(opts, :limit, 50)

    from(fi in FeedItem,
      order_by: [desc: fi.inserted_at],
      limit: ^limit
    )
    |> Repo.all()
  end

  # --- Likes ---

  def like_item(feed_item_id, user_id) do
    Repo.transaction(fn ->
      {:ok, like} =
        %FeedLike{}
        |> FeedLike.changeset(%{feed_item_id: feed_item_id, user_id: user_id})
        |> Repo.insert()

      {1, _} =
        from(fi in FeedItem, where: fi.id == ^feed_item_id)
        |> Repo.update_all(inc: [like_count: 1])

      like
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

  def fork_item(_feed_item_id, _user_id) do
    # TODO: Implement fork logic based on reference_type
    {:error, :not_implemented}
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
end
