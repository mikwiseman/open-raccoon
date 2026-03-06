defmodule WaiAgentsGatewayWeb.Presence do
  @moduledoc """
  Phoenix Presence for tracking online users in conversations.

  Uses Phoenix's distributed presence tracking backed by CRDTs,
  giving us automatic conflict resolution across nodes.
  """

  use Phoenix.Presence,
    otp_app: :wai_agents_gateway,
    pubsub_server: WaiAgentsGateway.PubSub
end
