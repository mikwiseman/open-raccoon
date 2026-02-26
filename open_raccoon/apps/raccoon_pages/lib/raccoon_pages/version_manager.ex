defmodule RaccoonPages.VersionManager do
  @moduledoc """
  Version tracking for pages.

  Manages creating new versions with SELECT FOR UPDATE locking,
  retrieving versions, paginated listing, and basic content diffs.
  """

  alias RaccoonShared.Repo
  alias RaccoonPages.{Page, PageVersion}
  import Ecto.Query

  @doc """
  Create a new version for a page with SELECT FOR UPDATE locking
  to prevent concurrent version number collisions.
  """
  @spec create_version(String.t(), map()) :: {:ok, PageVersion.t()} | {:error, term()}
  def create_version(page_id, attrs) do
    Repo.transaction(fn ->
      page = Repo.one!(from(p in Page, where: p.id == ^page_id, lock: "FOR UPDATE"))
      new_version = page.version + 1

      {:ok, version} =
        %PageVersion{}
        |> PageVersion.changeset(Map.merge(attrs, %{page_id: page_id, version: new_version}))
        |> Repo.insert()

      {:ok, _} =
        page
        |> Page.changeset(%{version: new_version})
        |> Repo.update()

      version
    end)
  end

  @doc """
  Get a specific version of a page.
  """
  @spec get_version(String.t(), integer()) :: PageVersion.t() | nil
  def get_version(page_id, version_number) do
    Repo.one(
      from(v in PageVersion,
        where: v.page_id == ^page_id and v.version == ^version_number
      )
    )
  end

  @doc """
  List versions for a page, ordered by version descending.
  Supports pagination via limit and offset.
  """
  @spec list_versions(String.t(), Keyword.t()) :: [PageVersion.t()]
  def list_versions(page_id, opts \\ []) do
    limit = Keyword.get(opts, :limit, 50)
    offset = Keyword.get(opts, :offset, 0)

    from(v in PageVersion,
      where: v.page_id == ^page_id,
      order_by: [desc: v.version],
      limit: ^limit,
      offset: ^offset
    )
    |> Repo.all()
  end

  @doc """
  Compare two versions of a page and return a basic diff.

  Returns a map with `:added`, `:removed`, and `:changed` keys
  comparing the `changes` field and `r2_path`.
  """
  @spec diff(String.t(), integer(), integer()) :: {:ok, map()} | {:error, term()}
  def diff(page_id, version_a, version_b) do
    va = get_version(page_id, version_a)
    vb = get_version(page_id, version_b)

    case {va, vb} do
      {nil, _} ->
        {:error, :version_not_found}

      {_, nil} ->
        {:error, :version_not_found}

      {a, b} ->
        {:ok,
         %{
           from_version: a.version,
           to_version: b.version,
           r2_path_changed: a.r2_path != b.r2_path,
           from_r2_path: a.r2_path,
           to_r2_path: b.r2_path,
           from_changes: a.changes,
           to_changes: b.changes
         }}
    end
  end
end
