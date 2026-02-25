defmodule RaccoonGatewayWeb.ConversationChannel do
  @moduledoc """
  Channel for real-time conversation events.

  Client -> Server events:
    - new_message: {content, type, metadata}
    - typing:      {is_typing: boolean}
    - read:        {message_id}
    - react:       {message_id, emoji}

  Server -> Client events:
    - new_message:     {message}
    - message_updated: {message}
    - typing:          {user_id, is_typing}
    - presence_state:  {users}
    - presence_diff:   {joins, leaves}
  """

  use RaccoonGatewayWeb, :channel

  alias RaccoonChat.Delivery
  alias RaccoonChat.Typing
  alias RaccoonChat.ReadReceipts
  alias RaccoonGatewayWeb.Presence

  @impl true
  def join("conversation:" <> conversation_id, _params, socket) do
    user_id = socket.assigns.user_id

    # Verify user is a member of this conversation
    case RaccoonChat.get_membership(conversation_id, user_id) do
      nil ->
        {:error, %{reason: "not_a_member"}}

      _member ->
        send(self(), :after_join)
        {:ok, assign(socket, :conversation_id, conversation_id)}
    end
  end

  @impl true
  def handle_info(:after_join, socket) do
    # Track presence for this user in the conversation
    {:ok, _} =
      Presence.track(socket, socket.assigns.user_id, %{
        online_at: inspect(System.system_time(:second)),
        status: "online"
      })

    # Push current presence state to the joining client
    push(socket, "presence_state", Presence.list(socket))

    {:noreply, socket}
  end

  # Handle PubSub broadcasts from Delivery pipeline
  @impl true
  def handle_info({:new_message, _message}, socket) do
    # Already broadcast by the channel's broadcast! call in handle_in
    # This handles messages from other sources (REST API, bridge workers)
    {:noreply, socket}
  end

  # Client sends new message
  @impl true
  def handle_in("new_message", payload, socket) do
    user_id = socket.assigns.user_id
    conversation_id = socket.assigns.conversation_id

    case Delivery.send_message(conversation_id, user_id, payload) do
      {:ok, message} ->
        broadcast!(socket, "new_message", message_json(message))
        {:reply, {:ok, message_json(message)}, socket}

      {:error, reason} ->
        {:reply, {:error, %{reason: format_error(reason)}}, socket}
    end
  end

  # Client typing indicator
  @impl true
  def handle_in("typing", %{"is_typing" => is_typing}, socket) do
    user_id = socket.assigns.user_id
    conversation_id = socket.assigns.conversation_id

    Typing.update(conversation_id, user_id, is_typing)
    broadcast_from!(socket, "typing", %{user_id: user_id, is_typing: is_typing})

    {:noreply, socket}
  end

  # Client read receipt
  @impl true
  def handle_in("read", %{"message_id" => message_id}, socket) do
    user_id = socket.assigns.user_id
    conversation_id = socket.assigns.conversation_id

    ReadReceipts.mark_read(conversation_id, user_id, message_id)

    {:noreply, socket}
  end

  # Client reaction
  @impl true
  def handle_in("react", %{"message_id" => message_id, "emoji" => emoji}, socket) do
    user_id = socket.assigns.user_id

    case RaccoonChat.add_reaction(%{message_id: message_id, user_id: user_id, emoji: emoji}) do
      {:ok, reaction} ->
        broadcast!(socket, "message_updated", %{
          message_id: message_id,
          reaction: reaction_json(reaction)
        })

        {:reply, :ok, socket}

      {:error, reason} ->
        {:reply, {:error, %{reason: format_error(reason)}}, socket}
    end
  end

  # --- Private helpers ---

  defp message_json(message) do
    %{
      id: message.id,
      conversation_id: message.conversation_id,
      sender_id: message.sender_id,
      sender_type: message.sender_type,
      type: message.type,
      content: message.content,
      metadata: message.metadata,
      created_at: message.created_at
    }
  end

  defp reaction_json(reaction) do
    %{
      id: reaction.id,
      message_id: reaction.message_id,
      user_id: reaction.user_id,
      emoji: reaction.emoji
    }
  end

  defp format_error(%Ecto.Changeset{} = changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, _opts} -> msg end)
  end

  defp format_error(reason) when is_binary(reason), do: reason
  defp format_error(reason), do: inspect(reason)
end
