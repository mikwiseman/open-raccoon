defmodule RaccoonShared.Media.CDN do
  @moduledoc """
  CDN URL generation for object-storage assets.

  By default, uses the Hetzner Object Storage public URL format:
  `https://{bucket}.{region}.your-objectstorage.com`

  Override with the CDN_BASE_URL environment variable for a custom domain.
  """

  @doc """
  Generate a public CDN URL from an object key.

  ## Examples

      iex> RaccoonShared.Media.CDN.url("pages/abc123/index.html")
      "https://open-raccoon.hel1.your-objectstorage.com/pages/abc123/index.html"
  """
  @spec url(String.t()) :: String.t()
  def url(key) do
    base = base_url()
    "#{base}/#{key}"
  end

  @doc """
  Generate a thumbnail URL with a size parameter.

  ## Parameters
    - `key` - The object key for the original image
    - `size` - Thumbnail size (e.g., `"128x128"`, `"256x256"`)
  """
  @spec thumbnail_url(String.t(), String.t()) :: String.t()
  def thumbnail_url(key, size) do
    base = base_url()
    "#{base}/thumbnails/#{size}/#{key}"
  end

  # --- Private ---

  defp base_url do
    case Application.get_env(:raccoon_shared, :cdn_base_url) do
      nil ->
        bucket = Application.fetch_env!(:raccoon_shared, :spaces_bucket)
        region = Application.fetch_env!(:raccoon_shared, :spaces_region)
        "https://#{bucket}.#{region}.your-objectstorage.com"

      url ->
        url
    end
  end
end
