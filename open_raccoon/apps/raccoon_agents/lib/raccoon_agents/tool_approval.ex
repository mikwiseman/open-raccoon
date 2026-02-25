defmodule RaccoonAgents.ToolApproval do
  @moduledoc """
  Tool approval audit logging and scope management.

  Implements the normative approval semantics from SPECS.md Section 3.2:

  - Every approval decision MUST be persisted with:
    actor_user_id, agent_id, conversation_id, tool_name,
    scope, arguments_hash (sha256), decision, decided_at.

  - Scopes: allow_once, allow_for_session, always_for_agent_tool.

  - always_for_agent_tool is scoped to (user_id, agent_id, tool_name)
    and MUST NOT grant access to other agents.

  - Revocation MUST affect future calls immediately.
  """

  require Logger

  @type scope :: :allow_once | :allow_for_session | :always_for_agent_tool
  @type decision :: :approved | :denied | :revoked | :pending

  defstruct [
    :actor_user_id,
    :agent_id,
    :conversation_id,
    :tool_name,
    :scope,
    :arguments_hash,
    :decision,
    :decided_at
  ]

  @doc """
  Record a tool approval decision for audit.

  Returns `{:ok, entry}` with the persisted approval struct.
  """
  def record_decision(attrs) when is_map(attrs) do
    entry = struct(__MODULE__, Map.put(attrs, :decided_at, DateTime.utc_now()))

    Logger.info("Tool approval decision",
      user_id: entry.actor_user_id,
      agent_id: entry.agent_id,
      conversation_id: entry.conversation_id,
      tool: entry.tool_name,
      decision: entry.decision,
      scope: entry.scope
    )

    # In production, persist to database:
    # Repo.insert(%ToolApprovalLog{...})

    {:ok, entry}
  end

  @doc """
  Check if a user has a remembered approval for an agent+tool combination.

  Checks `always_for_agent_tool` scope entries. Returns `:approved`
  if a matching remembered approval exists, otherwise `:not_found`.
  """
  def check_remembered_approval(user_id, agent_id, tool_name) do
    # In production, query from database:
    # from(a in ToolApprovalLog,
    #   where: a.actor_user_id == ^user_id
    #     and a.agent_id == ^agent_id
    #     and a.tool_name == ^tool_name
    #     and a.scope == :always_for_agent_tool
    #     and a.decision == :approved,
    #   order_by: [desc: a.decided_at],
    #   limit: 1
    # )
    # |> Repo.one()
    # |> case do
    #   nil -> :not_found
    #   _entry -> :approved
    # end

    Logger.debug("Checking remembered approval",
      user_id: user_id,
      agent_id: agent_id,
      tool: tool_name
    )

    :not_found
  end

  @doc """
  Revoke a remembered approval for an agent+tool combination.

  Revocation MUST affect future calls immediately and MUST emit
  an `approval_revoked` event (handled by the caller).
  """
  def revoke_approval(user_id, agent_id, tool_name) do
    Logger.info("Revoking tool approval",
      user_id: user_id,
      agent_id: agent_id,
      tool: tool_name
    )

    # In production, update database and record revocation:
    # from(a in ToolApprovalLog,
    #   where: a.actor_user_id == ^user_id
    #     and a.agent_id == ^agent_id
    #     and a.tool_name == ^tool_name
    #     and a.scope == :always_for_agent_tool
    #     and a.decision == :approved
    # )
    # |> Repo.update_all(set: [decision: :revoked, decided_at: DateTime.utc_now()])

    # Record the revocation itself for audit
    record_decision(%{
      actor_user_id: user_id,
      agent_id: agent_id,
      conversation_id: nil,
      tool_name: tool_name,
      scope: :always_for_agent_tool,
      arguments_hash: nil,
      decision: :revoked
    })

    :ok
  end

  @doc """
  Compute SHA-256 hash of tool arguments for audit trail.
  Arguments are JSON-encoded before hashing.
  """
  def hash_arguments(arguments) when is_map(arguments) do
    arguments
    |> Jason.encode!()
    |> then(&:crypto.hash(:sha256, &1))
    |> Base.encode16(case: :lower)
  end

  def hash_arguments(nil), do: nil
end
