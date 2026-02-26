defmodule RaccoonChat.Typing do
  @moduledoc """
  Typing indicator tracking with 2s debounce.

  Maintains a map of {conversation_id, user_id} -> {timestamp, timer_ref}.
  When a user starts typing, a timer is set to auto-clear after 2 seconds.
  Each new typing event resets the timer. Explicitly setting is_typing=false
  clears immediately.
  """

  use GenServer

  @debounce_ms 2_000
  @max_typing_users 10

  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @doc "Update typing state for a user in a conversation."
  def update(conversation_id, user_id, is_typing) do
    GenServer.cast(__MODULE__, {:update, conversation_id, user_id, is_typing})
  end

  @doc "Get list of user IDs currently typing in a conversation."
  def typing_users(conversation_id) do
    GenServer.call(__MODULE__, {:typing_users, conversation_id})
  end

  # --- Callbacks ---

  @impl true
  def init(_opts) do
    {:ok, %{typing: %{}}}
  end

  @impl true
  def handle_cast({:update, conversation_id, user_id, true}, state) do
    key = {conversation_id, user_id}

    # Cancel existing timer if any
    case Map.get(state.typing, key) do
      {_time, timer} -> Process.cancel_timer(timer)
      _ -> :ok
    end

    # Set new timer to auto-clear after debounce period
    timer = Process.send_after(self(), {:clear_typing, key}, @debounce_ms)
    {:noreply, put_in(state, [:typing, key], {System.monotonic_time(:millisecond), timer})}
  end

  @impl true
  def handle_cast({:update, conversation_id, user_id, false}, state) do
    key = {conversation_id, user_id}

    case Map.get(state.typing, key) do
      {_time, timer} -> Process.cancel_timer(timer)
      _ -> :ok
    end

    {:noreply, %{state | typing: Map.delete(state.typing, key)}}
  end

  @impl true
  def handle_call({:typing_users, conversation_id}, _from, state) do
    users =
      state.typing
      |> Enum.filter(fn {{conv_id, _user_id}, _} -> conv_id == conversation_id end)
      |> Enum.sort_by(fn {_key, {time, _timer}} -> time end, :desc)
      |> Enum.take(@max_typing_users)
      |> Enum.map(fn {{_conv_id, user_id}, _} -> user_id end)

    {:reply, users, state}
  end

  @impl true
  def handle_info({:clear_typing, key}, state) do
    {:noreply, %{state | typing: Map.delete(state.typing, key)}}
  end
end
