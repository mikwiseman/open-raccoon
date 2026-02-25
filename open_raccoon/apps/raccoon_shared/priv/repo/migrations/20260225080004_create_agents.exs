defmodule RaccoonShared.Repo.Migrations.CreateAgents do
  use Ecto.Migration

  def change do
    create table(:agents, primary_key: false) do
      add :id, :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      add :creator_id, references(:users, type: :binary_id), null: false
      add :name, :string, size: 64, null: false
      add :slug, :string, size: 64, null: false
      add :description, :text
      add :avatar_url, :text
      add :system_prompt, :text, null: false
      add :model, :string, size: 64, null: false, default: "claude-sonnet-4-6"
      add :temperature, :float, default: 0.7
      add :max_tokens, :integer, default: 4096
      add :tools, :map, default: fragment("'[]'::jsonb")
      add :mcp_servers, :map, default: fragment("'[]'::jsonb")
      add :visibility, :string, size: 16, default: "private", null: false
      add :category, :string, size: 32
      add :usage_count, :bigint, default: 0
      add :rating_sum, :integer, default: 0
      add :rating_count, :integer, default: 0
      add :metadata, :map, default: %{}

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:agents, [:slug])
    create index(:agents, [:creator_id])
    create index(:agents, [:visibility])
    create index(:agents, [:category])

    execute "ALTER TABLE agents ADD CHECK (visibility IN ('public', 'unlisted', 'private'))", ""
    execute "ALTER TABLE agents ADD CHECK (temperature >= 0 AND temperature <= 1)", ""
    execute "ALTER TABLE agents ADD CHECK (max_tokens > 0)", ""
  end
end
