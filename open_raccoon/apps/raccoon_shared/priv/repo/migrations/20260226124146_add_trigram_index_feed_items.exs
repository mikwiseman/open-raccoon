defmodule RaccoonShared.Repo.Migrations.AddTrigramIndexFeedItems do
  use Ecto.Migration

  def up do
    # pg_trgm extension is already enabled in 20260225080001_enable_extensions.exs
    execute """
    CREATE INDEX idx_feed_items_description_trgm
      ON feed_items
      USING gin (description gin_trgm_ops)
    """
  end

  def down do
    execute "DROP INDEX IF EXISTS idx_feed_items_description_trgm"
  end
end
