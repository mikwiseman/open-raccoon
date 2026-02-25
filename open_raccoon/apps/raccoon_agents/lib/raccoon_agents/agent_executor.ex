defmodule RaccoonAgents.AgentExecutor do
  @moduledoc """
  Sends gRPC request to Python sidecar, streams response events to the
  agent:{conversation_id} PubSub topic for pickup by AgentChannel.

  ## Lifecycle

  1. `execute/5` spawns a short-lived GenServer.
  2. The GenServer opens a gRPC stream to the Python sidecar.
  3. Each streamed event is broadcast to `agent:{conversation_id}`.
  4. On stream completion or error the process terminates normally.

  ## Events broadcast

  See `RaccoonGatewayWeb.AgentChannel` for the full event catalogue:
  token, status, tool_call, tool_result, code_block,
  approval_requested, complete, error.
  """

  use GenServer
  require Logger

  alias RaccoonAgents.{CostTracker, ToolApproval}

  defstruct [:conversation_id, :agent_id, :user_id, :channel_pid]

  # ── Public API ──────────────────────────────────────────────────────

  @doc """
  Start agent execution for a conversation.

  Returns `{:ok, pid}` of the executor process.
  """
  def execute(conversation_id, agent_id, user_id, messages, config) do
    {:ok, pid} =
      start_link(%{
        conversation_id: conversation_id,
        agent_id: agent_id,
        user_id: user_id
      })

    GenServer.cast(pid, {:execute, messages, config})
    {:ok, pid}
  end

  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts)
  end

  # ── Callbacks ───────────────────────────────────────────────────────

  @impl true
  def init(opts) do
    {:ok, struct(__MODULE__, opts)}
  end

  @impl true
  def handle_cast({:execute, _messages, _config}, state) do
    Logger.info("Starting agent execution",
      conversation_id: state.conversation_id,
      agent_id: state.agent_id
    )

    topic = "agent:#{state.conversation_id}"

    # In production this opens a gRPC stream to the Python sidecar:
    #
    #   {:ok, stream} = RaccoonAgents.GRPCClient.execute_agent(%{
    #     conversation_id: state.conversation_id,
    #     agent_id: state.agent_id,
    #     messages: messages,
    #     config: config,
    #     user_api_key: ""
    #   })
    #
    #   Enum.each(stream, fn event ->
    #     broadcast_event(topic, event, state)
    #   end)
    #
    # For now, emit a thinking status so the channel wiring can be tested.

    broadcast(topic, "status", %{
      message: "thinking about this...",
      category: "thinking"
    })

    # After gRPC stream completes, record token usage
    # CostTracker.record_usage(state.user_id, state.agent_id, %{
    #   input_tokens: complete_event.input_tokens,
    #   output_tokens: complete_event.output_tokens,
    #   model: complete_event.model
    # })

    {:stop, :normal, state}
  end

  # ── Helpers ─────────────────────────────────────────────────────────

  defp broadcast(topic, event_name, payload) do
    Phoenix.PubSub.broadcast(
      RaccoonGateway.PubSub,
      topic,
      %{event: event_name, payload: payload}
    )
  end

  @doc false
  def broadcast_event(topic, event, state) do
    case event do
      %{type: "token", text: text} ->
        broadcast(topic, "token", %{text: text})

      %{type: "status", message: message, category: category} ->
        broadcast(topic, "status", %{message: message, category: category})

      %{type: "tool_call", request_id: rid, tool_name: tool, arguments: args} ->
        broadcast(topic, "tool_call", %{
          request_id: rid,
          tool: tool,
          args: args
        })

      %{type: "tool_result", request_id: rid, tool_name: tool, result: result, is_error: err} ->
        broadcast(topic, "tool_result", %{
          request_id: rid,
          tool: tool,
          result: result,
          is_error: err
        })

      %{type: "code_block", language: lang, code: code} ->
        broadcast(topic, "code_block", %{language: lang, code: code})

      %{type: "approval_requested"} = approval ->
        # Record that approval was requested (audit trail)
        ToolApproval.record_decision(%{
          actor_user_id: state.user_id,
          agent_id: state.agent_id,
          conversation_id: state.conversation_id,
          tool_name: approval.tool_name,
          scope: nil,
          arguments_hash: ToolApproval.hash_arguments(approval.arguments_preview),
          decision: :pending
        })

        broadcast(topic, "approval_requested", %{
          request_id: approval.request_id,
          tool: approval.tool_name,
          args_preview: approval.arguments_preview,
          scopes: approval.available_scopes
        })

      %{type: "complete"} = complete ->
        # Record token usage with cost tracker
        CostTracker.record_usage(state.user_id, state.agent_id, %{
          input_tokens: Map.get(complete, :prompt_tokens, 0),
          output_tokens: Map.get(complete, :completion_tokens, 0),
          model: Map.get(complete, :model, "unknown")
        })

        broadcast(topic, "complete", %{
          input_tokens: Map.get(complete, :prompt_tokens, 0),
          output_tokens: Map.get(complete, :completion_tokens, 0),
          model: Map.get(complete, :model, "unknown"),
          stop_reason: Map.get(complete, :stop_reason, "end_turn")
        })

      %{type: "error", code: code, message: message} ->
        broadcast(topic, "error", %{code: code, message: message})

      other ->
        Logger.warning("Unknown agent event type", event: inspect(other))
    end
  end
end
