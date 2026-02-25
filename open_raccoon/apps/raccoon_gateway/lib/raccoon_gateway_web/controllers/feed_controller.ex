defmodule RaccoonGatewayWeb.FeedController do
  use RaccoonGatewayWeb, :controller

  def index(conn, _params) do
    conn |> put_status(:not_implemented) |> json(%{error: "not_implemented"})
  end

  def trending(conn, _params) do
    conn |> put_status(:not_implemented) |> json(%{error: "not_implemented"})
  end

  def new_items(conn, _params) do
    conn |> put_status(:not_implemented) |> json(%{error: "not_implemented"})
  end

  def like(conn, _params) do
    conn |> put_status(:not_implemented) |> json(%{error: "not_implemented"})
  end

  def unlike(conn, _params) do
    conn |> put_status(:not_implemented) |> json(%{error: "not_implemented"})
  end

  def fork(conn, _params) do
    conn |> put_status(:not_implemented) |> json(%{error: "not_implemented"})
  end
end
