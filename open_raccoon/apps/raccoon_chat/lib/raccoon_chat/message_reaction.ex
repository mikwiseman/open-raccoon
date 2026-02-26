defmodule RaccoonChat.MessageReaction do
  @moduledoc """
  Message reaction schema (emoji reactions).
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "message_reactions" do
    belongs_to(:message, RaccoonChat.Message)
    belongs_to(:user, RaccoonAccounts.User)

    field(:emoji, :string)

    timestamps(type: :utc_datetime_usec, updated_at: false)
  end

  def changeset(reaction, attrs) do
    reaction
    |> cast(attrs, [:message_id, :user_id, :emoji])
    |> validate_required([:message_id, :user_id, :emoji])
    |> validate_length(:emoji, max: 32)
    |> unique_constraint([:message_id, :user_id, :emoji])
    |> foreign_key_constraint(:message_id)
    |> foreign_key_constraint(:user_id)
  end
end
