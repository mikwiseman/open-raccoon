defmodule RaccoonGatewayWeb.Plugs.Auth do
  @moduledoc """
  JWT authentication plug.
  Extracts Bearer token from Authorization header, verifies it,
  and assigns the current user to the connection.
  """

  import Plug.Conn
  alias RaccoonAccounts.Guardian

  def init(opts), do: opts

  def call(conn, _opts) do
    with ["Bearer " <> token] <- get_req_header(conn, "authorization"),
         {:ok, claims} <- Guardian.decode_and_verify(token, %{"typ" => "access"}),
         {:ok, user} <- Guardian.resource_from_claims(claims) do
      conn
      |> assign(:current_user, user)
      |> assign(:user_id, user.id)
    else
      _ ->
        conn
        |> put_status(:unauthorized)
        |> Phoenix.Controller.json(%{
          error: %{code: "unauthorized", message: "Invalid or missing authentication token"}
        })
        |> halt()
    end
  end
end
