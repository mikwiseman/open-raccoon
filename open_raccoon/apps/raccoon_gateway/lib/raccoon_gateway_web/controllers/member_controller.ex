defmodule RaccoonGatewayWeb.MemberController do
  use RaccoonGatewayWeb, :controller
  action_fallback RaccoonGatewayWeb.FallbackController

  alias RaccoonChat
  alias RaccoonShared.Pagination

  @valid_roles ~w(owner admin member)

  def index(conn, %{"conversation_id" => conversation_id} = params) do
    user_id = conn.assigns.user_id
    {_cursor, limit} = Pagination.parse_params(params)

    with :ok <- ensure_member(conversation_id, user_id) do
      members = RaccoonChat.list_members(conversation_id)
      {items, page_info} = Pagination.build_page_info(Enum.take(members, limit + 1), limit)

      json(conn, %{
        items: Enum.map(items, &member_json/1),
        page_info: %{next_cursor: page_info.next_cursor, has_more: page_info.has_more}
      })
    end
  end

  def create(conn, %{"conversation_id" => conversation_id} = params) do
    user_id = conn.assigns.user_id
    role_str = params["role"] || "member"

    unless role_str in @valid_roles do
      conn
      |> put_status(:unprocessable_entity)
      |> json(%{error: "invalid_role", message: "role must be one of: owner, admin, member"})
      |> halt()
    else
      role = String.to_existing_atom(role_str)

      attrs = %{
        conversation_id: conversation_id,
        user_id: params["user_id"],
        role: role,
        joined_at: DateTime.utc_now()
      }

      with :ok <- ensure_moderator(conversation_id, user_id),
           {:ok, member} <- RaccoonChat.add_member(attrs) do
        conn
        |> put_status(:created)
        |> json(%{member: member_json(member)})
      end
    end
  end

  def delete(conn, %{"conversation_id" => conversation_id, "user_id" => user_id}) do
    requester_id = conn.assigns.user_id

    with :ok <- ensure_moderator(conversation_id, requester_id) do
      {_count, _} = RaccoonChat.remove_member(conversation_id, user_id)
      send_resp(conn, :no_content, "")
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

  defp member_json(member) do
    base = %{
      id: member.id,
      conversation_id: member.conversation_id,
      user_id: member.user_id,
      role: member.role,
      muted: member.muted,
      last_read_at: member.last_read_at,
      joined_at: member.joined_at
    }

    # Include user data if preloaded
    if Ecto.assoc_loaded?(member.user) and member.user do
      Map.put(base, :user, %{
        id: member.user.id,
        username: member.user.username,
        display_name: member.user.display_name,
        avatar_url: member.user.avatar_url
      })
    else
      base
    end
  end
end
