defmodule RaccoonBridges.MediaNormalizer do
  @moduledoc """
  Media format conversion and validation for bridge attachments.

  Provides placeholder functions for format conversions (TGS -> WebP,
  video transcoding) and file validation.
  """

  @max_file_size_bytes 50 * 1024 * 1024
  @allowed_image_types ~w(image/jpeg image/png image/gif image/webp)
  @allowed_video_types ~w(video/mp4 video/webm video/quicktime)
  @allowed_document_types ~w(application/pdf application/zip)

  @doc """
  Convert a Telegram TGS (animated sticker) file to WebP format.

  This is a placeholder -- actual TGS->WebP conversion requires
  a native library (rlottie) or external service.
  """
  @spec tgs_to_webp(binary()) :: {:ok, binary()} | {:error, :not_implemented}
  def tgs_to_webp(_tgs_data) do
    {:error, :not_implemented}
  end

  @doc """
  Transcode a video file to MP4 format.

  This is a placeholder -- actual transcoding requires FFmpeg or
  a media processing service.
  """
  @spec transcode_to_mp4(binary(), String.t()) :: {:ok, binary()} | {:error, :not_implemented}
  def transcode_to_mp4(_video_data, _source_format) do
    {:error, :not_implemented}
  end

  @doc """
  Validate file size and format.

  ## Parameters
    - `size_bytes` - File size in bytes
    - `content_type` - MIME type of the file
  """
  @spec validate_file(non_neg_integer(), String.t()) :: :ok | {:error, atom()}
  def validate_file(size_bytes, _content_type) when size_bytes > @max_file_size_bytes do
    {:error, :file_too_large}
  end

  def validate_file(_size_bytes, content_type) do
    if content_type in @allowed_image_types ++ @allowed_video_types ++ @allowed_document_types do
      :ok
    else
      {:error, :unsupported_format}
    end
  end

  @doc """
  Extract basic metadata from file content type and size.
  """
  @spec extract_metadata(String.t(), non_neg_integer()) :: map()
  def extract_metadata(content_type, size_bytes) do
    category =
      cond do
        content_type in @allowed_image_types -> :image
        content_type in @allowed_video_types -> :video
        content_type in @allowed_document_types -> :document
        true -> :unknown
      end

    %{
      content_type: content_type,
      size_bytes: size_bytes,
      category: category
    }
  end
end
