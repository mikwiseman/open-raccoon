defmodule RaccoonFeed.FeedItemReference do
  @moduledoc """
  Polymorphic integrity registry for feed item references.
  Ensures referenced agents/pages/tools actually exist.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "feed_item_references" do
    field(:reference_id, :binary_id)
    field(:reference_type, Ecto.Enum, values: [:agent, :page, :tool])
    field(:exists_flag, :boolean, default: true)

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(ref, attrs) do
    ref
    |> cast(attrs, [:reference_id, :reference_type, :exists_flag])
    |> validate_required([:reference_id, :reference_type])
    |> validate_inclusion(:reference_type, [:agent, :page, :tool])
    |> unique_constraint([:reference_id, :reference_type])
  end
end
