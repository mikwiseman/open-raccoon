defmodule RaccoonShared.Repo.Migrations.EnableExtensions do
  use Ecto.Migration

  def change do
    execute "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"", "DROP EXTENSION IF EXISTS \"uuid-ossp\""
    execute "CREATE EXTENSION IF NOT EXISTS \"pgcrypto\"", "DROP EXTENSION IF EXISTS \"pgcrypto\""
    execute "CREATE EXTENSION IF NOT EXISTS \"vector\"", "DROP EXTENSION IF EXISTS \"vector\""
    execute "CREATE EXTENSION IF NOT EXISTS \"pg_trgm\"", "DROP EXTENSION IF EXISTS \"pg_trgm\""
  end
end
