defmodule RaccoonPages.Deployer do
  @moduledoc """
  Page deployment to R2 storage.

  Handles uploading page bundles (HTML/CSS/JS) to R2,
  generating raccoon.page URLs, and rollback to previous versions.
  """

  alias RaccoonShared.Repo
  alias RaccoonShared.Media.R2
  alias RaccoonPages.{Page, PageVersion}
  import Ecto.Query

  @doc """
  Deploy a page bundle to R2 storage.

  Uploads the HTML/CSS/JS content, creates a new PageVersion,
  and updates the Page record with the new version and deploy URL.
  """
  @spec deploy(Page.t(), binary()) :: {:ok, Page.t()} | {:error, term()}
  def deploy(%Page{} = page, content) do
    r2_key = "pages/#{page.id}/v#{page.version + 1}/index.html"

    with {:ok, _} <- R2.upload(r2_key, content, "text/html") do
      Repo.transaction(fn ->
        page = Repo.get!(Page, page.id, lock: "FOR UPDATE")
        new_version = page.version + 1
        deploy_url = generate_url(page)

        {:ok, _version} =
          %PageVersion{}
          |> PageVersion.changeset(%{
            page_id: page.id,
            version: new_version,
            r2_path: r2_key,
            changes: "Deployed version #{new_version}"
          })
          |> Repo.insert()

        {:ok, updated_page} =
          page
          |> Page.changeset(%{
            version: new_version,
            r2_path: r2_key,
            deploy_url: deploy_url
          })
          |> Repo.update()

        updated_page
      end)
    end
  end

  @doc """
  Generate a unique raccoon.page URL for a page based on its slug.
  """
  @spec generate_url(Page.t()) :: String.t()
  def generate_url(%Page{slug: slug}) do
    base = Application.get_env(:raccoon_pages, :pages_base_url, "https://raccoon.page")
    "#{base}/#{slug}"
  end

  @doc """
  Rollback a page to a previous version.

  Loads the specified version's R2 path and updates the Page record.
  """
  @spec rollback(Page.t(), integer()) :: {:ok, Page.t()} | {:error, term()}
  def rollback(%Page{} = page, target_version) do
    case Repo.one(
           from(v in PageVersion,
             where: v.page_id == ^page.id and v.version == ^target_version
           )
         ) do
      nil ->
        {:error, :version_not_found}

      version ->
        page
        |> Page.changeset(%{
          version: version.version,
          r2_path: version.r2_path,
          deploy_url: generate_url(page)
        })
        |> Repo.update()
    end
  end
end
