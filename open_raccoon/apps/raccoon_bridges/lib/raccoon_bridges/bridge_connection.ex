defmodule RaccoonBridges.BridgeConnection do
  @moduledoc """
  Bridge connection schema for external platform integrations.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "bridge_connections" do
    belongs_to(:user, RaccoonAccounts.User)

    field(:platform, Ecto.Enum, values: [:telegram, :whatsapp, :signal, :discord])
    field(:method, Ecto.Enum, values: [:user_level, :bot, :cloud_api])

    field(:status, Ecto.Enum,
      values: [:connected, :reconnecting, :disconnected, :error],
      default: :disconnected
    )

    field(:encrypted_credentials, :binary)
    field(:metadata, :map, default: %{})
    field(:last_sync_at, :utc_datetime_usec)

    has_many(:conversations, RaccoonChat.Conversation, foreign_key: :bridge_id)

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(bridge, attrs) do
    bridge
    |> cast(attrs, [
      :user_id,
      :platform,
      :method,
      :status,
      :encrypted_credentials,
      :metadata,
      :last_sync_at
    ])
    |> validate_required([:user_id, :platform, :method])
    |> validate_inclusion(:platform, [:telegram, :whatsapp, :signal, :discord])
    |> validate_inclusion(:method, [:user_level, :bot, :cloud_api])
    |> validate_inclusion(:status, [:connected, :reconnecting, :disconnected, :error])
    |> unique_constraint([:user_id, :platform, :method])
    |> foreign_key_constraint(:user_id)
  end
end
