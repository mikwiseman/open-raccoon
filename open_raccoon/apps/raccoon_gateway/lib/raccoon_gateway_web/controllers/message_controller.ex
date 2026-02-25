defmodule RaccoonGatewayWeb.MessageController do
  use RaccoonGatewayWeb, :controller
  action_fallback RaccoonGatewayWeb.FallbackController

  alias RaccoonChat
  alias RaccoonShared.{Pagination, Idempotency}

  plug RaccoonGatewayWeb.Plugs.Idempotency when action in [:create]

  def index(conn, %{"conversation_id" => conversation_id} = params) do
    {_cursor, limit} = Pagination.parse_params(params)

    messages = RaccoonChat.get_messages(conversation_id, limit: limit)
    {items, page_info} = Pagination.build_page_info(messages, limit)

    json(conn, %{
      items: Enum.map(items, &message_json/1),
      page_info: %{next_cursor: page_info.next_cursor, has_more: page_info.has_more}
    })
  end

  def create(conn, %{"conversation_id" => conversation_id} = params) do
    user_id = conn.assigns.user_id

    message_params = %{
      "sender_type" => "human",
      "type" => params["type"] || "text",
      "content" => params["content"],
      "metadata" => params["metadata"] || %{}
    }

    with {:ok, message} <- RaccoonChat.send_message(conversation_id, user_id, message_params) do
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
end
