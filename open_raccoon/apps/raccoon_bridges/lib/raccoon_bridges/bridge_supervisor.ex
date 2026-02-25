defmodule RaccoonBridges.BridgeSupervisor do
  @moduledoc """
  DynamicSupervisor for bridge GenServer processes.
  Supervises individual bridge connection processes and
  allows starting/stopping bridge workers dynamically.
  """

  use DynamicSupervisor

  def start_link(init_arg) do
    DynamicSupervisor.start_link(__MODULE__, init_arg, name: __MODULE__)
  end

  @impl true
  def init(_init_arg) do
    DynamicSupervisor.init(strategy: :one_for_one)
  end

  @doc """
  Start a supervised bridge worker process for the given bridge connection.
  """
  @spec start_bridge(RaccoonBridges.BridgeConnection.t()) :: DynamicSupervisor.on_start_child()
  def start_bridge(bridge) do
    child_spec = %{
      id: bridge.id,
      start: {RaccoonBridges.BridgeWorker, :start_link, [bridge]},
      restart: :transient
    }

    DynamicSupervisor.start_child(__MODULE__, child_spec)
  end

  @doc """
  Stop a supervised bridge worker process by bridge ID.
  """
  @spec stop_bridge(String.t()) :: :ok | {:error, :not_found}
  def stop_bridge(bridge_id) do
    case find_child(bridge_id) do
      {:ok, pid} ->
        DynamicSupervisor.terminate_child(__MODULE__, pid)

      :error ->
        {:error, :not_found}
    end
  end

  @doc """
  Check if a bridge worker process is alive.
  """
  @spec bridge_alive?(String.t()) :: boolean()
  def bridge_alive?(bridge_id) do
    case find_child(bridge_id) do
      {:ok, pid} -> Process.alive?(pid)
      :error -> false
    end
  end

  defp find_child(bridge_id) do
    name = RaccoonBridges.BridgeWorker.via(bridge_id)

    case GenServer.whereis(name) do
      nil -> :error
      pid -> {:ok, pid}
    end
  end
end
