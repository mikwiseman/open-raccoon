defmodule RaccoonShared.Repo.Migrations.CreateBridgeConnections do
  use Ecto.Migration

  def change do
    create table(:bridge_connections, primary_key: false) do
      add :id, :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      add :user_id, references(:users, type: :binary_id), null: false
      add :platform, :string, size: 16, null: false
      add :method, :string, size: 16, null: false
      add :status, :string, size: 16, default: "disconnected", null: false
      add :encrypted_credentials, :binary
      add :metadata, :map, default: %{}
      add :last_sync_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:bridge_connections, [:user_id, :platform, :method])
    create index(:bridge_connections, [:user_id])
    create index(:bridge_connections, [:platform])

    execute "ALTER TABLE bridge_connections ADD CHECK (platform IN ('telegram', 'whatsapp', 'signal', 'discord'))", ""
    execute "ALTER TABLE bridge_connections ADD CHECK (method IN ('user_level', 'bot', 'cloud_api'))", ""
    execute "ALTER TABLE bridge_connections ADD CHECK (status IN ('connected', 'reconnecting', 'disconnected', 'error'))", ""
  end
end
