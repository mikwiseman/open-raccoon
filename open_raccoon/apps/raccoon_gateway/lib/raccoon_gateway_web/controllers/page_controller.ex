defmodule RaccoonGatewayWeb.PageController do
  use RaccoonGatewayWeb, :controller
  action_fallback RaccoonGatewayWeb.FallbackController

  alias RaccoonPages
  alias RaccoonShared.{Pagination, Idempotency}

  plug RaccoonGatewayWeb.Plugs.Idempotency when action in [:deploy, :fork]

  def index(conn, params) do
    user_id = conn.assigns.user_id
    {_cursor, limit} = Pagination.parse_params(params)

    pages = RaccoonPages.list_user_pages(user_id)
    {items, page_info} = Pagination.build_page_info(Enum.take(pages, limit + 1), limit)

    json(conn, %{
      items: Enum.map(items, &page_json/1),
      page_info: %{next_cursor: page_info.next_cursor, has_more: page_info.has_more}
    })
  end

  def create(conn, params) do
    user_id = conn.assigns.user_id
    attrs = Map.put(params, "creator_id", user_id)

    with {:ok, page} <- RaccoonPages.create_page(attrs) do
      conn
      |> put_status(:created)
      |> json(%{page: page_json(page)})
    end
  end

  def show(conn, %{"id" => id}) do
    case RaccoonPages.get_page(id) do
      nil -> {:error, :not_found}
      page -> json(conn, %{page: page_json(page)})
    end
  end

  def update(conn, %{"id" => id} = params) do
    user_id = conn.assigns.user_id

    case RaccoonPages.get_page(id) do
      nil ->
        {:error, :not_found}

      %{creator_id: ^user_id} = page ->
        allowed_keys = [
          "title",
          "slug",
          "description",
          "thumbnail_url",
          "visibility",
          "custom_domain"
        ]

        update_params = Map.take(params, allowed_keys)

        with {:ok, updated} <- RaccoonPages.update_page(page, update_params) do
          json(conn, %{page: page_json(updated)})
        end

      _page ->
        {:error, :forbidden}
    end
  end

  def deploy(conn, %{"id" => id} = params) do
    user_id = conn.assigns.user_id

    case RaccoonPages.get_page(id) do
      nil ->
        {:error, :not_found}

      %{creator_id: ^user_id} = page ->
        r2_path = params["r2_path"] || page.r2_path

        with {:ok, updated_page} <- RaccoonPages.deploy_page(page, r2_path) do
          response = %{page: page_json(updated_page)}

          if idempotency_key = conn.assigns[:idempotency_key] do
            Idempotency.store(RaccoonShared.Repo, idempotency_key, user_id, 200, response)
          end

          json(conn, response)
        end

      _page ->
        {:error, :forbidden}
    end
  end

  def fork(conn, %{"id" => id} = params) do
    user_id = conn.assigns.user_id

    case RaccoonPages.get_page(id) do
      nil ->
        {:error, :not_found}

      page ->
        new_slug = params["slug"] || "#{page.slug}-fork-#{:rand.uniform(9999)}"

        with {:ok, forked} <- RaccoonPages.fork_page(page, user_id, new_slug) do
          response = %{page: page_json(forked)}

          if idempotency_key = conn.assigns[:idempotency_key] do
            Idempotency.store(RaccoonShared.Repo, idempotency_key, user_id, 201, response)
          end

          conn
          |> put_status(:created)
          |> json(response)
        end
    end
  end

  def versions(conn, %{"id" => id}) do
    case RaccoonPages.get_page(id) do
      nil ->
        {:error, :not_found}

      _page ->
        versions = RaccoonPages.list_versions(id)

        json(conn, %{
          items:
            Enum.map(versions, fn v ->
              %{
                id: v.id,
                page_id: v.page_id,
                version: v.version,
                r2_path: v.r2_path,
                changes: v.changes,
                created_at: v.inserted_at
              }
            end)
        })
    end
  end

  defp page_json(page) do
    %{
      id: page.id,
      creator_id: page.creator_id,
      agent_id: page.agent_id,
      title: page.title,
      slug: page.slug,
      description: page.description,
      thumbnail_url: page.thumbnail_url,
      r2_path: page.r2_path,
      deploy_url: page.deploy_url,
      custom_domain: page.custom_domain,
      version: page.version,
      visibility: page.visibility,
      view_count: page.view_count,
      forked_from: page.forked_from,
      created_at: page.inserted_at,
      updated_at: page.updated_at
    }
  end
end
