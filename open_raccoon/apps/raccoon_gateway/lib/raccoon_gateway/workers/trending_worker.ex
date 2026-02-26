defmodule RaccoonGateway.Workers.TrendingWorker do
  @moduledoc """
  Oban worker for recalculating trending scores.

  Formula: (likes*3 + forks*5 + views*0.1) / (hours+2)^1.5

  Scheduled to run every 15 minutes. Batch updates trending
  scores for all recent feed items.
  """

  use Oban.Worker,
    queue: :feed,
    max_attempts: 3

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

    {count, _} =
      from(fi in FeedItem,
        where: fi.inserted_at > ^cutoff,
        update: [
          set: [
            trending_score:
              fragment(
                "(?.like_count * 3 + ?.fork_count * 5 + ?.view_count * 0.1) / POWER(EXTRACT(EPOCH FROM ? - ?.inserted_at) / 3600.0 + 2, 1.5)",
                fi,
                fi,
                fi,
                ^now,
                fi
              )
          ]
        ]
      )
      |> Repo.update_all([])

    Logger.info("Updated trending scores for #{count} items")

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
