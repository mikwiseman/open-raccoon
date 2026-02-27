defmodule RaccoonGatewayWeb.MessageController do
  use RaccoonGatewayWeb, :controller
  action_fallback RaccoonGatewayWeb.FallbackController

  alias RaccoonChat
  alias RaccoonShared.{Pagination, Idempotency}

  plug RaccoonGatewayWeb.Plugs.Idempotency when action in [:create]

  def index(conn, %{"conversation_id" => conversation_id} = params) do
    user_id = conn.assigns.user_id
    {cursor, limit} = Pagination.parse_params(params)

    with :ok <- ensure_member(conversation_id, user_id) do
      messages = RaccoonChat.get_messages(conversation_id, limit: limit, cursor: cursor)
      {items, page_info} = Pagination.build_page_info(messages, limit)

      json(conn, %{
        items: Enum.map(items, &message_json/1),
        page_info: %{next_cursor: page_info.next_cursor, has_more: page_info.has_more}
      })
    end
  end

  def create(conn, %{"conversation_id" => conversation_id} = params) do
    user_id = conn.assigns.user_id

    message_params = %{
      "sender_type" => "human",
      "type" => params["type"] || "text",
      "content" => params["content"],
      "metadata" => params["metadata"] || %{}
    }

    with :ok <- ensure_member(conversation_id, user_id),
         {:ok, message} <- RaccoonChat.send_message(conversation_id, user_id, message_params) do
      # Store idempotency result
      if idempotency_key = conn.assigns[:idempotency_key] do
        response = %{message: message_json(message)}

        Idempotency.store(
          RaccoonShared.Repo,
          idempotency_key,
          user_id,
          201,
          response
        )
      end

      conn
      |> put_status(:created)
      |> json(%{message: message_json(message)})
    end
  end

  def update(conn, %{"conversation_id" => conversation_id, "id" => message_id} = params) do
    user_id = conn.assigns.user_id

    with :ok <- ensure_member(conversation_id, user_id),
         {:ok, message} <- fetch_conversation_message(conversation_id, message_id),
         :ok <- ensure_sender(message, user_id),
         {:ok, updated} <-
           RaccoonChat.update_message(message, %{
             content: params["content"],
             edited_at: DateTime.utc_now()
           }) do
      Phoenix.PubSub.broadcast(
        RaccoonGateway.PubSub,
        "conversation:#{conversation_id}",
        {:message_updated, updated}
      )

      json(conn, %{message: message_json(updated)})
    else
      nil -> {:error, :not_found}
      error -> error
    end
  end

  def delete(conn, %{"conversation_id" => conversation_id, "id" => message_id}) do
    user_id = conn.assigns.user_id

    with :ok <- ensure_member(conversation_id, user_id),
         {:ok, message} <- fetch_conversation_message(conversation_id, message_id),
         :ok <- ensure_sender_or_admin(message, conversation_id, user_id),
         {:ok, deleted} <- RaccoonChat.soft_delete_message(message) do
      Phoenix.PubSub.broadcast(
        RaccoonGateway.PubSub,
        "conversation:#{conversation_id}",
        {:message_deleted, deleted}
      )

      json(conn, %{message: message_json(deleted)})
    else
      error -> error
    end
  end

  defp ensure_member(conversation_id, user_id) do
    case RaccoonChat.get_membership(conversation_id, user_id) do
      nil -> {:error, :forbidden}
      _member -> :ok
    end
  end

  defp ensure_sender(message, user_id) do
    if message.sender_id == user_id, do: :ok, else: {:error, :forbidden}
  end

  defp ensure_sender_or_admin(message, conversation_id, user_id) do
    if message.sender_id == user_id do
      :ok
    else
      case RaccoonChat.get_membership(conversation_id, user_id) do
        %{role: role} when role in [:owner, :admin] -> :ok
        _ -> {:error, :forbidden}
      end
    end
  end

  defp message_json(message) do
    %{
      id: message.id,
      conversation_id: message.conversation_id,
      sender_id: message.sender_id,
      sender_type: message.sender_type,
      type: message.type,
      content: message.content,
      metadata: message.metadata,
      edited_at: message.edited_at,
      deleted_at: message.deleted_at,
      created_at: message.created_at
    }
  end

  defp fetch_conversation_message(conversation_id, message_id) do
    case RaccoonChat.get_message_in_conversation(conversation_id, message_id) do
      nil -> {:error, :not_found}
      message -> {:ok, message}
    end
  end
end
