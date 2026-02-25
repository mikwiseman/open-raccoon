defmodule RaccoonGatewayWeb.UserChannel do
  @moduledoc """
  Per-user notification channel.

  Only the authenticated user can join their own channel.
  Server pushes (via PubSub from other parts of the system):
    - notification:          {type, data}
    - bridge_status:         {bridge_id, status}
    - conversation_updated:  {conversation}
  """

  use RaccoonGatewayWeb, :channel

  @impl true
  def join("user:" <> user_id, _params, socket) do
    if socket.assigns.user_id == user_id do
      {:ok, socket}
    else
      {:error, %{reason: "unauthorized"}}
    end
  end

  # Handle PubSub broadcasts forwarded to this channel process
  @impl true
  def handle_info({:conversation_updated, payload}, socket) do
    push(socket, "conversation_updated", payload)
    {:noreply, socket}
  end

  @impl true
  def handle_info({:notification, payload}, socket) do
    push(socket, "notification", payload)
    {:noreply, socket}
  end

  @impl true
  def handle_info({:bridge_status, payload}, socket) do
    push(socket, "bridge_status", payload)
    {:noreply, socket}
  end
end
