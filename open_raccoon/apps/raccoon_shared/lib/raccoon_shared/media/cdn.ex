defmodule RaccoonShared.Media.CDN do
  @moduledoc """
  CDN URL generation for R2-stored assets.

  Configuration is read from the CDN_BASE_URL environment variable.
  """

  @doc """
  Generate a public CDN URL from an R2 object key.

  ## Examples

      iex> RaccoonShared.Media.CDN.url("pages/abc123/index.html")
      "https://cdn.raccoon.page/pages/abc123/index.html"
  """
  @spec url(String.t()) :: String.t()
  def url(key) do
    base = base_url()
    "#{base}/#{key}"
  end

  @doc """
  Generate a thumbnail URL with a size parameter.

  ## Parameters
    - `key` - The R2 object key for the original image
    - `size` - Thumbnail size (e.g., `"128x128"`, `"256x256"`)
  """
  @spec thumbnail_url(String.t(), String.t()) :: String.t()
  def thumbnail_url(key, size) do
    base = base_url()
    "#{base}/thumbnails/#{size}/#{key}"
  end

  # --- Private ---

  defp base_url do
    Application.get_env(:raccoon_shared, :cdn_base_url, "https://cdn.raccoon.page")
  end
end
