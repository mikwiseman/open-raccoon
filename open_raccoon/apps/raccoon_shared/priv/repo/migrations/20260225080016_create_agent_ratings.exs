defmodule RaccoonShared.Repo.Migrations.CreateAgentRatings do
  use Ecto.Migration

  def change do
    create table(:agent_ratings, primary_key: false) do
      add :id, :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      add :agent_id, references(:agents, type: :binary_id, on_delete: :delete_all), null: false
      add :user_id, references(:users, type: :binary_id), null: false
      add :rating, :smallint, null: false
      add :review, :text

      timestamps(type: :utc_datetime_usec, updated_at: false)
    end

    create unique_index(:agent_ratings, [:agent_id, :user_id])
    create index(:agent_ratings, [:agent_id])

    execute "ALTER TABLE agent_ratings ADD CHECK (rating BETWEEN 1 AND 5)", ""
  end
end
