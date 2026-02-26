defmodule RaccoonChat.Message do
  @moduledoc """
  Message schema. The underlying table is range-partitioned by created_at.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "messages" do
    belongs_to(:conversation, RaccoonChat.Conversation)
    belongs_to(:sender, RaccoonAccounts.User, foreign_key: :sender_id)

    field(:sender_type, Ecto.Enum, values: [:human, :agent, :bridge, :system])
    field(:type, Ecto.Enum, values: [:text, :media, :code, :embed, :system, :agent_status])
    field(:content, :map)
    field(:metadata, :map, default: %{})
    field(:edited_at, :utc_datetime_usec)
    field(:deleted_at, :utc_datetime_usec)

    has_many(:reactions, RaccoonChat.MessageReaction)

    # The migration creates `created_at` (not `inserted_at`) because the table
    # is range-partitioned by created_at.  Tell Ecto to use that column name.
    timestamps(type: :utc_datetime_usec, inserted_at: :created_at, updated_at: false)
  end

  def changeset(message, attrs) do
    message
    |> cast(attrs, [
      :conversation_id,
      :sender_id,
      :sender_type,
      :type,
      :content,
      :metadata,
      :edited_at,
      :deleted_at
    ])
    |> validate_required([:conversation_id, :sender_id, :sender_type, :type, :content])
    |> validate_inclusion(:sender_type, [:human, :agent, :bridge, :system])
    |> validate_inclusion(:type, [:text, :media, :code, :embed, :system, :agent_status])
    |> validate_text_content()
    |> foreign_key_constraint(:conversation_id)
    |> foreign_key_constraint(:sender_id)
  end

  @doc "Changeset for editing an existing message's content."
  def edit_changeset(message, attrs) do
    message
    |> cast(attrs, [:content, :edited_at])
    |> validate_required([:content, :edited_at])
    |> validate_text_content()
  end

  defp validate_text_content(changeset) do
    type = get_field(changeset, :type)
    content = get_field(changeset, :content)

    if type == :text && is_map(content) && content == %{} do
      add_error(changeset, :content, "cannot be empty for text messages")
    else
      changeset
    end
  end
end
