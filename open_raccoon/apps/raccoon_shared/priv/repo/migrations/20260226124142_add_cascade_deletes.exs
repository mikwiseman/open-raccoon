defmodule RaccoonShared.Repo.Migrations.AddCascadeDeletes do
  use Ecto.Migration

  def up do
    # agents.creator_id: cascade delete when user is deleted
    drop constraint(:agents, "agents_creator_id_fkey")

    alter table(:agents) do
      modify :creator_id, references(:users, type: :binary_id, on_delete: :delete_all),
        null: false
    end

    # conversations.creator_id: nilify when user is deleted (keep conversations)
    drop constraint(:conversations, "conversations_creator_id_fkey")

    alter table(:conversations) do
      modify :creator_id, references(:users, type: :binary_id, on_delete: :nilify_all)
    end

    # pages.creator_id: cascade delete when user is deleted
    drop constraint(:pages, "pages_creator_id_fkey")

    alter table(:pages) do
      modify :creator_id, references(:users, type: :binary_id, on_delete: :delete_all),
        null: false
    end

    # conversation_members.user_id: cascade delete when user is deleted
    drop constraint(:conversation_members, "conversation_members_user_id_fkey")

    alter table(:conversation_members) do
      modify :user_id, references(:users, type: :binary_id, on_delete: :delete_all),
        null: false
    end
  end

  def down do
    drop constraint(:agents, "agents_creator_id_fkey")

    alter table(:agents) do
      modify :creator_id, references(:users, type: :binary_id), null: false
    end

    drop constraint(:conversations, "conversations_creator_id_fkey")

    alter table(:conversations) do
      modify :creator_id, references(:users, type: :binary_id)
    end

    drop constraint(:pages, "pages_creator_id_fkey")

    alter table(:pages) do
      modify :creator_id, references(:users, type: :binary_id), null: false
    end

    drop constraint(:conversation_members, "conversation_members_user_id_fkey")

    alter table(:conversation_members) do
      modify :user_id, references(:users, type: :binary_id), null: false
    end
  end
end
