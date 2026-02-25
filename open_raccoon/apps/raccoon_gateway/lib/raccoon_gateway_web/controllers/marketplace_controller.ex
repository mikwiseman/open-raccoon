defmodule RaccoonGatewayWeb.MarketplaceController do
  use RaccoonGatewayWeb, :controller

  def index(conn, _params) do
    conn |> put_status(:not_implemented) |> json(%{error: "not_implemented"})
  end

  def categories(conn, _params) do
    conn |> put_status(:not_implemented) |> json(%{error: "not_implemented"})
  end

  def agent_profile(conn, _params) do
    conn |> put_status(:not_implemented) |> json(%{error: "not_implemented"})
  end

  def rate(conn, _params) do
    conn |> put_status(:not_implemented) |> json(%{error: "not_implemented"})
  end

  def search(conn, _params) do
    conn |> put_status(:not_implemented) |> json(%{error: "not_implemented"})
  end
end
