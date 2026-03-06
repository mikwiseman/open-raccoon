defmodule WaiAgentsIntegrations.Application do
  @moduledoc """
  OTP Application for wai_agents_integrations.

  Starts the integration Registry and rate limiter ETS table.
  """

  use Application

  @impl true
  def start(_type, _args) do
    # Initialize ETS tables before starting the supervisor
    WaiAgentsIntegrations.RateLimiter.init()
    WaiAgentsIntegrations.OAuth.init_state_store()

    children = [
      {Registry, keys: :unique, name: WaiAgentsIntegrations.Registry}
    ]

    opts = [strategy: :one_for_one, name: WaiAgentsIntegrations.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
