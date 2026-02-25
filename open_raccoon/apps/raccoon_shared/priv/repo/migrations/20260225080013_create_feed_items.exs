defmodule RaccoonShared.Repo.Migrations.CreateFeedItems do
  use Ecto.Migration

  def change do
    create table(:feed_items, primary_key: false) do
      add :id, :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      add :creator_id, references(:users, type: :binary_id), null: false
      add :type, :string, size: 16, null: false
      add :reference_id, :binary_id, null: false
      add :reference_type, :string, size: 16, null: false
      add :title, :string, size: 255
      add :description, :text
      add :thumbnail_url, :text
      add :quality_score, :float, default: 0
      add :trending_score, :float, default: 0
      add :like_count, :integer, default: 0
      add :fork_count, :integer, default: 0
      add :view_count, :integer, default: 0

      timestamps(type: :utc_datetime_usec)
    end

    create index(:feed_items, [:creator_id])
    create index(:feed_items, [:trending_score], order: :desc, name: :idx_feed_trending)
    create index(:feed_items, [:quality_score], order: :desc, name: :idx_feed_quality)
    create index(:feed_items, [:created_at], order: :desc, name: :idx_feed_created)

    execute """
    ALTER TABLE feed_items ADD CHECK (type IN ('agent_showcase', 'page_showcase', 'tool_showcase', 'remix', 'creation'))
    """, ""

    execute """
    ALTER TABLE feed_items ADD CHECK (reference_type IN ('agent', 'page', 'tool'))
    """, ""

    execute """
    ALTER TABLE feed_items
      ADD CONSTRAINT fk_feed_reference_registry
      FOREIGN KEY (reference_id, reference_type)
      REFERENCES feed_item_references (reference_id, reference_type)
    """, "ALTER TABLE feed_items DROP CONSTRAINT IF EXISTS fk_feed_reference_registry"
  end
end
