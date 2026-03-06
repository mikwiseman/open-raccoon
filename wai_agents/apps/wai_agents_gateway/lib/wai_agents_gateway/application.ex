defmodule WaiAgentsGateway.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      WaiAgentsGatewayWeb.Telemetry,
      {DNSCluster, query: Application.get_env(:wai_agents_gateway, :dns_cluster_query) || :ignore},
      {Phoenix.PubSub, name: WaiAgentsGateway.PubSub},
      # Oban is started by WaiAgentsShared.Application
      {WaiAgentsGateway.RateLimiter, clean_period: :timer.minutes(1)},
      WaiAgentsGatewayWeb.Presence,
      # Start to serve requests, typically the last entry
      WaiAgentsGatewayWeb.Endpoint
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: WaiAgentsGateway.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    WaiAgentsGatewayWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
