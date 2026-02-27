defmodule RaccoonGatewayWeb.ConversationAccessControlTest do
  use RaccoonGatewayWeb.ConnCase, async: false

  alias RaccoonAccounts
  alias RaccoonAccounts.Token
  alias RaccoonChat
  alias RaccoonShared.Repo

  setup %{conn: conn} do
    :ok = Ecto.Adapters.SQL.Sandbox.checkout(Repo)
    Ecto.Adapters.SQL.Sandbox.mode(Repo, {:shared, self()})

    owner = create_user!("owner")
    member = create_user!("member")
    outsider = create_user!("outsider")

    {:ok, conversation} =
      RaccoonChat.create_conversation(%{
        "type" => "group",
        "title" => "Auth Test Conversation",
        "creator_id" => owner.id
      })

    {:ok, _owner_membership} =
      RaccoonChat.add_member(%{
        conversation_id: conversation.id,
        user_id: owner.id,
        role: :owner,
        joined_at: DateTime.utc_now()
      })

    {:ok, _member_membership} =
      RaccoonChat.add_member(%{
        conversation_id: conversation.id,
        user_id: member.id,
        role: :member,
        joined_at: DateTime.utc_now()
      })

    {:ok, _message} =
      RaccoonChat.send_message(conversation.id, owner.id, %{
        "sender_type" => "human",
        "type" => "text",
        "content" => %{"text" => "seed message"}
      })

    {:ok, other_conversation} =
      RaccoonChat.create_conversation(%{
        "type" => "group",
        "title" => "Secondary Conversation",
        "creator_id" => owner.id
      })

    {:ok, _other_owner_membership} =
      RaccoonChat.add_member(%{
        conversation_id: other_conversation.id,
        user_id: owner.id,
        role: :owner,
        joined_at: DateTime.utc_now()
      })

    {:ok, _other_outsider_membership} =
      RaccoonChat.add_member(%{
        conversation_id: other_conversation.id,
        user_id: outsider.id,
        role: :member,
        joined_at: DateTime.utc_now()
      })

    {:ok, other_message} =
      RaccoonChat.send_message(other_conversation.id, owner.id, %{
        "sender_type" => "human",
        "type" => "text",
        "content" => %{"text" => "other conversation message"}
      })

    {:ok, %{access_token: owner_token}} = Token.create_tokens(owner)
    {:ok, %{access_token: member_token}} = Token.create_tokens(member)
    {:ok, %{access_token: outsider_token}} = Token.create_tokens(outsider)

    {:ok,
     conn: conn,
     owner: owner,
     member: member,
     outsider: outsider,
     conversation: conversation,
     owner_token: owner_token,
     member_token: member_token,
     outsider_token: outsider_token,
     other_conversation: other_conversation,
     other_message: other_message}
  end

  test "outsider cannot read or send messages", %{
    conn: conn,
    conversation: conversation,
    outsider_token: outsider_token
  } do
    conn =
      conn
      |> authed_json_conn(outsider_token)
      |> get("/api/v1/conversations/#{conversation.id}/messages")

    assert json_response(conn, 403)["error"]["code"] == "forbidden"

    conn =
      conn
      |> authed_json_conn(outsider_token)
      |> post("/api/v1/conversations/#{conversation.id}/messages", %{
        "type" => "text",
        "content" => %{"text" => "blocked"}
      })

    assert json_response(conn, 403)["error"]["code"] == "forbidden"
  end

  test "removed member loses read/send access immediately", %{
    conn: conn,
    conversation: conversation,
    member: member,
    owner_token: owner_token,
    member_token: member_token
  } do
    conn =
      conn
      |> authed_json_conn(owner_token)
      |> delete("/api/v1/conversations/#{conversation.id}/members/#{member.id}")

    assert response(conn, 204)

    conn =
      conn
      |> authed_json_conn(member_token)
      |> get("/api/v1/conversations/#{conversation.id}/messages")

    assert json_response(conn, 403)["error"]["code"] == "forbidden"

    conn =
      conn
      |> authed_json_conn(member_token)
      |> post("/api/v1/conversations/#{conversation.id}/messages", %{
        "type" => "text",
        "content" => %{"text" => "should not send"}
      })

    assert json_response(conn, 403)["error"]["code"] == "forbidden"
  end

  test "non-members cannot view/update/delete conversation", %{
    conn: conn,
    conversation: conversation,
    outsider_token: outsider_token
  } do
    conn =
      conn
      |> authed_json_conn(outsider_token)
      |> get("/api/v1/conversations/#{conversation.id}")

    assert json_response(conn, 403)["error"]["code"] == "forbidden"

    conn =
      conn
      |> authed_json_conn(outsider_token)
      |> patch("/api/v1/conversations/#{conversation.id}", %{"title" => "hijack"})

    assert json_response(conn, 403)["error"]["code"] == "forbidden"

    conn =
      conn
      |> authed_json_conn(outsider_token)
      |> delete("/api/v1/conversations/#{conversation.id}")

    assert json_response(conn, 403)["error"]["code"] == "forbidden"
  end

  test "non-moderators cannot add or remove members", %{
    conn: conn,
    conversation: conversation,
    owner: owner,
    outsider: outsider,
    member_token: member_token
  } do
    conn =
      conn
      |> authed_json_conn(member_token)
      |> post("/api/v1/conversations/#{conversation.id}/members", %{"user_id" => outsider.id})

    assert json_response(conn, 403)["error"]["code"] == "forbidden"

    conn =
      conn
      |> authed_json_conn(member_token)
      |> delete("/api/v1/conversations/#{conversation.id}/members/#{owner.id}")

    assert json_response(conn, 403)["error"]["code"] == "forbidden"
  end

  test "message update/delete requires message to belong to path conversation", %{
    conn: conn,
    conversation: conversation,
    other_message: other_message,
    owner_token: owner_token
  } do
    conn =
      conn
      |> authed_json_conn(owner_token)
      |> patch("/api/v1/conversations/#{conversation.id}/messages/#{other_message.id}", %{
        "content" => %{"text" => "invalid path update"}
      })

    assert json_response(conn, 404)["error"]["code"] == "not_found"

    conn =
      conn
      |> authed_json_conn(owner_token)
      |> delete("/api/v1/conversations/#{conversation.id}/messages/#{other_message.id}")

    assert json_response(conn, 404)["error"]["code"] == "not_found"
  end

  test "dm creation validates member_id and is idempotent", %{
    conn: conn,
    owner: owner,
    member: member,
    owner_token: owner_token
  } do
    conn =
      conn
      |> authed_json_conn(owner_token)
      |> post("/api/v1/conversations", %{"type" => "dm"})

    assert conn.status == 422
    assert json_response(conn, 422)["error"]["code"] == "validation_failed"

    conn =
      conn
      |> authed_json_conn(owner_token)
      |> post("/api/v1/conversations", %{"type" => "dm", "member_id" => member.id})

    assert conn.status == 201
    created_id = json_response(conn, 201)["conversation"]["id"]

    assert %{} = RaccoonChat.get_membership(created_id, owner.id)
    assert %{} = RaccoonChat.get_membership(created_id, member.id)

    conn =
      conn
      |> authed_json_conn(owner_token)
      |> post("/api/v1/conversations", %{"type" => "dm", "member_id" => member.id})

    assert conn.status == 200
    assert json_response(conn, 200)["conversation"]["id"] == created_id
    assert length(RaccoonChat.list_members(created_id)) == 2
  end

  defp authed_json_conn(conn, token) do
    conn
    |> recycle()
    |> put_req_header("accept", "application/json")
    |> put_req_header("authorization", "Bearer #{token}")
  end

  defp create_user!(prefix) do
    unique = System.unique_integer([:positive])

    attrs = %{
      username: "#{prefix}_#{unique}",
      email: "#{prefix}_#{unique}@example.test",
      password: "Passw0rd!#{unique}"
    }

    {:ok, user} = RaccoonAccounts.register_user(attrs)
    user
  end
end
