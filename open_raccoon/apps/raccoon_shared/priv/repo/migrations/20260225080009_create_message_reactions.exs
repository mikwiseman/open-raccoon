defmodule RaccoonShared.Repo.Migrations.CreateMessageReactions do
  use Ecto.Migration

  def change do
    create table(:message_reactions, primary_key: false) do
      add :id, :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      # No FK reference to messages: the messages table is range-partitioned via
      # raw SQL, so standard Ecto references/2 cannot target it.  Referential
      # integrity is enforced at the application layer.
      add :message_id, :binary_id, null: false
      add :user_id, references(:users, type: :binary_id), null: false
      add :emoji, :string, size: 32, null: false

      timestamps(type: :utc_datetime_usec, updated_at: false)
    end

    create unique_index(:message_reactions, [:message_id, :user_id, :emoji])
    create index(:message_reactions, [:message_id])
  end
end
