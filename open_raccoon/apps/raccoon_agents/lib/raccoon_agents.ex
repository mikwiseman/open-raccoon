defmodule RaccoonAgents do
  @moduledoc """
  Agent context: agent CRUD, ratings, marketplace queries.
  """

  alias RaccoonShared.Repo
  alias RaccoonAgents.{Agent, AgentRating}
  import Ecto.Query
  require Logger

  # --- Agents ---

  def create_agent(attrs) do
    %Agent{}
    |> Agent.changeset(attrs)
    |> Repo.insert()
  end

  def get_agent(id), do: Repo.get(Agent, id)

  def get_agent!(id), do: Repo.get!(Agent, id)

  def get_agent_by_slug(slug), do: Repo.get_by(Agent, slug: slug)

  def update_agent(%Agent{} = agent, attrs) do
    agent |> Agent.changeset(attrs) |> Repo.update()
  end

  def delete_agent(%Agent{} = agent) do
    Repo.delete(agent)
  end

  def list_user_agents(user_id) do
    from(a in Agent, where: a.creator_id == ^user_id, order_by: [desc: a.updated_at])
    |> Repo.all()
  end

  def list_public_agents(opts \\ []) do
    limit = Keyword.get(opts, :limit, 50)

    from(a in Agent,
      where: a.visibility == :public,
      order_by: [desc: a.usage_count],
      limit: ^limit
    )
    |> Repo.all()
  end

  def search_public_agents(query, opts \\ []) do
    limit = Keyword.get(opts, :limit, 50)
    search_term = "%#{query}%"

    from(a in Agent,
      where:
        a.visibility == :public and
          (ilike(a.name, ^search_term) or ilike(a.description, ^search_term) or
             ilike(a.category, ^search_term)),
      order_by: [desc: a.usage_count],
      limit: ^limit
    )
    |> Repo.all()
  end

  # --- Ratings ---

  def rate_agent(attrs) do
    result =
      %AgentRating{}
      |> AgentRating.changeset(attrs)
      |> Repo.insert(
        on_conflict: {:replace, [:rating, :review]},
        conflict_target: [:agent_id, :user_id]
      )

    case result do
      {:ok, rating} ->
        sync_agent_rating_aggregates(rating.agent_id)
        {:ok, rating}

      error ->
        error
    end
  end

  defp sync_agent_rating_aggregates(agent_id) do
    {rating_sum, rating_count} =
      from(r in AgentRating,
        where: r.agent_id == ^agent_id,
        select: {sum(r.rating), count(r.id)}
      )
      |> Repo.one()

    from(a in Agent, where: a.id == ^agent_id)
    |> Repo.update_all(
      set: [
        rating_sum: rating_sum || 0,
        rating_count: rating_count || 0
      ]
    )
  end

  def get_agent_ratings(agent_id) do
    from(r in AgentRating, where: r.agent_id == ^agent_id, order_by: [desc: r.created_at])
    |> Repo.all()
  end
end
