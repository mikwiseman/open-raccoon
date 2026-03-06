defmodule WaiAgentsBridges.Application do
  @moduledoc """
  OTP Application for wai_agents_bridges.

  Starts the BridgeSupervisor (DynamicSupervisor), the process
  Registry, and the ConnectionMonitor under a supervised tree.
  """

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      {Registry, keys: :unique, name: WaiAgentsBridges.Registry},
      WaiAgentsBridges.BridgeSupervisor,
      WaiAgentsBridges.BridgeManager,
      WaiAgentsBridges.ConnectionMonitor
    ]

    opts = [strategy: :one_for_one, name: WaiAgentsBridges.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
