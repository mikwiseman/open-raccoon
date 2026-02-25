defmodule RaccoonShared.Repo.Migrations.CreatePageVersions do
  use Ecto.Migration

  def change do
    create table(:page_versions, primary_key: false) do
      add :id, :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      add :page_id, references(:pages, type: :binary_id, on_delete: :delete_all), null: false
      add :version, :integer, null: false
      add :r2_path, :text, null: false
      add :changes, :text

      timestamps(type: :utc_datetime_usec, updated_at: false)
    end

    create unique_index(:page_versions, [:page_id, :version])
    create index(:page_versions, [:page_id])
  end
end
