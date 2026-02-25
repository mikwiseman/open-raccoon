defmodule RaccoonShared.Repo.Migrations.CreateUserFollows do
  use Ecto.Migration

  def change do
    create table(:user_follows, primary_key: false) do
      add :id, :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      add :follower_id, references(:users, type: :binary_id), null: false
      add :following_id, references(:users, type: :binary_id), null: false

      timestamps(type: :utc_datetime_usec, updated_at: false)
    end

    create unique_index(:user_follows, [:follower_id, :following_id])
    create index(:user_follows, [:follower_id])
    create index(:user_follows, [:following_id])
  end
end
