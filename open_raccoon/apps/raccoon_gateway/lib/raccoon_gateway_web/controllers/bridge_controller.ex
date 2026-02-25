defmodule RaccoonGatewayWeb.BridgeController do
  use RaccoonGatewayWeb, :controller
  action_fallback RaccoonGatewayWeb.FallbackController

  alias RaccoonBridges

  def index(conn, _params) do
    user_id = conn.assigns.user_id
    bridges = RaccoonBridges.list_user_bridges(user_id)

    json(conn, %{items: Enum.map(bridges, &bridge_json/1)})
  end

  def connect_telegram(conn, params) do
    user_id = conn.assigns.user_id

    attrs =
      params
      |> Map.put("user_id", user_id)
      |> Map.put("platform", "telegram")
      |> Map.put_new("method", "bot")

    # Upsert: returns existing connection if already exists
    with {:ok, bridge} <- RaccoonBridges.connect_bridge(attrs) do
      conn
      |> put_status(:created)
      |> json(%{bridge: bridge_json(bridge)})
    end
  end

  def connect_whatsapp(conn, params) do
    user_id = conn.assigns.user_id

    attrs =
      params
      |> Map.put("user_id", user_id)
      |> Map.put("platform", "whatsapp")
      |> Map.put_new("method", "cloud_api")

    with {:ok, bridge} <- RaccoonBridges.connect_bridge(attrs) do
      conn
      |> put_status(:created)
      |> json(%{bridge: bridge_json(bridge)})
    end
  end

  def disconnect(conn, %{"id" => id}) do
    user_id = conn.assigns.user_id

    case RaccoonBridges.get_bridge(id) do
      nil ->
        {:error, :not_found}

      %{user_id: ^user_id} = bridge ->
        with {:ok, _} <- RaccoonBridges.disconnect_bridge(bridge) do
          send_resp(conn, :no_content, "")
        end

      _bridge ->
        {:error, :forbidden}
    end
  end

  def status(conn, %{"id" => id}) do
    user_id = conn.assigns.user_id

    case RaccoonBridges.get_bridge(id) do
      nil ->
        {:error, :not_found}

      %{user_id: ^user_id} = bridge ->
        json(conn, %{
          id: bridge.id,
          platform: bridge.platform,
          status: bridge.status,
          last_sync_at: bridge.last_sync_at,
          updated_at: bridge.updated_at
        })

      _bridge ->
        {:error, :forbidden}
    end
  end

  defp bridge_json(bridge) do
    %{
      id: bridge.id,
      user_id: bridge.user_id,
      platform: bridge.platform,
      method: bridge.method,
      status: bridge.status,
      metadata: bridge.metadata,
      last_sync_at: bridge.last_sync_at,
      created_at: bridge.inserted_at,
      updated_at: bridge.updated_at
    }
  end
end
