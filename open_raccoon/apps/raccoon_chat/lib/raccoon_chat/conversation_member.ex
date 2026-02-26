defmodule RaccoonChat.ConversationMember do
  @moduledoc """
  Conversation membership schema with roles.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "conversation_members" do
    belongs_to(:conversation, RaccoonChat.Conversation)
    belongs_to(:user, RaccoonAccounts.User)

    field(:role, Ecto.Enum, values: [:owner, :admin, :member], default: :member)
    field(:muted, :boolean, default: false)
    field(:last_read_at, :utc_datetime_usec)
    field(:joined_at, :utc_datetime_usec)
  end

  def changeset(member, attrs) do
    member
    |> cast(attrs, [:conversation_id, :user_id, :role, :muted, :last_read_at, :joined_at])
    |> validate_required([:conversation_id, :user_id])
    |> validate_inclusion(:role, [:owner, :admin, :member])
    |> unique_constraint([:conversation_id, :user_id])
    |> foreign_key_constraint(:conversation_id)
    |> foreign_key_constraint(:user_id)
  end
end
