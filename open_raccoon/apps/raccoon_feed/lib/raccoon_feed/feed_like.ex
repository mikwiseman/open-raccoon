defmodule RaccoonFeed.FeedLike do
  @moduledoc """
  Feed item like schema.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "feed_likes" do
    belongs_to :feed_item, RaccoonFeed.FeedItem
    belongs_to :user, RaccoonAccounts.User

    timestamps(type: :utc_datetime_usec, updated_at: false)
  end

  def changeset(like, attrs) do
    like
    |> cast(attrs, [:feed_item_id, :user_id])
    |> validate_required([:feed_item_id, :user_id])
    |> unique_constraint([:feed_item_id, :user_id])
    |> foreign_key_constraint(:feed_item_id)
    |> foreign_key_constraint(:user_id)
  end
end
