defmodule WaiAgentsAccounts.Application do
  @moduledoc false
  use Application

  @impl true
  def start(_type, _args) do
    children = [
      WaiAgentsAccounts.TokenStore
    ]

    opts = [strategy: :one_for_one, name: WaiAgentsAccounts.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
