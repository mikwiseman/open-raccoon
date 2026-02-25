defmodule RaccoonShared.Repo.Migrations.CreateFeedLikes do
  use Ecto.Migration

  def change do
    create table(:feed_likes, primary_key: false) do
      add :id, :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      add :feed_item_id, references(:feed_items, type: :binary_id, on_delete: :delete_all), null: false
      add :user_id, references(:users, type: :binary_id), null: false

      timestamps(type: :utc_datetime_usec, updated_at: false)
    end

    create unique_index(:feed_likes, [:feed_item_id, :user_id])
    create index(:feed_likes, [:user_id])
  end
end
