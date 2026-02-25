defmodule RaccoonGatewayWeb.Presence do
  @moduledoc """
  Phoenix Presence for tracking online users in conversations.

  Uses Phoenix's distributed presence tracking backed by CRDTs,
  giving us automatic conflict resolution across nodes.
  """

  use Phoenix.Presence,
    otp_app: :raccoon_gateway,
    pubsub_server: RaccoonGateway.PubSub
end
