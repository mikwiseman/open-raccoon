defmodule RaccoonChat.PresenceTracker do
  @moduledoc """
  Tracks user presence: online, away (5min idle), offline.

  This GenServer maintains a map of user_id -> last_activity_timestamp.
  Status is derived from the elapsed time since last activity:
    - online: activity within the last 5 minutes
    - away: no activity for 5+ minutes
    - offline: no tracked activity at all
  """

  use GenServer

  @away_timeout :timer.minutes(5)

  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @doc "Record activity for a user, resetting their idle timer."
  def track_activity(user_id) do
    GenServer.cast(__MODULE__, {:activity, user_id})
  end

  @doc "Get the current presence status for a user."
  def get_status(user_id) do
    GenServer.call(__MODULE__, {:get_status, user_id})
  end

  @doc "Remove tracking for a user (e.g., on disconnect)."
  def remove(user_id) do
    GenServer.cast(__MODULE__, {:remove, user_id})
  end

  # --- Callbacks ---

  @impl true
  def init(_opts) do
    {:ok, %{last_activity: %{}}}
  end

  @impl true
  def handle_cast({:activity, user_id}, state) do
    {:noreply, put_in(state, [:last_activity, user_id], System.monotonic_time(:millisecond))}
  end

  @impl true
  def handle_cast({:remove, user_id}, state) do
    {:noreply, %{state | last_activity: Map.delete(state.last_activity, user_id)}}
  end

  @impl true
  def handle_call({:get_status, user_id}, _from, state) do
    status =
      case Map.get(state.last_activity, user_id) do
        nil ->
          :offline

        last ->
          elapsed = System.monotonic_time(:millisecond) - last
          if elapsed > @away_timeout, do: :away, else: :online
      end

    {:reply, status, state}
  end
end
