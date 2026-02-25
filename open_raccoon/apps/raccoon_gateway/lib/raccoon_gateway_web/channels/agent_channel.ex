defmodule RaccoonGatewayWeb.AgentChannel do
  use RaccoonGatewayWeb, :channel

  @impl true
  def join("agent:" <> _conversation_id, _payload, socket) do
    # TODO: Verify user has access to this agent conversation
    {:ok, socket}
  end

  @impl true
  def handle_in("approval_decision", payload, socket) do
    broadcast(socket, "approval_decision", payload)
    {:noreply, socket}
  end
end
