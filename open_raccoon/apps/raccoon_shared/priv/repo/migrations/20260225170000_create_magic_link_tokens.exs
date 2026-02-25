defmodule RaccoonShared.Repo.Migrations.CreateMagicLinkTokens do
  use Ecto.Migration

  def change do
    create table(:magic_link_tokens, primary_key: false) do
      add :id, :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      add :email, :string, null: false
      add :token, :string, null: false
      add :used, :boolean, default: false, null: false
      add :expires_at, :utc_datetime_usec, null: false
      timestamps(type: :utc_datetime_usec, updated_at: false)
    end

    create unique_index(:magic_link_tokens, [:token])
    create index(:magic_link_tokens, [:email])
    create index(:magic_link_tokens, [:expires_at])
  end
end
