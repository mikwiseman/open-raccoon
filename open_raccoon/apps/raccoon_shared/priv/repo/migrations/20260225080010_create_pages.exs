defmodule RaccoonShared.Repo.Migrations.CreatePages do
  use Ecto.Migration

  def change do
    create table(:pages, primary_key: false) do
      add :id, :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      add :creator_id, references(:users, type: :binary_id), null: false
      add :agent_id, references(:agents, type: :binary_id)
      add :conversation_id, references(:conversations, type: :binary_id)
      add :title, :string, size: 255, null: false
      add :slug, :string, size: 128, null: false
      add :description, :text
      add :thumbnail_url, :text
      add :r2_path, :text, null: false
      add :deploy_url, :text
      add :custom_domain, :text
      add :version, :integer, default: 1
      add :forked_from, references(:pages, type: :binary_id, column: :id)
      add :visibility, :string, size: 16, default: "public", null: false
      add :view_count, :bigint, default: 0

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:pages, [:creator_id, :slug])
    create index(:pages, [:creator_id])
    create index(:pages, [:deploy_url])

    execute "ALTER TABLE pages ADD CHECK (visibility IN ('public', 'unlisted', 'private'))", ""
    execute "ALTER TABLE pages ADD CHECK (version > 0)", ""
  end
end
