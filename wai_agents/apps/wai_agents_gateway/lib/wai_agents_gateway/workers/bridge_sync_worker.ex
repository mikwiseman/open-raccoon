defmodule WaiAgentsGateway.Workers.BridgeSyncWorker do
  @moduledoc """
  Oban worker for bridge synchronization tasks.

  - Sync messages from bridge platforms
  - Handle bridge reconnection jobs
  - Process queued outbound bridge messages
  """

  use Oban.Worker,
    queue: :bridges,
    max_attempts: 5

  alias WaiAgentsBridges.{BridgeConnection, BridgeManager}
  alias WaiAgentsShared.Repo

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"task" => "sync_messages", "bridge_id" => bridge_id}}) do
    case Repo.get(BridgeConnection, bridge_id) do
      nil ->
        {:discard, "Bridge not found: #{bridge_id}"}

      bridge ->
        case bridge.status do
          :connected ->
            # Placeholder: poll the platform API for new messages
            # and persist them to the database
            WaiAgentsBridges.update_last_sync(bridge)
            :ok

          status ->
            {:error, "Bridge not connected, status: #{status}"}
        end
    end
  end

  def perform(%Oban.Job{args: %{"task" => "reconnect", "bridge_id" => bridge_id}}) do
    case Repo.get(BridgeConnection, bridge_id) do
      nil ->
        {:discard, "Bridge not found: #{bridge_id}"}

      _bridge ->
        BridgeManager.schedule_reconnect(bridge_id)
        :ok
    end
  end

  def perform(%Oban.Job{
        args: %{"task" => "send_outbound", "bridge_id" => bridge_id, "message" => message}
      }) do
    case Repo.get(BridgeConnection, bridge_id) do
      nil ->
        {:discard, "Bridge not found: #{bridge_id}"}

      bridge ->
        adapter =
          case bridge.platform do
            :telegram -> WaiAgentsBridges.Adapters.Telegram
            :whatsapp -> WaiAgentsBridges.Adapters.WhatsApp
          end

        case adapter.send_message(message, bridge.encrypted_credentials) do
          {:ok, _response} ->
            WaiAgentsBridges.update_last_sync(bridge)
            :ok

          {:error, reason} ->
            {:error, reason}
        end
    end
  end

  def perform(%Oban.Job{args: args}) do
    {:error, "Unknown bridge sync task: #{inspect(args)}"}
  end
end
