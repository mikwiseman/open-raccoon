defmodule RaccoonShared.Repo.Migrations.CreateIdempotencyKeys do
  use Ecto.Migration

  def change do
    create table(:idempotency_keys, primary_key: false) do
      add :id, :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      add :key, :string, null: false
      add :user_id, :binary_id, null: false
      add :response_code, :integer
      add :response_body, :map
      add :expires_at, :utc_datetime_usec, null: false

      timestamps(type: :utc_datetime_usec, updated_at: false)
    end

    create unique_index(:idempotency_keys, [:key, :user_id])
    create index(:idempotency_keys, [:expires_at])
  end
end
