defmodule RaccoonGateway.Workers.AgentExecutionWorker do
  @moduledoc """
  Oban worker for agent execution tasks.

  - Enqueue agent execution requests
  - Handle timeout/cleanup for stale agent sessions
  - Track agent execution metrics
  """

  use Oban.Worker,
    queue: :agents,
    max_attempts: 2

  require Logger

  @impl Oban.Worker
  def perform(%Oban.Job{
        args: %{
          "task" => "execute",
          "agent_id" => agent_id,
          "conversation_id" => conversation_id,
          "message" => message
        }
      }) do
    Logger.info("Executing agent #{agent_id} in conversation #{conversation_id}")

    case RaccoonShared.Repo.get(RaccoonAgents.Agent, agent_id) do
      nil ->
        {:discard, "Agent not found: #{agent_id}"}

      _agent ->
        # Placeholder: delegate to the agent runtime (Python sidecar)
        # via HTTP or gRPC call
        #
        # In production this would:
        # 1. Load agent config from DB
        # 2. Send execution request to Python runtime
        # 3. Stream responses back via PubSub
        # 4. Track execution time and tokens used

        started_at = System.monotonic_time(:millisecond)

        # Placeholder for actual agent execution
        _result = %{
          agent_id: agent_id,
          conversation_id: conversation_id,
          input: message,
          output: nil,
          status: :pending
        }

        elapsed_ms = System.monotonic_time(:millisecond) - started_at
        Logger.info("Agent #{agent_id} execution placeholder completed in #{elapsed_ms}ms")

        :ok
    end
  end

  def perform(%Oban.Job{args: %{"task" => "cleanup_stale", "older_than_minutes" => minutes}}) do
    Logger.info("Cleaning up stale agent sessions older than #{minutes} minutes")

    # Placeholder: find and terminate agent sessions that have been
    # running longer than the specified timeout
    :ok
  end

  def perform(%Oban.Job{args: args}) do
    {:error, "Unknown agent execution task: #{inspect(args)}"}
  end
end
