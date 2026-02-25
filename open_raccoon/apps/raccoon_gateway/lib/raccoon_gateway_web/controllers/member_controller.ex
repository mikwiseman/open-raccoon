defmodule RaccoonGatewayWeb.MemberController do
  use RaccoonGatewayWeb, :controller
  action_fallback RaccoonGatewayWeb.FallbackController

  alias RaccoonChat

  def index(conn, %{"conversation_id" => conversation_id}) do
    members = RaccoonChat.list_members(conversation_id)
    json(conn, %{items: Enum.map(members, &member_json/1)})
  end

  def create(conn, %{"conversation_id" => conversation_id} = params) do
    attrs = %{
      conversation_id: conversation_id,
      user_id: params["user_id"],
      role: params["role"] || :member,
      joined_at: DateTime.utc_now()
    }

    with {:ok, member} <- RaccoonChat.add_member(attrs) do
      conn
      |> put_status(:created)
      |> json(%{member: member_json(member)})
    end
  end

  def delete(conn, %{"conversation_id" => conversation_id, "user_id" => user_id}) do
    {_count, _} = RaccoonChat.remove_member(conversation_id, user_id)
    send_resp(conn, :no_content, "")
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
