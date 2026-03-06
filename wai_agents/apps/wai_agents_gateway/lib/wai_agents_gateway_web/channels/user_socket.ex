defmodule WaiAgentsGatewayWeb.UserSocket do
  @moduledoc """
  WebSocket entry point. Authenticates via JWT token parameter.

  Connection: wss://api.wai-agents.com/socket?token=<jwt>

  Routes topics to channels:
    - conversation:* -> ConversationChannel
    - agent:*        -> AgentChannel
    - user:*         -> UserChannel
  """

  use Phoenix.Socket

  channel "conversation:*", WaiAgentsGatewayWeb.ConversationChannel
  channel "agent:*", WaiAgentsGatewayWeb.AgentChannel
  channel "user:*", WaiAgentsGatewayWeb.UserChannel

  @impl true
  def connect(%{"token" => token}, socket, _connect_info) do
    case WaiAgentsAccounts.Guardian.decode_and_verify(token, %{"typ" => "access"}) do
      {:ok, claims} ->
        case WaiAgentsAccounts.Guardian.resource_from_claims(claims) do
          {:ok, user} ->
            {:ok, socket |> assign(:current_user, user) |> assign(:user_id, user.id)}

          _ ->
            :error
        end

      _ ->
        :error
    end
  end

  def connect(_params, _socket, _connect_info), do: :error

  @impl true
  def id(socket), do: "user_socket:#{socket.assigns.user_id}"
end
