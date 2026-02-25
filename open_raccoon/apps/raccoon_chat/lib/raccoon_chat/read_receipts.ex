defmodule RaccoonChat.ReadReceipts do
  @moduledoc """
  Track read receipts per conversation member.

  Updates the `last_read_at` timestamp on the ConversationMember record
  to mark all messages up to a given point as read.
  """

  alias RaccoonShared.Repo
  alias RaccoonChat.ConversationMember
  import Ecto.Query

  @doc """
  Mark messages as read for a user in a conversation.

  Updates the member's last_read_at to the current UTC time.
  The message_id parameter is accepted for future per-message tracking
  but currently we use timestamp-based read tracking.
  """
  def mark_read(conversation_id, user_id, _message_id) do
    now = DateTime.utc_now()

    from(cm in ConversationMember,
      where: cm.conversation_id == ^conversation_id and cm.user_id == ^user_id
    )
    |> Repo.update_all(set: [last_read_at: now])

    :ok
  end

  @doc """
  Get the last read timestamp for a user in a conversation.

  Returns nil if the user is not a member or has never read any messages.
  """
  def last_read_at(conversation_id, user_id) do
    from(cm in ConversationMember,
      where: cm.conversation_id == ^conversation_id and cm.user_id == ^user_id,
      select: cm.last_read_at
    )
    |> Repo.one()
  end
end
