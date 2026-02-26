defmodule RaccoonGatewayWeb.Plugs.RateLimit do
  @moduledoc """
  Rate limiting plug using Hammer 7.x.
  Applies per-category rate limits and sets standard rate limit headers.
  """

  import Plug.Conn

  def init(opts), do: opts

  def call(conn, opts) do
    category = Keyword.get(opts, :category, :general)
    {limit, window} = limits_for(category)
    key = rate_limit_key(conn, category)

    case RaccoonGateway.RateLimiter.hit(key, window, limit) do
      {:allow, count} ->
        conn
        |> put_resp_header("x-ratelimit-limit", to_string(limit))
        |> put_resp_header("x-ratelimit-remaining", to_string(max(limit - count, 0)))

      {:deny, retry_after} ->
        conn
        |> put_resp_header("x-ratelimit-limit", to_string(limit))
        |> put_resp_header("x-ratelimit-remaining", "0")
        |> put_resp_header("x-ratelimit-reset", to_string(retry_after))
        |> put_status(429)
        |> Phoenix.Controller.json(%{
          error: %{
            code: "rate_limited",
            message: "Rate limit exceeded",
            details: %{retry_after: retry_after}
          }
        })
        |> halt()
    end
  end

  # 5 requests/min per IP for auth endpoints
  defp limits_for(:auth), do: {5, :timer.minutes(1)}
  # 30 requests/s per user for messages
  defp limits_for(:messages), do: {30, :timer.seconds(1)}
  # 100 requests/min per user for general API
  defp limits_for(:general), do: {100, :timer.minutes(1)}
  # 5 requests/min per bridge
  defp limits_for(:bridges), do: {5, :timer.minutes(1)}
  # 20 requests/min per user for uploads
  defp limits_for(:upload), do: {20, :timer.minutes(1)}

  defp rate_limit_key(conn, :auth) do
    ip = conn.remote_ip |> :inet.ntoa() |> to_string()
    "auth:#{ip}"
  end

  defp rate_limit_key(conn, category) do
    user_id = conn.assigns[:user_id] || conn.remote_ip |> :inet.ntoa() |> to_string()
    "#{category}:#{user_id}"
  end
end
