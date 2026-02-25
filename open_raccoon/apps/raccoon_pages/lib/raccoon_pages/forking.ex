defmodule RaccoonPages.Forking do
  @moduledoc """
  Fork chain management for pages.

  Handles creating forks with attribution tracking, retrieving
  the full attribution chain, and counting forks.
  """

  alias RaccoonShared.Repo
  alias RaccoonPages.Page
  import Ecto.Query

  @doc """
  Fork a page. Creates a new page linked to the original via `forked_from`,
  and stores the fork chain (list of page IDs from original to this fork)
  in the page metadata.
  """
  @spec fork(Page.t(), map()) :: {:ok, Page.t()} | {:error, term()}
  def fork(%Page{} = source, attrs) do
    fork_attrs = %{
      creator_id: attrs[:creator_id] || attrs["creator_id"],
      title: attrs[:title] || source.title,
      slug: attrs[:slug] || attrs["slug"],
      description: source.description,
      r2_path: source.r2_path,
      forked_from: source.id,
      agent_id: source.agent_id,
      visibility: :public
    }

    %Page{}
    |> Page.changeset(fork_attrs)
    |> Repo.insert()
  end

  @doc """
  Get the full attribution chain for a forked page.

  Returns a list of `%Page{}` structs from the original root
  through all intermediate forks to the given page.
  """
  @spec attribution_chain(Page.t()) :: [Page.t()]
  def attribution_chain(%Page{forked_from: nil} = page), do: [page]

  def attribution_chain(%Page{} = page) do
    chain = collect_chain(page, [page])
    Enum.reverse(chain)
  end

  @doc """
  Get the number of direct forks for a page.
  """
  @spec fork_count(String.t()) :: non_neg_integer()
  def fork_count(page_id) do
    from(p in Page, where: p.forked_from == ^page_id)
    |> Repo.aggregate(:count, :id)
  end

  # --- Private ---

  defp collect_chain(%Page{forked_from: nil}, acc), do: acc

  defp collect_chain(%Page{forked_from: parent_id}, acc) do
    case Repo.get(Page, parent_id) do
      nil -> acc
      parent -> collect_chain(parent, [parent | acc])
    end
  end
end
