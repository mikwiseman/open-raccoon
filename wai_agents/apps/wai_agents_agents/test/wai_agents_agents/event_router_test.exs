defmodule WaiAgentsAgents.EventRouterTest do
  use ExUnit.Case, async: false

  alias WaiAgentsAccounts
  alias WaiAgentsAgents
  alias WaiAgentsAgents.EventRouter
  alias WaiAgentsShared.Repo

  setup do
    :ok = Ecto.Adapters.SQL.Sandbox.checkout(Repo)
    Ecto.Adapters.SQL.Sandbox.mode(Repo, {:shared, self()})

    unique = System.unique_integer([:positive])

    {:ok, user} =
      WaiAgentsAccounts.register_user(%{
        username: "event_router_user_#{unique}",
        email: "event_router_user_#{unique}@example.com",
        password: "TestPass123!"
      })

    {:ok, agent} =
      WaiAgentsAgents.create_agent(%{
        creator_id: user.id,
        name: "Event Router Agent #{unique}",
        slug: "event-router-agent-#{unique}",
        system_prompt: "You are a test agent."
      })

    {:ok,
     payload: %{
       agent_id: agent.id,
       user_id: user.id,
       messages: [],
       config: %{}
     }}
  end

  test "EventRouter is running" do
    assert Process.whereis(EventRouter) != nil
  end

  test "route_trigger accepts valid trigger types", %{payload: payload} do
    valid_types = [:user_message, :cron_schedule, :webhook, :channel_message, :api_call]

    for type <- valid_types do
      # route_trigger returns :ok from GenServer.cast (async, fire-and-forget).
      # The actual execution will fail because there's no real agent in test,
      # but the cast itself should succeed without raising.
      assert :ok =
               EventRouter.route_trigger(
                 type,
                 Map.put(payload, :conversation_id, Ecto.UUID.generate())
               )
    end

    # Let the async cast drain before sandbox teardown so the spawned process
    # can read the seeded agent record.
    Process.sleep(100)
  end

  test "route_trigger rejects invalid trigger types" do
    assert_raise FunctionClauseError, fn ->
      EventRouter.route_trigger(:invalid_type, %{})
    end
  end
end
