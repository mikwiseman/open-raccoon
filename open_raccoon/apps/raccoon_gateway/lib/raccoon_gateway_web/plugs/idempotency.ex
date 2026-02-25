defmodule RaccoonGatewayWeb.Plugs.Idempotency do
  @moduledoc """
  Idempotency key enforcement plug.
  Requires an Idempotency-Key header on POST endpoints that need deduplication.
  Returns cached responses for previously seen keys.
  """

  import Plug.Conn
  alias RaccoonShared.Idempotency

  def init(opts), do: opts

  def call(conn, _opts) do
    case get_req_header(conn, "idempotency-key") do
      [key] when byte_size(key) > 0 ->
        user_id = conn.assigns[:user_id]

        case Idempotency.check(RaccoonShared.Repo, key, user_id) do
          :not_found ->
            conn |> assign(:idempotency_key, key)

          {:found, record} ->
            conn
            |> put_status(record.response_code)
            |> Phoenix.Controller.json(record.response_body)
            |> halt()
        end

      _ ->
        conn
        |> put_status(400)
        |> Phoenix.Controller.json(%{
          error: %{
            code: "validation_failed",
            message: "Idempotency-Key header is required"
          }
        })
        |> halt()
    end
  end
end
