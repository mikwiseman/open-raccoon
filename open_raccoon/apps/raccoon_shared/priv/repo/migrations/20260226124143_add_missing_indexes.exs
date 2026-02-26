defmodule RaccoonShared.Repo.Migrations.AddMissingIndexes do
  use Ecto.Migration

  def change do
    # agents.created_at for listing by recency
    create index(:agents, [:inserted_at], name: :idx_agents_created_at)

    # bridge_connections (user_id, status) composite index
    create index(:bridge_connections, [:user_id, :status], name: :idx_bridge_connections_user_status)
  end
end
