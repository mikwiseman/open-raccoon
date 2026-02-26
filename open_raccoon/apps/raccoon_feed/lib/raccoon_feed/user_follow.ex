defmodule RaccoonFeed.UserFollow do
  @moduledoc """
  User follow relationship schema.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "user_follows" do
    belongs_to(:follower, RaccoonAccounts.User)
    belongs_to(:following, RaccoonAccounts.User)

    timestamps(type: :utc_datetime_usec, updated_at: false)
  end

  def changeset(follow, attrs) do
    follow
    |> cast(attrs, [:follower_id, :following_id])
    |> validate_required([:follower_id, :following_id])
    |> unique_constraint([:follower_id, :following_id])
    |> foreign_key_constraint(:follower_id)
    |> foreign_key_constraint(:following_id)
    |> validate_not_self_follow()
  end

  defp validate_not_self_follow(changeset) do
    follower_id = get_field(changeset, :follower_id)
    following_id = get_field(changeset, :following_id)

    if follower_id && following_id && follower_id == following_id do
      add_error(changeset, :following_id, "cannot follow yourself")
    else
      changeset
    end
  end
end
