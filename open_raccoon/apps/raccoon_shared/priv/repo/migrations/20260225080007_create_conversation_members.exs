defmodule RaccoonShared.Repo.Migrations.CreateConversationMembers do
  use Ecto.Migration

  def change do
    create table(:conversation_members, primary_key: false) do
      add :id, :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      add :conversation_id, references(:conversations, type: :binary_id, on_delete: :delete_all), null: false
      add :user_id, references(:users, type: :binary_id), null: false
      add :role, :string, size: 16, default: "member", null: false
      add :muted, :boolean, default: false
      add :last_read_at, :utc_datetime_usec
      add :joined_at, :utc_datetime_usec, null: false, default: fragment("NOW()")
    end

    create unique_index(:conversation_members, [:conversation_id, :user_id])
    create index(:conversation_members, [:user_id])
    create index(:conversation_members, [:conversation_id])

    execute "ALTER TABLE conversation_members ADD CHECK (role IN ('owner', 'admin', 'member'))", ""
  end
end
