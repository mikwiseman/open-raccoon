defmodule WaiAgentsGatewayWeb.HealthController do
  use WaiAgentsGatewayWeb, :controller

  def index(conn, _params) do
    sidecar_status =
      case WaiAgentsAgents.GRPCClient.check_health() do
        {:ok, health} -> health
        {:error, _reason} -> %{status: "unreachable"}
      end

    json(conn, %{
      status: "ok",
      sidecar: sidecar_status
    })
  end
end
