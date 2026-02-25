defmodule RaccoonPages do
  @moduledoc """
  Pages context: page CRUD, deployment, versioning, forking.
  """

  alias RaccoonShared.Repo
  alias RaccoonPages.{Page, PageVersion}
  import Ecto.Query

  # --- Pages ---

  def create_page(attrs) do
    %Page{}
    |> Page.changeset(attrs)
    |> Repo.insert()
  end

  def get_page(id), do: Repo.get(Page, id)

  def get_page!(id), do: Repo.get!(Page, id)

  def update_page(%Page{} = page, attrs) do
    page |> Page.changeset(attrs) |> Repo.update()
  end

  def list_user_pages(user_id) do
    from(p in Page, where: p.creator_id == ^user_id, order_by: [desc: p.updated_at])
    |> Repo.all()
  end

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

  def fork_page(%Page{} = page, creator_id, new_slug) do
    %Page{}
    |> Page.changeset(%{
      creator_id: creator_id,
      title: page.title,
      slug: new_slug,
      description: page.description,
      r2_path: page.r2_path,
      forked_from: page.id,
      agent_id: page.agent_id
    })
    |> Repo.insert()
  end

  # --- Versions ---

  def list_versions(page_id) do
    from(v in PageVersion,
      where: v.page_id == ^page_id,
      order_by: [desc: v.version]
    )
    |> Repo.all()
  end
end
