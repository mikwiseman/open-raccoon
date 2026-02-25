defmodule RaccoonGatewayWeb.AuthController do
  use RaccoonGatewayWeb, :controller

  def register(conn, _params) do
    conn |> put_status(:not_implemented) |> json(%{error: "not_implemented"})
  end

  def login(conn, _params) do
    conn |> put_status(:not_implemented) |> json(%{error: "not_implemented"})
  end

  def refresh(conn, _params) do
    conn |> put_status(:not_implemented) |> json(%{error: "not_implemented"})
  end

  def logout(conn, _params) do
    conn |> put_status(:not_implemented) |> json(%{error: "not_implemented"})
  end
end
