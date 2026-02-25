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

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"task" => "generate_thumbnail", "key" => key, "content_type" => content_type}}) do
    # Download the original from R2
    {:ok, data} = RaccoonShared.Media.R2.download(key)

    # Generate thumbnail key
    thumb_key = "thumbnails/256x256/#{key}"

    # Placeholder: in production, use an image processing library (e.g., Image, Mogrify)
    # to resize the image before uploading
    {:ok, _} = RaccoonShared.Media.R2.upload(thumb_key, data, content_type)

    :ok
  end

  def perform(%Oban.Job{args: %{"task" => "transcode_video", "key" => key}}) do
    # Placeholder: in production, use FFmpeg via Rambo or Port
    # to transcode the video to MP4
    {:ok, _data} = RaccoonShared.Media.R2.download(key)

    # Transcoding would happen here
    # mp4_key = String.replace(key, ~r/\.\w+$/, ".mp4")
    # {:ok, _} = RaccoonShared.Media.R2.upload(mp4_key, transcoded_data, "video/mp4")

    :ok
  end

  def perform(%Oban.Job{args: %{"task" => "extract_metadata", "key" => key}}) do
    # Placeholder: extract dimensions, duration, file size, etc.
    {:ok, data} = RaccoonShared.Media.R2.download(key)

    _metadata = %{
      size_bytes: byte_size(data),
      key: key
    }

    :ok
  end

  def perform(%Oban.Job{args: args}) do
    {:error, "Unknown media task: #{inspect(args)}"}
  end
end
