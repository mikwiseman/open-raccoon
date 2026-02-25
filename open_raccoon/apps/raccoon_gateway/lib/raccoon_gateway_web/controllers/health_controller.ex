defmodule RaccoonGatewayWeb.HealthController do
  use RaccoonGatewayWeb, :controller

  def index(conn, _params) do
    json(conn, %{status: "ok"})
  end
end
