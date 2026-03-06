defmodule WaiAgentsAgents.Application do
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      {GRPC.Client.Supervisor, []},
      WaiAgentsAgents.CostTracker,
      {WaiAgentsAgents.ToolApproval.Store, []},
      {Registry, keys: :unique, name: WaiAgentsAgents.ProcessRegistry},
      {Registry, keys: :unique, name: WaiAgentsAgents.ExecutorRegistry},
      WaiAgentsAgents.AgentSupervisor,
      WaiAgentsAgents.EventRouter
    ]

    opts = [strategy: :one_for_one, name: WaiAgentsAgents.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
