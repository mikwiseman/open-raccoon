defmodule RaccoonChat.Delivery do
  @moduledoc """
  Message delivery pipeline: validate -> persist -> broadcast.

  All messages flow through this module regardless of sender type.
  The pipeline:
    1. Validate conversation exists
    2. Persist message to PostgreSQL
    3. Update conversation's last_message_at
    4. Broadcast via PubSub to conversation topic
    5. Notify user channels for badge counts
  """

  alias RaccoonShared.Repo
  alias RaccoonChat.Message
  alias RaccoonChat.Conversation
  alias RaccoonChat.ConversationMember
  import Ecto.Query

  @doc """
  Send a message in a conversation.

  ## Parameters
    - conversation_id: UUID of the conversation
    - sender_id: UUID of the sending user/agent
    - params: Map with "sender_type", "type", "content", "metadata" keys

  ## Returns
    - {:ok, %Message{}} on success
    - {:error, reason} on failure
  """
  def send_message(conversation_id, sender_id, params) do
    attrs = %{
      conversation_id: conversation_id,
      sender_id: sender_id,
      sender_type: Map.get(params, "sender_type", "human"),
      type: Map.get(params, "type", "text"),
      content: Map.get(params, "content", %{}),
      metadata: Map.get(params, "metadata", %{})
    }

    Repo.transaction(fn ->
      # 1. Validate conversation exists
      conversation = Repo.get!(Conversation, conversation_id)

      # 2. Persist message
      case %Message{} |> Message.changeset(attrs) |> Repo.insert() do
        {:ok, message} ->
          # 3. Update conversation's last_message_at
          conversation
          |> Ecto.Changeset.change(last_message_at: message.created_at)
          |> Repo.update!()

          # 4. Broadcast via PubSub (conversation channel picks this up)
          Phoenix.PubSub.broadcast(
            RaccoonGateway.PubSub,
            "conversation:#{conversation_id}",
            {:new_message, message}
          )

          # 5. Notify user channels for badge counts
          notify_conversation_updated(conversation_id)

          message

        {:error, changeset} ->
          Repo.rollback(changeset)
      end
    end)
  end

  defp notify_conversation_updated(conversation_id) do
    members =
      from(cm in ConversationMember, where: cm.conversation_id == ^conversation_id)
      |> Repo.all()

    Enum.each(members, fn member ->
      Phoenix.PubSub.broadcast(
        RaccoonGateway.PubSub,
        "user:#{member.user_id}",
        {:conversation_updated, %{conversation_id: conversation_id}}
      )
    end)
  end
end
