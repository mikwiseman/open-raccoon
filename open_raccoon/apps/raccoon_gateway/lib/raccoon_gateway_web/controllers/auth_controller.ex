defmodule RaccoonGatewayWeb.AuthController do
  use RaccoonGatewayWeb, :controller
  action_fallback RaccoonGatewayWeb.FallbackController

  alias RaccoonAccounts.Auth
  alias RaccoonAccounts.Token

  def register(conn, %{"username" => _, "email" => _, "password" => _} = params) do
    with {:ok, user} <- Auth.register(params),
         {:ok, tokens} <- Token.create_tokens(user) do
      conn
      |> put_status(:created)
      |> json(%{user: user_json(user), tokens: tokens})
    end
  end

  def register(conn, _params) do
    conn
    |> put_status(:unprocessable_entity)
    |> json(%{
      error: %{
        code: "validation_failed",
        message: "username, email, and password are required"
      }
    })
  end

  def login(conn, %{"email" => email, "password" => password}) do
    with {:ok, user} <- Auth.authenticate(email, password),
         {:ok, tokens} <- Token.create_tokens(user) do
      json(conn, %{user: user_json(user), tokens: tokens})
    end
  end

  def login(conn, _params) do
    conn
    |> put_status(:unprocessable_entity)
    |> json(%{
      error: %{code: "validation_failed", message: "email and password are required"}
    })
  end

  def refresh(conn, %{"refresh_token" => refresh_token}) do
    with {:ok, tokens} <- Token.refresh(refresh_token) do
      json(conn, tokens)
    end
  end

  def refresh(conn, _params) do
    conn
    |> put_status(:unprocessable_entity)
    |> json(%{error: %{code: "validation_failed", message: "refresh_token is required"}})
  end

  def logout(conn, %{"refresh_token" => token}) do
    Token.revoke(token)
    send_resp(conn, :no_content, "")
  end

  def logout(conn, _params) do
    # Even without a refresh_token, we can still "logout" successfully
    send_resp(conn, :no_content, "")
  end

  defp user_json(user) do
    %{
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      email: user.email,
      avatar_url: user.avatar_url,
      bio: user.bio,
      status: user.status,
      role: user.role,
      created_at: user.inserted_at,
      updated_at: user.updated_at
    }
  end
end
