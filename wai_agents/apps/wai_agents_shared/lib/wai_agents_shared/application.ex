defmodule WaiAgentsShared.Application do
  @moduledoc false
  use Application

  @impl true
  def start(_type, _args) do
    children = [
      WaiAgentsShared.Repo,
      {Oban, Application.fetch_env!(:wai_agents_shared, Oban)}
    ]

    opts = [strategy: :one_for_one, name: WaiAgentsShared.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
