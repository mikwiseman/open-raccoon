defmodule RaccoonBridges.BridgeManager do
  @moduledoc """
  Bridge lifecycle management: connect, disconnect, reconnect, status.
  """

  use GenServer

  alias RaccoonShared.Repo
  alias RaccoonBridges.{BridgeConnection, BridgeSupervisor, CredentialEncryption}

  @backoff_schedule [1_000, 2_000, 5_000, 10_000, 10_000]

  # --- Public API ---

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @doc """
  Connect a bridge (telegram/whatsapp). Validates credentials,
  encrypts them, creates or updates BridgeConnection record, and starts a supervised process.
  """
  @spec connect(map(), Keyword.t()) :: {:ok, BridgeConnection.t()} | {:error, term()}
  def connect(attrs, opts \\ []) do
    platform = attrs[:platform] || attrs["platform"]

    with :ok <- validate_credentials(platform, attrs),
         {:ok, attrs_with_encrypted} <- encrypt_credentials(platform, attrs),
         {:ok, bridge} <- upsert_bridge(attrs_with_encrypted),
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
  Schedule a reconnect attempt for a bridge using Process.send_after.
  Non-blocking -- the actual reconnect happens asynchronously in the GenServer.
  """
  @spec schedule_reconnect(String.t(), non_neg_integer()) :: :ok
  def schedule_reconnect(bridge_id, attempt \\ 0) do
    delay = backoff_delay(attempt)
    Process.send_after(__MODULE__, {:reconnect, bridge_id, attempt}, delay)
    :ok
  end

  @doc """
  Decrypt stored credentials for a bridge connection.
  """
  @spec decrypt_credentials(BridgeConnection.t()) :: {:ok, String.t()} | {:error, term()}
  def decrypt_credentials(%BridgeConnection{encrypted_credentials: nil}),
    do: {:error, :no_credentials}

  def decrypt_credentials(%BridgeConnection{encrypted_credentials: encrypted}),
    do: CredentialEncryption.decrypt(encrypted)

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

  # --- GenServer callbacks ---

  @impl true
  def init(_opts) do
    {:ok, %{}}
  end

  @impl true
  def handle_info({:reconnect, bridge_id, attempt}, state) do
    case Repo.get(BridgeConnection, bridge_id) do
      nil ->
        {:noreply, state}

      %BridgeConnection{status: :disconnected} ->
        # Bridge was intentionally disconnected; do not reconnect.
        {:noreply, state}

      bridge ->
        {:ok, bridge} =
          bridge
          |> BridgeConnection.changeset(%{status: :reconnecting})
          |> Repo.update()

        case connect(
               %{user_id: bridge.user_id, platform: bridge.platform, method: bridge.method},
               skip_process: false
             ) do
          {:ok, _reconnected} ->
            {:noreply, state}

          {:error, _reason} ->
            if attempt + 1 >= length(@backoff_schedule) do
              bridge
              |> BridgeConnection.changeset(%{status: :error})
              |> Repo.update()

              {:noreply, state}
            else
              # Schedule next attempt -- iterative, no recursion, no stack growth
              schedule_reconnect(bridge_id, attempt + 1)
              {:noreply, state}
            end
        end
    end
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

  defp encrypt_credentials(:telegram, attrs) do
    case get_in_attrs(attrs, :bot_token) do
      nil ->
        # Already have encrypted_credentials or none needed
        {:ok, attrs}

      token ->
        {:ok, encrypted} = CredentialEncryption.encrypt(token)

        attrs =
          attrs
          |> Map.delete(:bot_token)
          |> Map.delete("bot_token")
          |> Map.put(:encrypted_credentials, encrypted)

        {:ok, attrs}
    end
  end

  defp encrypt_credentials(:whatsapp, attrs) do
    case get_in_attrs(attrs, :access_token) do
      nil ->
        {:ok, attrs}

      token ->
        {:ok, encrypted} = CredentialEncryption.encrypt(token)

        attrs =
          attrs
          |> Map.delete(:access_token)
          |> Map.delete("access_token")
          |> Map.put(:encrypted_credentials, encrypted)

        {:ok, attrs}
    end
  end

  defp encrypt_credentials(_platform, attrs), do: {:ok, attrs}

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
