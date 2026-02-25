defmodule RaccoonGateway.Workers.TrendingWorker do
  @moduledoc """
  Oban worker for recalculating trending scores.

  Formula: (likes*3 + forks*5 + views*0.1) / (hours+2)^1.5

  Scheduled to run every 15 minutes. Batch updates trending
  scores for all recent feed items.
  """

  use Oban.Worker,
    queue: :feed,
    max_attempts: 1

  alias RaccoonShared.Repo
  alias RaccoonFeed.FeedItem
  import Ecto.Query

  require Logger

  @impl Oban.Worker
  def perform(%Oban.Job{}) do
    Logger.info("Recalculating trending scores")

    now = DateTime.utc_now()

    # Fetch recent feed items (created in the last 7 days)
    cutoff = DateTime.add(now, -7 * 24 * 3600, :second)

    items =
      from(fi in FeedItem,
        where: fi.inserted_at > ^cutoff,
        select: %{
          id: fi.id,
          like_count: fi.like_count,
          fork_count: fi.fork_count,
          view_count: fi.view_count,
          inserted_at: fi.inserted_at
        }
      )
      |> Repo.all()

    Logger.info("Updating trending scores for #{length(items)} items")

    Enum.each(items, fn item ->
      hours = DateTime.diff(now, item.inserted_at, :second) / 3600.0
      score = trending_score(item.like_count, item.fork_count, item.view_count, hours)

      from(fi in FeedItem, where: fi.id == ^item.id)
      |> Repo.update_all(set: [trending_score: score])
    end)

    :ok
  end

  @doc """
  Calculate trending score using the formula:
  (likes*3 + forks*5 + views*0.1) / (hours+2)^1.5
  """
  @spec trending_score(integer(), integer(), integer(), float()) :: float()
  def trending_score(likes, forks, views, hours) do
    numerator = likes * 3 + forks * 5 + views * 0.1
    denominator = :math.pow(hours + 2, 1.5)
    numerator / denominator
  end
end
