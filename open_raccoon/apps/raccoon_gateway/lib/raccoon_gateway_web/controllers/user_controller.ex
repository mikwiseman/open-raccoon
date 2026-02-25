defmodule RaccoonGatewayWeb.UserController do
  use RaccoonGatewayWeb, :controller
  action_fallback RaccoonGatewayWeb.FallbackController

  alias RaccoonAccounts

  def me(conn, _params) do
    user = conn.assigns.current_user
    json(conn, %{user: user_json(user)})
  end

  def update(conn, params) do
    user = conn.assigns.current_user

    allowed_keys = ["display_name", "avatar_url", "bio", "settings"]
    update_params = Map.take(params, allowed_keys)

    with {:ok, updated_user} <- RaccoonAccounts.update_user(user, update_params) do
      json(conn, %{user: user_json(updated_user)})
    end
  end

  def show(conn, %{"username" => username}) do
    case RaccoonAccounts.get_user_by_username(username) do
      nil -> {:error, :not_found}
      user -> json(conn, %{user: public_user_json(user)})
    end
  end

  def usage(conn, _params) do
    user = conn.assigns.current_user

    # Token usage is a placeholder until billing system is implemented
    json(conn, %{
      user_id: user.id,
      usage: %{
        tokens_used: 0,
        tokens_limit: 100_000,
        period_start: Date.beginning_of_month(Date.utc_today()) |> Date.to_iso8601(),
        period_end: Date.end_of_month(Date.utc_today()) |> Date.to_iso8601()
      }
    })
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
      settings: user.settings,
      last_seen_at: user.last_seen_at,
      created_at: user.inserted_at,
      updated_at: user.updated_at
    }
  end

  defp public_user_json(user) do
    %{
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      bio: user.bio,
      status: user.status,
      created_at: user.inserted_at
    }
  end
end
