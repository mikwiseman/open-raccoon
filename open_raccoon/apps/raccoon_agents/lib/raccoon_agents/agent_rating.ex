defmodule RaccoonAgents.AgentRating do
  @moduledoc """
  Agent rating and review schema.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "agent_ratings" do
    belongs_to :agent, RaccoonAgents.Agent
    belongs_to :user, RaccoonAccounts.User

    field :rating, :integer
    field :review, :string

    timestamps(type: :utc_datetime_usec, updated_at: false)
  end

  def changeset(rating, attrs) do
    rating
    |> cast(attrs, [:agent_id, :user_id, :rating, :review])
    |> validate_required([:agent_id, :user_id, :rating])
    |> validate_number(:rating, greater_than_or_equal_to: 1, less_than_or_equal_to: 5)
    |> unique_constraint([:agent_id, :user_id])
    |> foreign_key_constraint(:agent_id)
    |> foreign_key_constraint(:user_id)
  end
end
