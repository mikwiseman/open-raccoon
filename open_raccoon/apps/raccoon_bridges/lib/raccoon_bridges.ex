defmodule RaccoonBridges do
  @moduledoc """
  Bridges context: bridge connection management, status tracking.
  """

  alias RaccoonShared.Repo
  alias RaccoonBridges.BridgeConnection
  alias RaccoonBridges.Adapters.{Telegram, WhatsApp}
  alias RaccoonChat.{Conversation, Delivery}
  import Ecto.Query

  require Logger

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

  @doc """
  Handle incoming Telegram webhook update.
  Normalizes the message and routes it to the appropriate conversation.
  """
  def handle_telegram_webhook(params) do
    case Telegram.handle_webhook(params) do
      {:ok, :ignored} ->
        :ok

      {:ok, envelope} ->
        route_bridge_message(:telegram, envelope)

      {:error, reason} ->
        Logger.error("Telegram webhook processing failed", error: inspect(reason))
        {:error, reason}
    end
  end

  @doc """
  Handle incoming WhatsApp Cloud API webhook message.
  Normalizes the message and routes it to the appropriate conversation.
  """
  def handle_whatsapp_webhook(params) do
    case WhatsApp.handle_webhook(params) do
      {:ok, :ignored} ->
        :ok

      {:ok, envelope} ->
        route_bridge_message(:whatsapp, envelope)

      {:error, reason} ->
        Logger.error("WhatsApp webhook processing failed", error: inspect(reason))
        {:error, reason}
    end
  end

  # -- Private ---------------------------------------------------------------

  defp route_bridge_message(platform, envelope) do
    bridge_source = to_string(platform)

    with {:ok, bridge} <- find_bridge_for_platform(platform, envelope.sender.id),
         {:ok, conversation} <- find_or_create_bridge_conversation(bridge, envelope) do
      sender_id = bridge.user_id

      message_params = %{
        "sender_type" => "bridge",
        "type" => to_string(envelope.type),
        "content" => envelope_content_to_map(envelope.content),
        "metadata" => %{
          "bridge_source" => bridge_source,
          "bridge_sender_id" => envelope.sender.id,
          "bridge_sender_name" => envelope.sender.display_name,
          "reply_to" => get_in_metadata(envelope, :reply_to)
        }
      }

      case Delivery.send_message(conversation.id, sender_id, message_params) do
        {:ok, _message} -> :ok
        {:error, reason} -> {:error, reason}
      end
    end
  end

  defp find_bridge_for_platform(platform, _external_sender_id) do
    query =
      from(b in BridgeConnection,
        where: b.platform == ^platform and b.status == :connected,
        limit: 1
      )

    case Repo.one(query) do
      nil -> {:error, :no_bridge_connection}
      bridge -> {:ok, bridge}
    end
  end

  defp find_or_create_bridge_conversation(bridge, envelope) do
    external_chat_id = envelope.conversation_id

    query =
      from(c in Conversation,
        where:
          c.bridge_id == ^bridge.id and
            c.type == :bridge and
            fragment("? ->> 'external_chat_id' = ?", c.metadata, ^external_chat_id),
        limit: 1
      )

    case Repo.one(query) do
      nil ->
        RaccoonChat.create_conversation(%{
          type: :bridge,
          bridge_id: bridge.id,
          creator_id: bridge.user_id,
          title: "#{bridge.platform} - #{envelope.sender.display_name}",
          metadata: %{
            "external_chat_id" => external_chat_id,
            "bridge_platform" => to_string(bridge.platform)
          }
        })

      conversation ->
        {:ok, conversation}
    end
  end

  defp envelope_content_to_map(nil), do: %{}

  defp envelope_content_to_map(content) do
    %{}
    |> maybe_put("text", Map.get(content, :text))
    |> maybe_put("media_url", Map.get(content, :media_url))
    |> maybe_put("code", Map.get(content, :code))
    |> maybe_put("language", Map.get(content, :language))
  end

  defp maybe_put(map, _key, nil), do: map
  defp maybe_put(map, key, value), do: Map.put(map, key, value)

  defp get_in_metadata(envelope, key) do
    case envelope.metadata do
      nil -> nil
      metadata -> Map.get(metadata, key)
    end
  end
end
