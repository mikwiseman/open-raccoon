defmodule RaccoonGateway.Workers.MediaWorker do
  @moduledoc """
  Oban worker for media processing tasks.

  - Generate thumbnails for uploaded images
  - Transcode video files
  - Extract metadata (dimensions, duration, etc.)
  """

  use Oban.Worker,
    queue: :media,
    max_attempts: 3

  require Logger

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"task" => "generate_thumbnail", "key" => key, "content_type" => content_type}}) do
    with {:ok, data} <- RaccoonShared.Media.R2.download(key) do
      # Generate thumbnail key
      thumb_key = "thumbnails/256x256/#{key}"

      # Placeholder: in production, use an image processing library (e.g., Image, Mogrify)
      # to resize the image before uploading
      case RaccoonShared.Media.R2.upload(thumb_key, data, content_type) do
        {:ok, _} -> :ok
        {:error, reason} -> {:error, "Failed to upload thumbnail: #{inspect(reason)}"}
      end
    else
      {:error, reason} ->
        Logger.error("Failed to download media for thumbnail generation, key=#{key}: #{inspect(reason)}")
        {:error, "Failed to download media: #{inspect(reason)}"}
    end
  end

  def perform(%Oban.Job{args: %{"task" => "transcode_video", "key" => key}}) do
    # Placeholder: in production, use FFmpeg via Rambo or Port
    # to transcode the video to MP4
    case RaccoonShared.Media.R2.download(key) do
      {:ok, _data} ->
        # Transcoding would happen here
        # mp4_key = String.replace(key, ~r/\.\w+$/, ".mp4")
        # {:ok, _} = RaccoonShared.Media.R2.upload(mp4_key, transcoded_data, "video/mp4")
        :ok

      {:error, reason} ->
        Logger.error("Failed to download media for transcoding, key=#{key}: #{inspect(reason)}")
        {:error, "Failed to download media: #{inspect(reason)}"}
    end
  end

  def perform(%Oban.Job{args: %{"task" => "extract_metadata", "key" => key}}) do
    # Placeholder: extract dimensions, duration, file size, etc.
    case RaccoonShared.Media.R2.download(key) do
      {:ok, data} ->
        _metadata = %{
          size_bytes: byte_size(data),
          key: key
        }

        :ok

      {:error, reason} ->
        Logger.error("Failed to download media for metadata extraction, key=#{key}: #{inspect(reason)}")
        {:error, "Failed to download media: #{inspect(reason)}"}
    end
  end

  def perform(%Oban.Job{args: args}) do
    {:error, "Unknown media task: #{inspect(args)}"}
  end
end
