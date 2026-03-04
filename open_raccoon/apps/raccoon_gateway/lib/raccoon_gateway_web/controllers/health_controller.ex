defmodule RaccoonGatewayWeb.HealthController do
  use RaccoonGatewayWeb, :controller

  def index(conn, _params) do
    sidecar_status =
      case RaccoonAgents.GRPCClient.check_health() do
        {:ok, health} -> health
        {:error, _reason} -> %{status: "unreachable"}
      end

    json(conn, %{
      status: "ok",
      sidecar: sidecar_status
    })
  end
end
