defmodule RaccoonAgents.CostTracker do
  @moduledoc """
  Token counting and spending limits.

  Tracks per-user token usage across agents and enforces spending limits.
  Usage is persisted to the `agent_usage_logs` table on every recording,
  and in-memory aggregates are kept in GenServer state for fast limit checks.
  On startup, aggregates are rebuilt from the database.
  """

  use GenServer
  require Logger

  alias RaccoonShared.Repo
  alias RaccoonAgents.AgentUsageLog
  import Ecto.Query

  # -- Public API ------------------------------------------------------------

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @doc """
  Record token usage for a user and agent.

  `tokens` is a map with :input_tokens, :output_tokens, and :model.
  Persists to the database and updates in-memory aggregates.
  """
  def record_usage(user_id, agent_id, tokens) when is_map(tokens) do
    GenServer.cast(__MODULE__, {:record, user_id, agent_id, tokens})
  end

  @doc """
  Get total token usage for a user.

  Returns a map with :input_tokens and :output_tokens totals.
  """
  def get_usage(user_id) do
    GenServer.call(__MODULE__, {:get_usage, user_id})
  end

  @doc """
  Check if a user is within their spending limit.

  Returns :ok or {:error, :limit_exceeded}.
  """
  def check_limit(user_id) do
    GenServer.call(__MODULE__, {:check_limit, user_id})
  end

  @doc """
  Set a token usage limit for a user.
  """
  def set_limit(user_id, max_tokens) do
    GenServer.call(__MODULE__, {:set_limit, user_id, max_tokens})
  end

  # -- GenServer callbacks ---------------------------------------------------

  @impl true
  def init(_opts) do
    usage = load_aggregates_from_db()

    {:ok,
     %{
       usage: usage,
       limits: %{}
     }}
  end

  @impl true
  def handle_cast({:record, user_id, agent_id, tokens}, state) do
    input_tokens = Map.get(tokens, :input_tokens, 0)
    output_tokens = Map.get(tokens, :output_tokens, 0)
    model = Map.get(tokens, :model, "unknown")
    total = input_tokens + output_tokens

    Logger.info("Recording token usage",
      user_id: user_id,
      agent_id: agent_id,
      input_tokens: input_tokens,
      output_tokens: output_tokens,
      model: model
    )

    # Persist to database
    persist_usage_log(user_id, agent_id, model, input_tokens, output_tokens)

    # Update in-memory aggregates
    current = Map.get(state.usage, user_id, %{input_tokens: 0, output_tokens: 0, total: 0})

    updated = %{
      input_tokens: current.input_tokens + input_tokens,
      output_tokens: current.output_tokens + output_tokens,
      total: current.total + total
    }

    {:noreply, put_in(state, [:usage, user_id], updated)}
  end

  @impl true
  def handle_call({:get_usage, user_id}, _from, state) do
    usage = Map.get(state.usage, user_id, %{input_tokens: 0, output_tokens: 0, total: 0})
    {:reply, usage, state}
  end

  @impl true
  def handle_call({:check_limit, user_id}, _from, state) do
    usage = Map.get(state.usage, user_id, %{total: 0})
    limit = Map.get(state.limits, user_id, :infinity)

    result =
      if limit == :infinity do
        :ok
      else
        if usage.total < limit, do: :ok, else: {:error, :limit_exceeded}
      end

    {:reply, result, state}
  end

  @impl true
  def handle_call({:set_limit, user_id, max_tokens}, _from, state) do
    {:reply, :ok, put_in(state, [:limits, user_id], max_tokens)}
  end

  # -- Private ---------------------------------------------------------------

  defp persist_usage_log(user_id, agent_id, model, input_tokens, output_tokens) do
    attrs = %{
      user_id: user_id,
      agent_id: agent_id,
      model: model,
      input_tokens: input_tokens,
      output_tokens: output_tokens
    }

    case %AgentUsageLog{} |> AgentUsageLog.changeset(attrs) |> Repo.insert() do
      {:ok, _log} ->
        :ok

      {:error, changeset} ->
        Logger.error("Failed to persist usage log",
          error: inspect(changeset.errors),
          user_id: user_id,
          agent_id: agent_id
        )
    end
  end

  defp load_aggregates_from_db do
    query =
      from(l in AgentUsageLog,
        group_by: l.user_id,
        select: {l.user_id, sum(l.input_tokens), sum(l.output_tokens)}
      )

    query
    |> Repo.all()
    |> Map.new(fn {user_id, input, output} ->
      input_tokens = input || 0
      output_tokens = output || 0

      {user_id,
       %{
         input_tokens: input_tokens,
         output_tokens: output_tokens,
         total: input_tokens + output_tokens
       }}
    end)
  rescue
    _ ->
      Logger.warning("Could not load usage aggregates from database, starting with empty state")
      %{}
  end
end
