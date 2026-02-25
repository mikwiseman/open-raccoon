defmodule RaccoonPages do
  @moduledoc """
  Pages context: page CRUD, deployment, versioning, forking.
  """

  alias RaccoonShared.Repo
  alias RaccoonPages.{Page, PageVersion, Deployer, VersionManager, Forking}
  import Ecto.Query

  # --- Pages ---

  @doc """
  Create a page with the given attributes.
  Requires at minimum: creator_id, title, slug, r2_path.
  """
  @spec create_page(map()) :: {:ok, Page.t()} | {:error, Ecto.Changeset.t()}
  def create_page(attrs) do
    %Page{}
    |> Page.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Create a page with an explicit owner_id (alias for creator_id).
  """
  @spec create_page(String.t(), map()) :: {:ok, Page.t()} | {:error, Ecto.Changeset.t()}
  def create_page(owner_id, attrs) do
    create_page(Map.put(attrs, :creator_id, owner_id))
  end

  def get_page(id), do: Repo.get(Page, id)

  def get_page!(id), do: Repo.get!(Page, id)

  @doc """
  Update a page's content/attributes.
  """
  @spec update_page(Page.t(), map()) :: {:ok, Page.t()} | {:error, Ecto.Changeset.t()}
  def update_page(%Page{} = page, attrs) do
    page |> Page.changeset(attrs) |> Repo.update()
  end

  def list_user_pages(user_id) do
    from(p in Page, where: p.creator_id == ^user_id, order_by: [desc: p.updated_at])
    |> Repo.all()
  end

  @doc """
  Deploy a page to R2, create a new PageVersion, and generate a raccoon.page URL.

  ## Variants
    - `deploy_page(page, r2_path)` - Record a deployment with an existing R2 path
    - `deploy_page(page, :upload, content)` - Upload content to R2 then record the deployment
  """
  @spec deploy_page(Page.t(), String.t()) :: {:ok, Page.t()} | {:error, term()}
  def deploy_page(%Page{} = page, r2_path) do
    Repo.transaction(fn ->
      page = Repo.get!(Page, page.id, lock: "FOR UPDATE")
      new_version = page.version + 1

      {:ok, _version} =
        %PageVersion{}
        |> PageVersion.changeset(%{
          page_id: page.id,
          version: new_version,
          r2_path: r2_path,
          changes: "Deployed version #{new_version}"
        })
        |> Repo.insert()

      {:ok, updated_page} =
        page
        |> Page.changeset(%{version: new_version, r2_path: r2_path})
        |> Repo.update()

      updated_page
    end)
  end

  @doc """
  Deploy a page by uploading content to R2 and recording a new version.
  """
  @spec deploy_page(Page.t(), :upload, binary()) :: {:ok, Page.t()} | {:error, term()}
  def deploy_page(%Page{} = page, :upload, content) do
    Deployer.deploy(page, content)
  end

  @doc """
  Fork a page with full attribution chain tracking.
  """
  @spec fork_page(Page.t(), String.t(), String.t()) :: {:ok, Page.t()} | {:error, term()}
  def fork_page(%Page{} = page, creator_id, new_slug) do
    Forking.fork(page, %{creator_id: creator_id, slug: new_slug})
  end

  # --- Versions ---

  @doc """
  List version history for a page.
  """
  @spec list_versions(String.t()) :: [PageVersion.t()]
  def list_versions(page_id) do
    VersionManager.list_versions(page_id)
  end
end
