defmodule RaccoonGatewayWeb.ConversationController do
  use RaccoonGatewayWeb, :controller
  action_fallback RaccoonGatewayWeb.FallbackController

  alias RaccoonChat
  alias RaccoonShared.Pagination

  def index(conn, params) do
    user_id = conn.assigns.user_id
    {cursor, limit} = Pagination.parse_params(params)

    conversations =
      user_id
      |> RaccoonChat.list_user_conversations()
      |> maybe_apply_cursor(cursor)
      |> Enum.take(limit + 1)

    {items, page_info} = Pagination.build_page_info(conversations, limit)

    json(conn, %{
      items: Enum.map(items, &conversation_json/1),
      page_info: %{next_cursor: page_info.next_cursor, has_more: page_info.has_more}
    })
  end

  def create(conn, params) do
    user_id = conn.assigns.user_id
    attrs = Map.put(params, "creator_id", user_id)

    # DM idempotency: if creating a DM, check if one already exists between these users
    case check_dm_idempotency(attrs, user_id) do
      {:error, :member_id_required} ->
        validation_error(conn, "member_id", "is required for dm conversations")

      {:error, :member_id_self} ->
        validation_error(conn, "member_id", "must be another user")

      {:existing, conversation} ->
        json(conn, %{conversation: conversation_json(conversation)})

      {:proceed, dm_member_id} ->
        members =
          [%{user_id: user_id, role: :owner}] ++
            if(dm_member_id, do: [%{user_id: dm_member_id, role: :member}], else: [])

        with {:ok, conversation} <- RaccoonChat.create_conversation_with_members(attrs, members) do
          conn
          |> put_status(:created)
          |> json(%{conversation: conversation_json(conversation)})
        end
    end
  end

  def show(conn, %{"id" => id}) do
    user_id = conn.assigns.user_id

    case RaccoonChat.get_conversation(id) do
      nil ->
        {:error, :not_found}

      conversation ->
        with :ok <- ensure_member(id, user_id) do
          json(conn, %{conversation: conversation_json(conversation)})
        end
    end
  end

  def update(conn, %{"id" => id} = params) do
    user_id = conn.assigns.user_id

    case RaccoonChat.get_conversation(id) do
      nil ->
        {:error, :not_found}

      conversation ->
        allowed_keys = ["title", "avatar_url", "metadata"]
        update_params = Map.take(params, allowed_keys)

        with :ok <- ensure_moderator(id, user_id),
             {:ok, updated} <- RaccoonChat.update_conversation(conversation, update_params) do
          json(conn, %{conversation: conversation_json(updated)})
        end
    end
  end

  def delete(conn, %{"id" => id}) do
    user_id = conn.assigns.user_id

    case RaccoonChat.get_conversation(id) do
      nil ->
        {:error, :not_found}

      conversation ->
        with :ok <- ensure_moderator(id, user_id),
             {:ok, _} <- RaccoonChat.delete_conversation(conversation) do
          send_resp(conn, :no_content, "")
        end
    end
  end

  defp check_dm_idempotency(attrs, user_id) do
    case normalize_conversation_type(attrs) do
      :dm ->
        other_user_id = Map.get(attrs, "member_id") || Map.get(attrs, :member_id)

        cond do
          is_nil(other_user_id) ->
            {:error, :member_id_required}

          other_user_id == user_id ->
            {:error, :member_id_self}

          true ->
            case RaccoonChat.find_dm_between(user_id, other_user_id) do
              nil -> {:proceed, other_user_id}
              conversation -> {:existing, conversation}
            end
        end

      _ ->
        {:proceed, nil}
    end
  end

  defp maybe_apply_cursor(conversations, nil), do: conversations

  defp maybe_apply_cursor(conversations, cursor) do
    case Pagination.decode_cursor(cursor) do
      {:ok, cursor_id} ->
        Enum.drop_while(conversations, fn c -> c.id != cursor_id end)
        |> Enum.drop(1)

      :error ->
        conversations
    end
  end

  defp ensure_member(conversation_id, user_id) do
    case RaccoonChat.get_membership(conversation_id, user_id) do
      nil -> {:error, :forbidden}
      _member -> :ok
    end
  end

  defp ensure_moderator(conversation_id, user_id) do
    case RaccoonChat.get_membership(conversation_id, user_id) do
      %{role: role} when role in [:owner, :admin] -> :ok
      _ -> {:error, :forbidden}
    end
  end

  defp conversation_json(conversation) do
    %{
      id: conversation.id,
      type: conversation.type,
      title: conversation.title,
      avatar_url: conversation.avatar_url,
      creator_id: conversation.creator_id,
      agent_id: conversation.agent_id,
      bridge_id: conversation.bridge_id,
      metadata: conversation.metadata,
      last_message_at: conversation.last_message_at,
      created_at: conversation.inserted_at,
      updated_at: conversation.updated_at
    }
  end

  defp normalize_conversation_type(attrs) do
    case Map.get(attrs, "type") || Map.get(attrs, :type) do
      :dm -> :dm
      "dm" -> :dm
      _ -> :other
    end
  end

  defp validation_error(conn, field, message) do
    conn
    |> put_status(:unprocessable_entity)
    |> json(%{
      error: %{
        code: "validation_failed",
        message: "Validation failed",
        details: %{field => [message]}
      }
    })
    |> halt()
  end
end
