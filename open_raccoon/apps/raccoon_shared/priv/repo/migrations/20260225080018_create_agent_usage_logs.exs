defmodule RaccoonShared.Repo.Migrations.CreateAgentUsageLogs do
  use Ecto.Migration

  def change do
    create table(:agent_usage_logs, primary_key: false) do
      add :id, :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      add :user_id, :binary_id, null: false
      add :agent_id, :binary_id, null: false
      add :model, :string, null: false
      add :input_tokens, :integer, null: false, default: 0
      add :output_tokens, :integer, null: false, default: 0

      timestamps(type: :utc_datetime_usec, updated_at: false)
    end

    create index(:agent_usage_logs, [:user_id])
    create index(:agent_usage_logs, [:agent_id])
    create index(:agent_usage_logs, [:inserted_at])
  end
end
