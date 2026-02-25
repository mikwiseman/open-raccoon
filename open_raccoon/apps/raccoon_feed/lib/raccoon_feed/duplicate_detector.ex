defmodule RaccoonFeed.DuplicateDetector do
  @moduledoc """
  Near-duplicate detection for feed items.

  Uses two strategies:
  1. Exact title match
  2. Trigram similarity on content (pg_trgm extension)

  Threshold: similarity > 0.92 = duplicate.
  """

  alias RaccoonShared.Repo
  alias RaccoonFeed.FeedItem
  import Ecto.Query

  @similarity_threshold 0.92

  @doc """
  Check if a feed item with the given attrs is a duplicate of an existing item.
  Returns true if an exact title match or high trigram similarity is found.

  Expects attrs to contain:
  - :title (string) - the item title
  - :description (string) - the item description/content
  """
  @spec is_duplicate?(map()) :: boolean()
  def is_duplicate?(attrs) do
    title = Map.get(attrs, :title) || Map.get(attrs, "title")
    description = Map.get(attrs, :description) || Map.get(attrs, "description")

    exact_title_match?(title) || content_too_similar?(description)
  end

  @doc """
  Calculate trigram similarity between two text strings.
  Uses PostgreSQL pg_trgm's similarity function via a raw SQL fragment.
  Returns a float between 0.0 and 1.0.
  """
  @spec similarity_score(String.t(), String.t()) :: float()
  def similarity_score(text_a, text_b) when is_binary(text_a) and is_binary(text_b) do
    result =
      Repo.one(
        from(f in fragment("SELECT similarity(?, ?) AS sim", ^text_a, ^text_b),
          select: f.sim
        )
      )

    result || 0.0
  end

  # --- Private ---

  defp exact_title_match?(nil), do: false
  defp exact_title_match?(""), do: false

  defp exact_title_match?(title) do
    from(fi in FeedItem,
      where: fi.title == ^title,
      limit: 1,
      select: fi.id
    )
    |> Repo.one()
    |> is_binary()
  end

  defp content_too_similar?(nil), do: false
  defp content_too_similar?(""), do: false

  defp content_too_similar?(description) do
    # Use pg_trgm similarity to find items with similar descriptions.
    # The query finds any existing feed item whose description has
    # trigram similarity above the threshold.
    query =
      from(fi in FeedItem,
        where:
          not is_nil(fi.description) and
            fragment("similarity(?, ?) > ?", fi.description, ^description, ^@similarity_threshold),
        limit: 1,
        select: fi.id
      )

    Repo.one(query) |> is_binary()
  end
end
