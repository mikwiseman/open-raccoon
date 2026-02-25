defmodule RaccoonChat do
  @moduledoc """
  Chat context: conversations, messages, members, reactions.
  """

  alias RaccoonShared.Repo
  alias RaccoonChat.{Conversation, ConversationMember, Message, MessageReaction}
  import Ecto.Query

  # --- Conversations ---

  def create_conversation(attrs) do
    %Conversation{}
    |> Conversation.changeset(attrs)
    |> Repo.insert()
  end

  def get_conversation(id), do: Repo.get(Conversation, id)

  def get_conversation!(id), do: Repo.get!(Conversation, id)

  def update_conversation(%Conversation{} = conv, attrs) do
    conv |> Conversation.changeset(attrs) |> Repo.update()
  end

  def delete_conversation(%Conversation{} = conv) do
    Repo.delete(conv)
  end

  def list_user_conversations(user_id) do
    from(c in Conversation,
      join: m in ConversationMember,
      on: m.conversation_id == c.id,
      where: m.user_id == ^user_id,
      order_by: [desc: c.last_message_at],
      preload: [:members]
    )
    |> Repo.all()
  end

  # --- Messages ---

  @doc """
  Send a message through the delivery pipeline.

  Delegates to `RaccoonChat.Delivery.send_message/3` which handles validation,
  persistence, broadcasting, and notification.
  """
  defdelegate send_message(conversation_id, sender_id, params), to: RaccoonChat.Delivery

  def get_messages(conversation_id, opts \\ []) do
    limit = Keyword.get(opts, :limit, 50)

    from(m in Message,
      where: m.conversation_id == ^conversation_id,
      order_by: [desc: m.created_at],
      limit: ^(limit + 1)
    )
    |> Repo.all()
  end

  def get_message(id), do: Repo.get(Message, id)

  # --- Members ---

  @doc "Get a specific membership record for a user in a conversation."
  def get_membership(conversation_id, user_id) do
    Repo.get_by(ConversationMember, conversation_id: conversation_id, user_id: user_id)
  end

  def add_member(attrs) do
    %ConversationMember{}
    |> ConversationMember.changeset(attrs)
    |> Repo.insert()
  end

  def remove_member(conversation_id, user_id) do
    from(m in ConversationMember,
      where: m.conversation_id == ^conversation_id and m.user_id == ^user_id
    )
    |> Repo.delete_all()
  end

  def list_members(conversation_id) do
    from(m in ConversationMember,
      where: m.conversation_id == ^conversation_id,
      preload: [:user]
    )
    |> Repo.all()
  end

  # --- Reactions ---

  def add_reaction(attrs) do
    %MessageReaction{}
    |> MessageReaction.changeset(attrs)
    |> Repo.insert()
  end

  def remove_reaction(message_id, user_id, emoji) do
    from(r in MessageReaction,
      where: r.message_id == ^message_id and r.user_id == ^user_id and r.emoji == ^emoji
    )
    |> Repo.delete_all()
  end
end
