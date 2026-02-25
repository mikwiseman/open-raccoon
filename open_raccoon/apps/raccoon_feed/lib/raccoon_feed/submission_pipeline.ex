defmodule RaccoonFeed.SubmissionPipeline do
  @moduledoc """
  Full submission pipeline for feed items.

  Steps:
  1. Rate limit check (max 5 submissions per author per day)
  2. Duplicate detection
  3. Quality scoring
  4. If all pass: create FeedItem with quality_score set
  5. If any fail: return {:error, reason}
  """

  alias RaccoonShared.Repo
  alias RaccoonFeed.{FeedItem, FeedItemReference, QualityScorer, DuplicateDetector}
  import Ecto.Query

  @daily_submission_limit 5

  @doc """
  Submit a new feed item through the full quality pipeline.

  ## Parameters
  - `attrs` - Map of feed item attributes (creator_id, type, reference_id, etc.)
  - `opts` - Keyword list of options (currently unused, reserved for future use)

  ## Returns
  - `{:ok, %FeedItem{}}` on success
  - `{:error, :rate_limited}` if author exceeded daily limit
  - `{:error, :duplicate}` if content is a duplicate
  - `{:error, :low_quality}` if quality score is below threshold
  - `{:error, changeset}` if database insert fails
  """
  @spec submit(map(), keyword()) :: {:ok, FeedItem.t()} | {:error, atom() | Ecto.Changeset.t()}
  def submit(attrs, _opts \\ []) do
    creator_id = Map.get(attrs, :creator_id) || Map.get(attrs, "creator_id")

    with :ok <- check_rate_limit(creator_id),
         :ok <- check_duplicate(attrs),
         {:ok, quality_score} <- check_quality(attrs) do
      create_feed_item(attrs, quality_score)
    end
  end

  # --- Pipeline Steps ---

  defp check_rate_limit(creator_id) do
    today_start = DateTime.utc_now() |> DateTime.to_date() |> Date.to_iso8601()

    count =
      from(fi in FeedItem,
        where:
          fi.creator_id == ^creator_id and
            fi.inserted_at >= ^today_start,
        select: count(fi.id)
      )
      |> Repo.one()

    if count < @daily_submission_limit do
      :ok
    else
      {:error, :rate_limited}
    end
  end

  defp check_duplicate(attrs) do
    if DuplicateDetector.is_duplicate?(attrs) do
      {:error, :duplicate}
    else
      :ok
    end
  end

  defp check_quality(attrs) do
    score = QualityScorer.score(attrs)

    if QualityScorer.meets_threshold?(score) do
      {:ok, score}
    else
      {:error, :low_quality}
    end
  end

  defp create_feed_item(attrs, quality_score) do
    Repo.transaction(fn ->
      # Ensure reference exists in the polymorphic registry
      %FeedItemReference{}
      |> FeedItemReference.changeset(%{
        reference_id: Map.get(attrs, :reference_id) || Map.get(attrs, "reference_id"),
        reference_type: Map.get(attrs, :reference_type) || Map.get(attrs, "reference_type")
      })
      |> Repo.insert(on_conflict: :nothing, conflict_target: [:reference_id, :reference_type])

      # Create the feed item with quality score
      changeset =
        %FeedItem{}
        |> FeedItem.changeset(attrs)
        |> Ecto.Changeset.put_change(:quality_score, quality_score)

      case Repo.insert(changeset) do
        {:ok, feed_item} -> feed_item
        {:error, changeset} -> Repo.rollback(changeset)
      end
    end)
  end
end
