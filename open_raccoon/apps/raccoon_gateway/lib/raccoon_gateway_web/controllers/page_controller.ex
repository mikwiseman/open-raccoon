defmodule RaccoonGatewayWeb.PageController do
  use RaccoonGatewayWeb, :controller

  def index(conn, _params) do
    conn |> put_status(:not_implemented) |> json(%{error: "not_implemented"})
  end

  def create(conn, _params) do
    conn |> put_status(:not_implemented) |> json(%{error: "not_implemented"})
  end

  def show(conn, _params) do
    conn |> put_status(:not_implemented) |> json(%{error: "not_implemented"})
  end

  def update(conn, _params) do
    conn |> put_status(:not_implemented) |> json(%{error: "not_implemented"})
  end

  def deploy(conn, _params) do
    conn |> put_status(:not_implemented) |> json(%{error: "not_implemented"})
  end

  def fork(conn, _params) do
    conn |> put_status(:not_implemented) |> json(%{error: "not_implemented"})
  end

  def versions(conn, _params) do
    conn |> put_status(:not_implemented) |> json(%{error: "not_implemented"})
  end
end
