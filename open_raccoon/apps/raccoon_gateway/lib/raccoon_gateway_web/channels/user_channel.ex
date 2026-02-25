defmodule RaccoonGatewayWeb.UserChannel do
  use RaccoonGatewayWeb, :channel

  @impl true
  def join("user:" <> _user_id, _payload, socket) do
    # TODO: Verify the user_id matches the socket's authenticated user
    {:ok, socket}
  end
end
