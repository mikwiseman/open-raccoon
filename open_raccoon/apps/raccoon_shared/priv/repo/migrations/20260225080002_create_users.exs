defmodule RaccoonShared.Repo.Migrations.CreateUsers do
  use Ecto.Migration

  def change do
    create table(:users, primary_key: false) do
      add :id, :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      add :username, :string, size: 32, null: false
      add :display_name, :string, size: 128
      add :email, :string, size: 255
      add :password_hash, :string, size: 255
      add :avatar_url, :text
      add :bio, :text
      add :status, :string, size: 16, default: "active", null: false
      add :role, :string, size: 16, default: "user", null: false
      add :settings, :map, default: %{}
      add :last_seen_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:users, [:username])
    create unique_index(:users, [:email])
    create index(:users, [:username])
    create index(:users, [:email])

    execute "ALTER TABLE users ADD CHECK (status IN ('active', 'suspended', 'deleted'))", ""
    execute "ALTER TABLE users ADD CHECK (role IN ('user', 'admin', 'moderator'))", ""
  end
end
