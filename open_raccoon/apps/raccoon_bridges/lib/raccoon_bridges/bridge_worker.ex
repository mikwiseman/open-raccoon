defmodule RaccoonBridges.BridgeWorker do
  @moduledoc """
  GenServer representing a single active bridge connection.
  Registered via the bridge ID in a Registry.
  """

  use GenServer

  alias RaccoonBridges.BridgeConnection

  defstruct [:bridge_id, :platform, :method, :user_id]

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
      user_id: bridge.user_id
    }

    {:ok, state}
  end

  @impl true
  def handle_info(:health_check, state) do
    {:noreply, state}
  end

  @impl true
  def handle_call(:status, _from, state) do
    {:reply, {:ok, state}, state}
  end
end
