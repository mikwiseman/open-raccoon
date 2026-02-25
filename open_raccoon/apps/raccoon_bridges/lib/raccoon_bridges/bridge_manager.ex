defmodule RaccoonBridges.BridgeManager do
  @moduledoc """
  Bridge lifecycle management: connect, disconnect, reconnect, status.
  """

  alias RaccoonShared.Repo
  alias RaccoonBridges.{BridgeConnection, BridgeSupervisor}

  @backoff_schedule [1_000, 2_000, 5_000, 10_000, 10_000]

  @doc """
  Connect a bridge (telegram/whatsapp). Validates credentials,
  creates or updates BridgeConnection record, and starts a supervised process.
  """
  @spec connect(map(), Keyword.t()) :: {:ok, BridgeConnection.t()} | {:error, term()}
  def connect(attrs, opts \\ []) do
    platform = attrs[:platform] || attrs["platform"]

    with :ok <- validate_credentials(platform, attrs),
         {:ok, bridge} <- upsert_bridge(attrs),
         :ok <- maybe_start_process(bridge, opts) do
      {:ok, bridge}
    end
  end

  @doc """
  Disconnect a bridge, update status to disconnected, and stop the supervised process.
  """
  @spec disconnect(BridgeConnection.t()) :: {:ok, BridgeConnection.t()} | {:error, term()}
  def disconnect(%BridgeConnection{} = bridge) do
    BridgeSupervisor.stop_bridge(bridge.id)

    bridge
    |> BridgeConnection.changeset(%{status: :disconnected})
    |> Repo.update()
  end

  @doc """
  Reconnect a bridge with exponential backoff (1s -> 2s -> 5s -> 10s -> 10s cap).
  """
  @spec reconnect(BridgeConnection.t(), non_neg_integer()) ::
          {:ok, BridgeConnection.t()} | {:error, term()}
  def reconnect(%BridgeConnection{} = bridge, attempt \\ 0) do
    delay = backoff_delay(attempt)

    {:ok, bridge} =
      bridge
      |> BridgeConnection.changeset(%{status: :reconnecting})
      |> Repo.update()

    Process.sleep(delay)

    case connect(%{user_id: bridge.user_id, platform: bridge.platform, method: bridge.method}, skip_process: false) do
      {:ok, reconnected} ->
        {:ok, reconnected}

      {:error, _reason} ->
        if attempt + 1 >= length(@backoff_schedule) do
          bridge
          |> BridgeConnection.changeset(%{status: :error})
          |> Repo.update()
        else
          reconnect(Repo.get!(BridgeConnection, bridge.id), attempt + 1)
        end
    end
  end

  @doc """
  Get bridge connection status with health info.
  """
  @spec status(String.t()) :: {:ok, map()} | {:error, :not_found}
  def status(bridge_id) do
    case Repo.get(BridgeConnection, bridge_id) do
      nil ->
        {:error, :not_found}

      bridge ->
        {:ok,
         %{
           id: bridge.id,
           platform: bridge.platform,
           status: bridge.status,
           last_sync_at: bridge.last_sync_at,
           process_alive: BridgeSupervisor.bridge_alive?(bridge.id),
           metadata: bridge.metadata
         }}
    end
  end

  @doc """
  Returns the backoff delay in ms for a given attempt number.
  """
  @spec backoff_delay(non_neg_integer()) :: non_neg_integer()
  def backoff_delay(attempt) do
    Enum.at(@backoff_schedule, min(attempt, length(@backoff_schedule) - 1))
  end

  # --- Private ---

  defp validate_credentials(:telegram, attrs) do
    token = get_in_attrs(attrs, :encrypted_credentials) || get_in_attrs(attrs, :bot_token)
    if token, do: :ok, else: {:error, :missing_credentials}
  end

  defp validate_credentials(:whatsapp, attrs) do
    token = get_in_attrs(attrs, :encrypted_credentials) || get_in_attrs(attrs, :access_token)
    if token, do: :ok, else: {:error, :missing_credentials}
  end

  defp validate_credentials(_platform, _attrs), do: :ok

  defp upsert_bridge(attrs) do
    %BridgeConnection{}
    |> BridgeConnection.changeset(Map.put(attrs, :status, :connected))
    |> Repo.insert(
      on_conflict: {:replace, [:status, :encrypted_credentials, :metadata, :updated_at]},
      conflict_target: [:user_id, :platform, :method]
    )
  end

  defp maybe_start_process(bridge, opts) do
    if Keyword.get(opts, :skip_process, false) do
      :ok
    else
      case BridgeSupervisor.start_bridge(bridge) do
        {:ok, _pid} -> :ok
        {:error, {:already_started, _pid}} -> :ok
        {:error, reason} -> {:error, reason}
      end
    end
  end

  defp get_in_attrs(attrs, key) when is_atom(key) do
    Map.get(attrs, key) || Map.get(attrs, to_string(key))
  end
end
