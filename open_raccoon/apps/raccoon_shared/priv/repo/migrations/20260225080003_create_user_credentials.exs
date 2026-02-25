defmodule RaccoonShared.Repo.Migrations.CreateUserCredentials do
  use Ecto.Migration

  def change do
    create table(:user_credentials, primary_key: false) do
      add :id, :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :credential_id, :binary, null: false
      add :public_key, :binary, null: false
      add :sign_count, :bigint, default: 0
      add :name, :string, size: 255

      timestamps(type: :utc_datetime_usec, updated_at: false)
    end

    create unique_index(:user_credentials, [:credential_id])
    create index(:user_credentials, [:user_id])
  end
end
