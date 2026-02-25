defmodule RaccoonShared.Application do
  @moduledoc false
  use Application

  @impl true
  def start(_type, _args) do
    children = [
      RaccoonShared.Repo,
      {Oban, Application.fetch_env!(:raccoon_shared, Oban)}
    ]

    opts = [strategy: :one_for_one, name: RaccoonShared.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
