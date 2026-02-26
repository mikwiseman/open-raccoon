defmodule RaccoonBridges.Application do
  @moduledoc """
  OTP Application for raccoon_bridges.

  Starts the BridgeSupervisor (DynamicSupervisor), the process
  Registry, and the ConnectionMonitor under a supervised tree.
  """

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      {Registry, keys: :unique, name: RaccoonBridges.Registry},
      RaccoonBridges.BridgeSupervisor,
      RaccoonBridges.BridgeManager,
      RaccoonBridges.ConnectionMonitor
    ]

    opts = [strategy: :one_for_one, name: RaccoonBridges.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
