defmodule RaccoonAgents.AgentUsageLog do
  @moduledoc """
  Schema for persisted agent token usage logs.

  Each row records a single agent execution's token consumption,
  allowing usage analytics and billing even after CostTracker restarts.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "agent_usage_logs" do
    field :user_id, :binary_id
    field :agent_id, :binary_id
    field :model, :string
    field :input_tokens, :integer
    field :output_tokens, :integer

    timestamps(type: :utc_datetime_usec, updated_at: false)
  end

  def changeset(log, attrs) do
    log
    |> cast(attrs, [:user_id, :agent_id, :model, :input_tokens, :output_tokens])
    |> validate_required([:user_id, :agent_id, :model, :input_tokens, :output_tokens])
    |> validate_number(:input_tokens, greater_than_or_equal_to: 0)
    |> validate_number(:output_tokens, greater_than_or_equal_to: 0)
  end
end
