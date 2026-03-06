defmodule WaiAgentsAgents.ToolApprovalPersistenceTest do
  use ExUnit.Case, async: false

  alias WaiAgentsAgents.ToolApproval
  alias WaiAgentsAgents.ToolApproval.Store
  alias WaiAgentsShared.Repo

  setup do
    :ok = Ecto.Adapters.SQL.Sandbox.checkout(Repo)
    Ecto.Adapters.SQL.Sandbox.mode(Repo, {:shared, self()})

    ids = %{
      user_1: Ecto.UUID.generate(),
      agent_1: Ecto.UUID.generate(),
      conversation_1: Ecto.UUID.generate(),
      user_2: Ecto.UUID.generate(),
      agent_2: Ecto.UUID.generate(),
      conversation_2: Ecto.UUID.generate()
    }

    # Clean up ETS entries used in tests
    on_exit(fn ->
      Store.delete(ids.user_1, ids.agent_1, "test_tool")
      Store.delete(ids.user_2, ids.agent_2, "another_tool")
    end)

    {:ok, ids: ids}
  end

  test "Store is running" do
    assert Process.whereis(Store) != nil
  end

  test "record_decision inserts into ETS", %{ids: ids} do
    {:ok, entry} =
      ToolApproval.record_decision(%{
        actor_user_id: ids.user_1,
        agent_id: ids.agent_1,
        conversation_id: ids.conversation_1,
        tool_name: "test_tool",
        scope: :always_for_agent_tool,
        arguments_hash: nil,
        decision: :approved
      })

    assert entry.actor_user_id == ids.user_1
    assert entry.decision == :approved
    assert entry.scope == :always_for_agent_tool
    assert entry.decided_at != nil

    # Verify ETS lookup works
    assert :approved = Store.lookup(ids.user_1, ids.agent_1, "test_tool")
  end

  test "lookup returns :not_found for non-existent entry" do
    assert :not_found = Store.lookup("no-user", "no-agent", "no-tool")
  end

  test "lookup only matches always_for_agent_tool approved entries", %{ids: ids} do
    ToolApproval.record_decision(%{
      actor_user_id: ids.user_2,
      agent_id: ids.agent_2,
      conversation_id: ids.conversation_2,
      tool_name: "another_tool",
      scope: :allow_once,
      arguments_hash: nil,
      decision: :approved
    })

    # allow_once should not be returned as a remembered approval
    assert :not_found = Store.lookup(ids.user_2, ids.agent_2, "another_tool")
  end

  test "delete removes entry from ETS", %{ids: ids} do
    ToolApproval.record_decision(%{
      actor_user_id: ids.user_1,
      agent_id: ids.agent_1,
      conversation_id: nil,
      tool_name: "test_tool",
      scope: :always_for_agent_tool,
      arguments_hash: nil,
      decision: :approved
    })

    assert :approved = Store.lookup(ids.user_1, ids.agent_1, "test_tool")

    Store.delete(ids.user_1, ids.agent_1, "test_tool")
    assert :not_found = Store.lookup(ids.user_1, ids.agent_1, "test_tool")
  end

  test "hash_arguments produces consistent SHA-256 hashes" do
    hash1 = ToolApproval.hash_arguments(%{"key" => "value"})
    hash2 = ToolApproval.hash_arguments(%{"key" => "value"})
    assert hash1 == hash2
    assert is_binary(hash1)
    assert String.length(hash1) == 64
  end

  test "hash_arguments returns nil for nil input" do
    assert nil == ToolApproval.hash_arguments(nil)
  end
end
