defmodule RaccoonGateway.Workers.FeedIndexingWorker do
  @moduledoc """
  Oban worker for feed indexing tasks.

  - Index new feed items for search
  - Calculate quality scores on submission
  - Process feed item references/embeds
  """

  use Oban.Worker,
    queue: :feed,
    max_attempts: 3

  alias RaccoonShared.Repo
  alias RaccoonFeed.FeedItem
  import Ecto.Query

  require Logger

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"task" => "index", "feed_item_id" => feed_item_id}}) do
    case Repo.get(FeedItem, feed_item_id) do
      nil ->
        {:discard, "Feed item not found: #{feed_item_id}"}

      feed_item ->
        Logger.info("Indexing feed item #{feed_item_id} of type #{feed_item.type}")

        # Placeholder: send to a search index (e.g., Meilisearch, Typesense)
        # index_document = %{
        #   id: feed_item.id,
        #   title: feed_item.title,
        #   description: feed_item.description,
        #   type: feed_item.type,
        #   creator_id: feed_item.creator_id,
        #   created_at: feed_item.inserted_at
        # }

        :ok
    end
  end

  def perform(%Oban.Job{args: %{"task" => "calculate_quality", "feed_item_id" => feed_item_id}}) do
    case Repo.get(FeedItem, feed_item_id) do
      nil ->
        {:discard, "Feed item not found: #{feed_item_id}"}

      feed_item ->
        # Quality score based on content completeness
        score = calculate_quality_score(feed_item)

        from(fi in FeedItem, where: fi.id == ^feed_item_id)
        |> Repo.update_all(set: [quality_score: score])

        :ok
    end
  end

  def perform(%Oban.Job{args: %{"task" => "process_references", "feed_item_id" => feed_item_id}}) do
    case Repo.get(FeedItem, feed_item_id) do
      nil ->
        {:discard, "Feed item not found: #{feed_item_id}"}

      _feed_item ->
        # Placeholder: resolve and cache referenced agents, pages, or tools
        # for rich embeds in the feed
        :ok
    end
  end

  def perform(%Oban.Job{args: args}) do
    {:error, "Unknown feed indexing task: #{inspect(args)}"}
  end

  # --- Private ---

  defp calculate_quality_score(%FeedItem{} = item) do
    base = 0.0

    base = if item.title && String.length(item.title) > 10, do: base + 0.2, else: base
    base = if item.description && String.length(item.description) > 50, do: base + 0.3, else: base
    base = if item.thumbnail_url, do: base + 0.2, else: base
    base = if item.like_count > 0, do: base + min(item.like_count * 0.05, 0.3), else: base

    min(base, 1.0)
  end
end
