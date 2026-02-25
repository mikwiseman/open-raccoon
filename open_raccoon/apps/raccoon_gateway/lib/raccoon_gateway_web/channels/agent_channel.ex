defmodule RaccoonGatewayWeb.AgentChannel do
  @moduledoc """
  Channel for agent streaming events and tool approval flow.

  Client -> Server events:
    - approval_decision: {request_id, decision, scope}

  Server -> Client events (pushed from AgentExecutor via PubSub):
    - token:              {text}
    - status:             {message}
    - approval_requested: {request_id, tool, args_preview, scopes}
    - approval_granted:   {request_id, scope}
    - approval_denied:    {request_id, reason_code}
    - approval_revoked:   {tool, scope}
    - tool_call:          {tool, args}
    - tool_result:        {tool, result}
    - code_block:         {language, code}
    - complete:           {message}
    - error:              {message}
  """

  use RaccoonGatewayWeb, :channel

  @impl true
  def join("agent:" <> conversation_id, _params, socket) do
    user_id = socket.assigns.user_id

    case RaccoonChat.get_membership(conversation_id, user_id) do
      nil ->
        {:error, %{reason: "not_a_member"}}

      _member ->
        {:ok, assign(socket, :conversation_id, conversation_id)}
    end
  end

  # Client approves/denies a tool call
  @impl true
  def handle_in("approval_decision", payload, socket) do
    %{"request_id" => request_id, "decision" => decision} = payload
    scope = Map.get(payload, "scope", "allow_once")

    event =
      case decision do
        "approve" -> "approval_granted"
        "deny" -> "approval_denied"
      end

    broadcast!(socket, event, %{
      request_id: request_id,
      scope: scope,
      user_id: socket.assigns.user_id
    })

    {:reply, :ok, socket}
  end
end
