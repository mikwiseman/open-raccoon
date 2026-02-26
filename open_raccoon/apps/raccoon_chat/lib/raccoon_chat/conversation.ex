defmodule RaccoonChat.Conversation do
  @moduledoc """
  Conversation schema supporting dm, group, agent, and bridge types.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "conversations" do
    field(:type, Ecto.Enum, values: [:dm, :group, :agent, :bridge])
    field(:title, :string)
    field(:avatar_url, :string)
    field(:metadata, :map, default: %{})
    field(:last_message_at, :utc_datetime_usec)

    belongs_to(:creator, RaccoonAccounts.User)
    # agent_id and bridge_id reference tables in sibling apps
    # Using plain fields to avoid circular umbrella dependencies
    field(:agent_id, :binary_id)
    field(:bridge_id, :binary_id)

    has_many(:members, RaccoonChat.ConversationMember)
    has_many(:messages, RaccoonChat.Message)

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(conversation, attrs) do
    conversation
    |> cast(attrs, [
      :type,
      :title,
      :avatar_url,
      :creator_id,
      :agent_id,
      :bridge_id,
      :metadata,
      :last_message_at
    ])
    |> validate_required([:type, :creator_id])
    |> validate_length(:title, max: 255)
    |> validate_inclusion(:type, [:dm, :group, :agent, :bridge])
    |> validate_type_constraints()
    |> foreign_key_constraint(:creator_id)
    |> foreign_key_constraint(:agent_id)
    |> foreign_key_constraint(:bridge_id)
  end

  defp validate_type_constraints(changeset) do
    type = get_field(changeset, :type)
    agent_id = get_field(changeset, :agent_id)
    bridge_id = get_field(changeset, :bridge_id)

    case type do
      :agent ->
        if is_nil(agent_id),
          do: add_error(changeset, :agent_id, "is required for agent conversations"),
          else:
            changeset
            |> then(fn cs ->
              if bridge_id,
                do: add_error(cs, :bridge_id, "must be nil for agent conversations"),
                else: cs
            end)

      :bridge ->
        if is_nil(bridge_id),
          do: add_error(changeset, :bridge_id, "is required for bridge conversations"),
          else:
            changeset
            |> then(fn cs ->
              if agent_id,
                do: add_error(cs, :agent_id, "must be nil for bridge conversations"),
                else: cs
            end)

      type when type in [:dm, :group] ->
        changeset
        |> then(fn cs ->
          if agent_id,
            do: add_error(cs, :agent_id, "must be nil for #{type} conversations"),
            else: cs
        end)
        |> then(fn cs ->
          if bridge_id,
            do: add_error(cs, :bridge_id, "must be nil for #{type} conversations"),
            else: cs
        end)

      _ ->
        changeset
    end
  end
end
