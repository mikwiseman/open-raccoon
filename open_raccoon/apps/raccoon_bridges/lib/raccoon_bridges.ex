defmodule RaccoonBridges do
  @moduledoc """
  Bridges context: bridge connection management, status tracking.
  """

  alias RaccoonShared.Repo
  alias RaccoonBridges.BridgeConnection
  import Ecto.Query

  def connect_bridge(attrs) do
    %BridgeConnection{}
    |> BridgeConnection.changeset(Map.put(attrs, :status, :connected))
    |> Repo.insert(
      on_conflict: {:replace, [:status, :encrypted_credentials, :metadata, :updated_at]},
      conflict_target: [:user_id, :platform, :method]
    )
  end

  def disconnect_bridge(%BridgeConnection{} = bridge) do
    bridge
    |> BridgeConnection.changeset(%{status: :disconnected, encrypted_credentials: nil})
    |> Repo.update()
  end

  def get_bridge(id), do: Repo.get(BridgeConnection, id)

  def get_bridge!(id), do: Repo.get!(BridgeConnection, id)

  def list_user_bridges(user_id) do
    from(b in BridgeConnection, where: b.user_id == ^user_id, order_by: [desc: b.updated_at])
    |> Repo.all()
  end

  def update_status(%BridgeConnection{} = bridge, status) do
    bridge
    |> BridgeConnection.changeset(%{status: status})
    |> Repo.update()
  end

  def update_last_sync(%BridgeConnection{} = bridge) do
    bridge
    |> BridgeConnection.changeset(%{last_sync_at: DateTime.utc_now()})
    |> Repo.update()
  end
end
