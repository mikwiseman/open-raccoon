defmodule RaccoonGatewayWeb.ConversationChannel do
  use RaccoonGatewayWeb, :channel

  @impl true
  def join("conversation:" <> _conversation_id, _payload, socket) do
    # TODO: Verify user is a member of the conversation
    {:ok, socket}
  end

  @impl true
  def handle_in("new_message", payload, socket) do
    broadcast(socket, "new_message", payload)
    {:noreply, socket}
  end

  @impl true
  def handle_in("typing", payload, socket) do
    broadcast_from(socket, "typing", payload)
    {:noreply, socket}
  end

  @impl true
  def handle_in("read", payload, socket) do
    broadcast_from(socket, "read", payload)
    {:noreply, socket}
  end

  @impl true
  def handle_in("react", payload, socket) do
    broadcast(socket, "react", payload)
    {:noreply, socket}
  end
end
