defmodule RaccoonShared.Repo.Migrations.CreateConversations do
  use Ecto.Migration

  def change do
    create table(:conversations, primary_key: false) do
      add :id, :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      add :type, :string, size: 16, null: false
      add :title, :string, size: 255
      add :avatar_url, :text
      add :creator_id, references(:users, type: :binary_id)
      add :agent_id, references(:agents, type: :binary_id)
      add :bridge_id, references(:bridge_connections, type: :binary_id)
      add :metadata, :map, default: %{}
      add :last_message_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create index(:conversations, [:type])
    create index(:conversations, [:last_message_at])
    create index(:conversations, [:creator_id])

    execute """
    ALTER TABLE conversations ADD CHECK (type IN ('dm', 'group', 'agent', 'bridge'))
    """, ""

    execute """
    ALTER TABLE conversations ADD CHECK (
      (type = 'agent' AND agent_id IS NOT NULL AND bridge_id IS NULL) OR
      (type = 'bridge' AND bridge_id IS NOT NULL AND agent_id IS NULL) OR
      (type IN ('dm', 'group') AND agent_id IS NULL AND bridge_id IS NULL)
    )
    """, ""
  end
end
