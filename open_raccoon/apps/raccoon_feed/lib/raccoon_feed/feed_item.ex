defmodule RaccoonFeed.FeedItem do
  @moduledoc """
  Feed item schema for the social discovery feed.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "feed_items" do
    belongs_to :creator, RaccoonAccounts.User

    field :type, Ecto.Enum,
      values: [:agent_showcase, :page_showcase, :tool_showcase, :remix, :creation]

    field :reference_id, :binary_id
    field :reference_type, Ecto.Enum, values: [:agent, :page, :tool]
    field :title, :string
    field :description, :string
    field :thumbnail_url, :string
    field :quality_score, :float, default: 0.0
    field :trending_score, :float, default: 0.0
    field :like_count, :integer, default: 0
    field :fork_count, :integer, default: 0
    field :view_count, :integer, default: 0

    has_many :likes, RaccoonFeed.FeedLike

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(feed_item, attrs) do
    feed_item
    |> cast(attrs, [
      :creator_id, :type, :reference_id, :reference_type, :title,
      :description, :thumbnail_url
    ])
    |> validate_required([:creator_id, :type, :reference_id, :reference_type])
    |> validate_length(:title, max: 255)
    |> validate_inclusion(:type, [:agent_showcase, :page_showcase, :tool_showcase, :remix, :creation])
    |> validate_inclusion(:reference_type, [:agent, :page, :tool])
    |> foreign_key_constraint(:creator_id)
  end
end
