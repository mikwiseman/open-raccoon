defmodule RaccoonBridges.BridgeWorker do
  @moduledoc """
  GenServer representing a single active bridge connection.
  Registered via the bridge ID in a Registry.

  For Telegram bot bridges, polls `getUpdates` on a configurable interval.
  For WhatsApp (webhook-based), runs periodic sync checks to update last_sync_at.
  """

  use GenServer

  require Logger

  alias RaccoonBridges.{BridgeConnection, BridgeManager}
  alias RaccoonBridges.Adapters.Telegram
  alias RaccoonShared.Repo

  @poll_interval :timer.seconds(5)
  @sync_check_interval :timer.seconds(60)

  defstruct [:bridge_id, :platform, :method, :user_id, :last_update_id]

  def start_link(%BridgeConnection{} = bridge) do
    GenServer.start_link(__MODULE__, bridge, name: via(bridge.id))
  end

  @doc """
  Via tuple for process registration by bridge ID.
  """
  def via(bridge_id) do
    {:via, Registry, {RaccoonBridges.Registry, bridge_id}}
  end

  @impl true
  def init(%BridgeConnection{} = bridge) do
    state = %__MODULE__{
      bridge_id: bridge.id,
      platform: bridge.platform,
      method: bridge.method,
      user_id: bridge.user_id,
      last_update_id: 0
    }

    schedule_work(state)
    {:ok, state}
  end

  @impl true
  def handle_info(:poll, %{platform: :telegram} = state) do
    state = poll_telegram(state)
    schedule_work(state)
    {:noreply, state}
  end

  @impl true
  def handle_info(:sync_check, state) do
    update_last_sync(state.bridge_id)
    schedule_work(state)
    {:noreply, state}
  end

  @impl true
  def handle_info(:health_check, state) do
    {:noreply, state}
  end

  @impl true
  def handle_call(:status, _from, state) do
    {:reply, {:ok, state}, state}
  end

  # --- Private ---

  defp schedule_work(%{platform: :telegram, method: :bot}) do
    Process.send_after(self(), :poll, @poll_interval)
  end

  defp schedule_work(_state) do
    # WhatsApp and other webhook-based platforms: periodic sync check only
    Process.send_after(self(), :sync_check, @sync_check_interval)
  end

  defp poll_telegram(state) do
    bridge = Repo.get(BridgeConnection, state.bridge_id)

    case BridgeManager.decrypt_credentials(bridge) do
      {:ok, bot_token} ->
        case fetch_updates(bot_token, state.last_update_id + 1) do
          {:ok, updates} ->
            Enum.each(updates, fn update ->
              case Telegram.handle_webhook(update) do
                {:ok, :ignored} ->
                  :ok

                {:ok, envelope} ->
                  RaccoonBridges.route_telegram_envelope(bridge, envelope)

                {:error, reason} ->
                  Logger.warning("Telegram update processing failed: #{inspect(reason)}")
              end
            end)

            last_id =
              case List.last(updates) do
                %{"update_id" => id} -> id
                _ -> state.last_update_id
              end

            update_last_sync(state.bridge_id)
            %{state | last_update_id: last_id}

          {:error, reason} ->
            Logger.warning(
              "Telegram getUpdates failed for bridge #{state.bridge_id}: #{inspect(reason)}"
            )

            state
        end

      {:error, reason} ->
        Logger.error(
          "Failed to decrypt credentials for bridge #{state.bridge_id}: #{inspect(reason)}"
        )

        state
    end
  end

  defp fetch_updates(bot_token, offset) do
    url =
      "https://api.telegram.org/bot#{bot_token}/getUpdates?offset=#{offset}&timeout=0&limit=100"

    case :httpc.request(:get, {String.to_charlist(url), []}, [], []) do
      {:ok, {{_, 200, _}, _headers, response_body}} ->
        case Jason.decode!(to_string(response_body)) do
          %{"ok" => true, "result" => updates} -> {:ok, updates}
          %{"ok" => false, "description" => desc} -> {:error, {:telegram_api, desc}}
        end

      {:ok, {{_, status, _}, _headers, response_body}} ->
        {:error, %{status: status, body: to_string(response_body)}}

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp update_last_sync(bridge_id) do
    case Repo.get(BridgeConnection, bridge_id) do
      nil ->
        :ok

      bridge ->
        bridge
        |> BridgeConnection.changeset(%{last_sync_at: DateTime.utc_now()})
        |> Repo.update()
    end
  end
end
