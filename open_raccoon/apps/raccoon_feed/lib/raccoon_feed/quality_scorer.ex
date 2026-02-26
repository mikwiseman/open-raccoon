defmodule RaccoonFeed.QualityScorer do
  @moduledoc """
  Heuristic quality scorer for feed items.

  Calculates a quality score (0.0-1.0) based on content signals:
  - Content length (longer, more substantive content scores higher)
  - Media presence bonus
  - Code blocks bonus
  - Original content bonus (not a fork/remix)
  - Author reputation factor
  """

  alias RaccoonShared.Repo
  alias RaccoonFeed.FeedItem
  import Ecto.Query

  @quality_threshold 0.3
  @max_content_length 500

  @doc """
  Calculate quality score for a feed item attrs map.
  Returns a float between 0.0 and 1.0.

  Expects attrs to contain:
  - :description (string) - the content/description text
  - :title (string) - the item title
  - :type (atom) - the feed item type
  - :creator_id (binary_id) - the author's user ID
  - :thumbnail_url (string, optional) - presence indicates media
  """
  @spec score(map()) :: float()
  def score(attrs) do
    content_score = content_length_score(attrs)
    media_bonus = media_bonus(attrs)
    code_bonus = code_block_bonus(attrs)
    original_bonus = original_content_bonus(attrs)
    author_factor = author_reputation_factor(attrs)

    raw_score = content_score + media_bonus + code_bonus + original_bonus + author_factor

    # Clamp to 0.0-1.0
    min(1.0, max(0.0, raw_score))
  end

  @doc """
  Returns true if the given score meets the minimum quality threshold (0.3).
  """
  @spec meets_threshold?(float()) :: boolean()
  def meets_threshold?(score) when is_float(score) do
    score >= @quality_threshold
  end

  # --- Private Scoring Functions ---

  defp content_length_score(attrs) do
    description = Map.get(attrs, :description) || Map.get(attrs, "description") || ""
    title = Map.get(attrs, :title) || Map.get(attrs, "title") || ""
    total_length = String.length(description) + String.length(title)

    # Score scales linearly up to @max_content_length chars, capped at 0.35
    min(0.35, total_length / @max_content_length * 0.35)
  end

  defp media_bonus(attrs) do
    thumbnail = Map.get(attrs, :thumbnail_url) || Map.get(attrs, "thumbnail_url")

    if thumbnail && thumbnail != "" do
      0.15
    else
      0.0
    end
  end

  defp code_block_bonus(attrs) do
    description = Map.get(attrs, :description) || Map.get(attrs, "description") || ""

    if String.contains?(description, "```") do
      0.1
    else
      0.0
    end
  end

  defp original_content_bonus(attrs) do
    type = Map.get(attrs, :type) || Map.get(attrs, "type")

    type_atom =
      cond do
        is_atom(type) -> type
        is_binary(type) -> String.to_existing_atom(type)
        true -> nil
      end

    if type_atom != :remix do
      0.2
    else
      0.0
    end
  end

  defp author_reputation_factor(attrs) do
    creator_id = Map.get(attrs, :creator_id) || Map.get(attrs, "creator_id")

    case creator_id do
      nil ->
        0.0

      id ->
        avg_quality =
          from(fi in FeedItem,
            where: fi.creator_id == ^id,
            select: avg(fi.quality_score)
          )
          |> Repo.one()

        case avg_quality do
          nil -> 0.1
          %Decimal{} = avg -> Float.round(Decimal.to_float(avg) * 0.2, 4)
          avg -> Float.round(avg * 0.2, 4)
        end
    end
  end
end
