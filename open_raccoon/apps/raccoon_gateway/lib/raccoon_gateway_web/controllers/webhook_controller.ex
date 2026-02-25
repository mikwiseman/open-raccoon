defmodule RaccoonGatewayWeb.WebhookController do
  use RaccoonGatewayWeb, :controller

  def telegram(conn, _params) do
    conn |> put_status(:not_implemented) |> json(%{error: "not_implemented"})
  end

  def whatsapp(conn, _params) do
    conn |> put_status(:not_implemented) |> json(%{error: "not_implemented"})
  end

  def whatsapp_verify(conn, _params) do
    conn |> put_status(:not_implemented) |> json(%{error: "not_implemented"})
  end
end
