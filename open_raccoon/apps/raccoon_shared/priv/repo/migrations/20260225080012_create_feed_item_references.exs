defmodule RaccoonShared.Repo.Migrations.CreateFeedItemReferences do
  use Ecto.Migration

  def change do
    create table(:feed_item_references, primary_key: false) do
      add :id, :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      add :reference_id, :binary_id, null: false
      add :reference_type, :string, size: 16, null: false
      add :exists_flag, :boolean, null: false, default: true

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:feed_item_references, [:reference_id, :reference_type])

    execute "ALTER TABLE feed_item_references ADD CHECK (reference_type IN ('agent', 'page', 'tool'))", ""
  end
end
