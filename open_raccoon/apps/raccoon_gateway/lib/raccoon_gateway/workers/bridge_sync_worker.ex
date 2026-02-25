defmodule RaccoonGateway.Workers.BridgeSyncWorker do
  @moduledoc """
  Oban worker for bridge synchronization tasks.

  - Sync messages from bridge platforms
  - Handle bridge reconnection jobs
  - Process queued outbound bridge messages
  """

  use Oban.Worker,
    queue: :bridges,
    max_attempts: 5

  alias RaccoonBridges.{BridgeConnection, BridgeManager}
  alias RaccoonShared.Repo

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"task" => "sync_messages", "bridge_id" => bridge_id}}) do
    bridge = Repo.get!(BridgeConnection, bridge_id)

    case bridge.status do
      :connected ->
        # Placeholder: poll the platform API for new messages
        # and persist them to the database
        RaccoonBridges.update_last_sync(bridge)
        :ok

      status ->
        {:error, "Bridge not connected, status: #{status}"}
    end
  end

  def perform(%Oban.Job{args: %{"task" => "reconnect", "bridge_id" => bridge_id}}) do
    bridge = Repo.get!(BridgeConnection, bridge_id)

    case BridgeManager.reconnect(bridge) do
      {:ok, _bridge} -> :ok
      {:error, reason} -> {:error, reason}
    end
  end

  def perform(%Oban.Job{args: %{"task" => "send_outbound", "bridge_id" => bridge_id, "message" => message}}) do
    bridge = Repo.get!(BridgeConnection, bridge_id)

    adapter =
      case bridge.platform do
        :telegram -> RaccoonBridges.Adapters.Telegram
        :whatsapp -> RaccoonBridges.Adapters.WhatsApp
      end

    case adapter.send_message(message, bridge.encrypted_credentials) do
      {:ok, _response} ->
        RaccoonBridges.update_last_sync(bridge)
        :ok

      {:error, reason} ->
        {:error, reason}
    end
  end

  def perform(%Oban.Job{args: args}) do
    {:error, "Unknown bridge sync task: #{inspect(args)}"}
  end
end
