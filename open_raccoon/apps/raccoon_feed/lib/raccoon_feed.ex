defmodule RaccoonFeed do
  @moduledoc """
  Feed context: feed items, likes, follows, trending.
  """

  alias RaccoonShared.Repo
  alias RaccoonFeed.{FeedItem, FeedItemReference, FeedLike, UserFollow}
  import Ecto.Query

  # --- Feed Items ---

  def submit_item(attrs) do
    Repo.transaction(fn ->
      {:ok, _ref} =
        %FeedItemReference{}
        |> FeedItemReference.changeset(%{
          reference_id: attrs[:reference_id] || attrs["reference_id"],
          reference_type: attrs[:reference_type] || attrs["reference_type"]
        })
        |> Repo.insert(on_conflict: :nothing, conflict_target: [:reference_id, :reference_type])

      %FeedItem{}
      |> FeedItem.changeset(attrs)
      |> Repo.insert()
    end)
  end

  def get_feed_item(id), do: Repo.get(FeedItem, id)

  def list_feed(opts \\ []) do
    limit = Keyword.get(opts, :limit, 50)

    from(fi in FeedItem,
      order_by: [desc: fi.quality_score, desc: fi.created_at],
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
      order_by: [desc: fi.created_at],
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
