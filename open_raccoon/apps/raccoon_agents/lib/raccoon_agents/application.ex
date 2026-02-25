defmodule RaccoonAgents.Application do
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      RaccoonAgents.CostTracker,
      {RaccoonAgents.ToolApproval.Store, []}
    ]

    opts = [strategy: :one_for_one, name: RaccoonAgents.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
