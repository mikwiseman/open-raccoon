defmodule RaccoonAccounts.TokenStore do
  @moduledoc """
  ETS-based revoked token store for Guardian token revocation.

  Stores JTI (JWT ID) claims of revoked tokens with their expiry times.
  Expired entries are periodically cleaned up to prevent unbounded growth.
  """

  use GenServer

  @table :revoked_tokens
  @cleanup_interval :timer.minutes(15)

  # --- Public API ---

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @doc "Mark a token as revoked by its JTI claim."
  def revoke(jti, exp) when is_binary(jti) do
    :ets.insert(@table, {jti, exp})
    :ok
  end

  @doc "Check if a token's JTI has been revoked."
  def revoked?(jti) when is_binary(jti) do
    case :ets.lookup(@table, jti) do
      [{^jti, _exp}] -> true
      [] -> false
    end
  end

  # --- GenServer Callbacks ---

  @impl true
  def init(_opts) do
    :ets.new(@table, [:set, :public, :named_table, read_concurrency: true])
    schedule_cleanup()
    {:ok, %{}}
  end

  @impl true
  def handle_info(:cleanup, state) do
    now = System.system_time(:second)

    :ets.select_delete(@table, [
      {{:"$1", :"$2"}, [{:<, :"$2", now}], [true]}
    ])

    schedule_cleanup()
    {:noreply, state}
  end

  defp schedule_cleanup do
    Process.send_after(self(), :cleanup, @cleanup_interval)
  end
end
