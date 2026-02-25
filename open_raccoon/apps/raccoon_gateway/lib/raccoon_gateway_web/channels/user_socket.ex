defmodule RaccoonGatewayWeb.UserSocket do
  use Phoenix.Socket

  channel "conversation:*", RaccoonGatewayWeb.ConversationChannel
  channel "agent:*", RaccoonGatewayWeb.AgentChannel
  channel "user:*", RaccoonGatewayWeb.UserChannel

  @impl true
  def connect(_params, socket, _connect_info) do
    # TODO: JWT verification
    {:ok, socket}
  end

  @impl true
  def id(socket), do: "user_socket:#{socket.assigns[:user_id]}"
end
