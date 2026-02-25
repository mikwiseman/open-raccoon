defmodule RaccoonShared.Media.R2 do
  @moduledoc """
  Cloudflare R2 (S3-compatible) storage client.

  Uses ExAws.S3 under the hood. Configuration is read from environment
  variables: R2_ACCOUNT_ID, R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET.
  """

  @doc """
  Upload a file to the R2 bucket.

  ## Parameters
    - `key` - The object key (path) in the bucket
    - `content` - The file content as binary
    - `content_type` - The MIME type of the file
  """
  @spec upload(String.t(), binary(), String.t()) :: {:ok, map()} | {:error, term()}
  def upload(key, content, content_type) do
    bucket()
    |> ExAws.S3.put_object(key, content, content_type: content_type)
    |> ExAws.request(r2_config())
  end

  @doc """
  Download a file from the R2 bucket by key.
  """
  @spec download(String.t()) :: {:ok, binary()} | {:error, term()}
  def download(key) do
    case bucket()
         |> ExAws.S3.get_object(key)
         |> ExAws.request(r2_config()) do
      {:ok, %{body: body}} -> {:ok, body}
      {:error, _} = error -> error
    end
  end

  @doc """
  Delete a file from the R2 bucket by key.
  """
  @spec delete(String.t()) :: {:ok, map()} | {:error, term()}
  def delete(key) do
    bucket()
    |> ExAws.S3.delete_object(key)
    |> ExAws.request(r2_config())
  end

  @doc """
  Generate a presigned URL for uploading or downloading.

  ## Parameters
    - `key` - The object key
    - `opts` - Options:
      - `:method` - `:get` (download) or `:put` (upload). Defaults to `:get`.
      - `:expires_in` - Seconds until expiry. Defaults to 3600 (1 hour).
  """
  @spec presigned_url(String.t(), Keyword.t()) :: {:ok, String.t()} | {:error, term()}
  def presigned_url(key, opts \\ []) do
    method = Keyword.get(opts, :method, :get)
    expires_in = Keyword.get(opts, :expires_in, 3600)

    config = ExAws.Config.new(:s3, r2_config())

    case ExAws.S3.presigned_url(config, method, bucket(), key, expires_in: expires_in) do
      {:ok, url} -> {:ok, url}
      {:error, _} = error -> error
    end
  end

  # --- Private ---

  defp bucket do
    Application.fetch_env!(:raccoon_shared, :r2_bucket)
  end

  defp r2_config do
    account_id = Application.fetch_env!(:raccoon_shared, :r2_account_id)

    [
      access_key_id: Application.fetch_env!(:raccoon_shared, :r2_access_key),
      secret_access_key: Application.fetch_env!(:raccoon_shared, :r2_secret_key),
      host: "#{account_id}.r2.cloudflarestorage.com",
      region: "auto",
      scheme: "https://"
    ]
  end
end
