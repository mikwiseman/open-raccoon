defmodule RaccoonBridges.ConnectionMonitor do
  @moduledoc """
  GenServer that periodically health-checks active bridge connections.

  - Runs health checks every 30 seconds on active bridges.
  - Tracks consecutive failures per bridge.
  - Delegates reconnection to BridgeManager.schedule_reconnect (non-blocking).
  - Marks a bridge as :error after 5 consecutive failures.
  - Skips bridges with status :disconnected (intentionally stopped).
  """

  use GenServer

  alias RaccoonShared.Repo
  alias RaccoonBridges.{BridgeConnection, BridgeManager, BridgeSupervisor}
  import Ecto.Query

  @health_check_interval :timer.seconds(30)
  @max_consecutive_failures 5

  defstruct failure_counts: %{}

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @impl true
  def init(_opts) do
    schedule_health_check()
    {:ok, %__MODULE__{}}
  end

  @impl true
  def handle_info(:health_check, state) do
    state = run_health_checks(state)
    schedule_health_check()
    {:noreply, state}
  end

  # --- Private ---

  defp schedule_health_check do
    Process.send_after(self(), :health_check, @health_check_interval)
  end

  defp run_health_checks(state) do
    # Only check bridges that are :connected or :reconnecting.
    # Bridges with :disconnected are intentionally stopped -- skip them.
    active_bridges =
      from(b in BridgeConnection,
        where: b.status in [:connected, :reconnecting]
      )
      |> Repo.all()

    Enum.reduce(active_bridges, state, fn bridge, acc ->
      if BridgeSupervisor.bridge_alive?(bridge.id) do
        # Process alive -- clear any failure count for this bridge
        %{acc | failure_counts: Map.delete(acc.failure_counts, bridge.id)}
      else
        handle_failure(bridge, acc)
      end
    end)
  end

  defp handle_failure(bridge, state) do
    count = Map.get(state.failure_counts, bridge.id, 0) + 1
    updated_counts = Map.put(state.failure_counts, bridge.id, count)

    if count >= @max_consecutive_failures do
      bridge
      |> BridgeConnection.changeset(%{status: :error})
      |> Repo.update()

      %{state | failure_counts: Map.delete(updated_counts, bridge.id)}
    else
      # Delegate reconnection to BridgeManager via Process.send_after.
      # No Task.start -- avoids race conditions and unlinked processes.
      BridgeManager.schedule_reconnect(bridge.id, count - 1)

      %{state | failure_counts: updated_counts}
    end
  end
end
