defmodule RaccoonBridges.Adapters.WhatsApp do
  @moduledoc """
  WhatsApp Cloud API adapter.

  Handles normalizing incoming WhatsApp messages to MessageEnvelope format,
  sending outbound messages via the Cloud API, processing webhooks, and
  challenge/response webhook verification.

  Media files are downloaded via the WhatsApp Cloud API media endpoint
  and uploaded to R2 storage.
  """

  alias RaccoonShared.MessageEnvelope
  alias RaccoonShared.Media.{R2, CDN}

  @cloud_api_base "https://graph.facebook.com/v21.0"

  @doc """
  Convert a WhatsApp Cloud API message payload into a `%MessageEnvelope{}`.
  """
  @spec normalize_message(map()) :: {:ok, MessageEnvelope.t()} | {:error, term()}
  def normalize_message(%{"messages" => [msg | _], "contacts" => [contact | _]} = _value) do
    {type, content} = extract_content(msg)

    envelope_attrs = %{
      conversation_id: msg["from"],
      type: type,
      sender: %{
        id: msg["from"],
        type: :bridge,
        display_name: get_in(contact, ["profile", "name"]) || msg["from"],
        avatar_url: nil
      },
      content: content,
      metadata: %{
        bridge_source: "whatsapp",
        reply_to: get_in(msg, ["context", "id"]),
        thread_id: nil
      },
      created_at: DateTime.from_unix!(String.to_integer(msg["timestamp"]))
    }

    changeset = MessageEnvelope.changeset(%MessageEnvelope{}, envelope_attrs)

    if changeset.valid? do
      {:ok, Ecto.Changeset.apply_changes(changeset)}
    else
      {:error, changeset.errors}
    end
  end

  def normalize_message(_payload), do: {:error, :invalid_payload}

  @doc """
  Send a message to a WhatsApp recipient via the Cloud API.
  """
  @spec send_message(map(), map()) :: {:ok, map()} | {:error, term()}
  def send_message(%{to: to, text: text}, %{phone_number_id: phone_id, access_token: token}) do
    url = "#{@cloud_api_base}/#{phone_id}/messages"

    body =
      Jason.encode!(%{
        messaging_product: "whatsapp",
        to: to,
        type: "text",
        text: %{body: text}
      })

    headers = [
      {~c"Authorization", String.to_charlist("Bearer #{token}")},
      {~c"Content-Type", ~c"application/json"}
    ]

    case :httpc.request(
           :post,
           {String.to_charlist(url), headers, ~c"application/json", body},
           [],
           []
         ) do
      {:ok, {{_, 200, _}, _headers, response_body}} ->
        {:ok, Jason.decode!(to_string(response_body))}

      {:ok, {{_, status, _}, _headers, response_body}} ->
        {:error, %{status: status, body: to_string(response_body)}}

      {:error, reason} ->
        {:error, reason}
    end
  end

  @doc """
  Download a WhatsApp media file by media_id, then upload to R2.
  Returns the CDN URL of the uploaded file.

  Steps:
  1. Call GET /<media_id> to retrieve the media URL and mime_type
  2. Download the file binary from the returned URL
  3. Upload to R2 under bridges/whatsapp/<media_id>
  4. Return the CDN URL
  """
  @spec download_and_upload_media(String.t(), String.t()) :: {:ok, String.t()} | {:error, term()}
  def download_and_upload_media(media_id, access_token) do
    with {:ok, media_url, mime_type} <- get_media_url(media_id, access_token),
         {:ok, file_binary} <- download_media(media_url, access_token),
         extension <- mime_to_extension(mime_type),
         r2_key <- "bridges/whatsapp/#{media_id}#{extension}",
         {:ok, _} <- R2.upload(r2_key, file_binary, mime_type) do
      {:ok, CDN.url(r2_key)}
    end
  end

  @doc """
  Process an incoming WhatsApp Cloud API webhook payload.
  Extracts messages from the nested webhook structure.
  """
  @spec handle_webhook(map()) :: {:ok, MessageEnvelope.t()} | {:ok, :ignored} | {:error, term()}
  def handle_webhook(%{"entry" => [entry | _]}) do
    case get_in(entry, ["changes"]) do
      [%{"value" => %{"messages" => [_ | _]} = value} | _] ->
        normalize_message(value)

      _ ->
        {:ok, :ignored}
    end
  end

  def handle_webhook(_payload), do: {:ok, :ignored}

  @doc """
  Verify a WhatsApp webhook subscription challenge.
  Returns the challenge token if the verify_token matches.
  """
  @spec verify_webhook(map()) :: {:ok, String.t()} | {:error, :invalid_token}
  def verify_webhook(params) do
    mode = params["hub.mode"]
    token = params["hub.verify_token"]
    challenge = params["hub.challenge"]

    expected_token = Application.get_env(:raccoon_bridges, :whatsapp_verify_token)

    if mode == "subscribe" && token == expected_token do
      {:ok, challenge}
    else
      {:error, :invalid_token}
    end
  end

  # --- Private ---

  defp get_media_url(media_id, access_token) do
    url = "#{@cloud_api_base}/#{media_id}"

    headers = [
      {~c"Authorization", String.to_charlist("Bearer #{access_token}")}
    ]

    case :httpc.request(:get, {String.to_charlist(url), headers}, [], []) do
      {:ok, {{_, 200, _}, _headers, response_body}} ->
        case Jason.decode!(to_string(response_body)) do
          %{"url" => media_url, "mime_type" => mime_type} ->
            {:ok, media_url, mime_type}

          %{"url" => media_url} ->
            {:ok, media_url, "application/octet-stream"}

          _ ->
            {:error, :missing_media_url}
        end

      {:ok, {{_, status, _}, _headers, response_body}} ->
        {:error, %{status: status, body: to_string(response_body)}}

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp download_media(media_url, access_token) do
    headers = [
      {~c"Authorization", String.to_charlist("Bearer #{access_token}")}
    ]

    case :httpc.request(:get, {String.to_charlist(media_url), headers}, [], body_format: :binary) do
      {:ok, {{_, 200, _}, _headers, body}} ->
        {:ok, IO.iodata_to_binary(body)}

      {:ok, {{_, status, _}, _headers, response_body}} ->
        {:error, %{status: status, body: to_string(response_body)}}

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp extract_content(%{"type" => "text", "text" => %{"body" => body}}) do
    {:text, %{text: body}}
  end

  defp extract_content(%{"type" => "image", "image" => image}) do
    {:media, %{text: image["caption"], media_url: "wa://media/#{image["id"]}"}}
  end

  defp extract_content(%{"type" => "video", "video" => video}) do
    {:media, %{text: video["caption"], media_url: "wa://media/#{video["id"]}"}}
  end

  defp extract_content(%{"type" => "document", "document" => doc}) do
    {:media, %{text: doc["caption"], media_url: "wa://media/#{doc["id"]}"}}
  end

  defp extract_content(%{"type" => "sticker", "sticker" => sticker}) do
    {:media, %{text: nil, media_url: "wa://media/#{sticker["id"]}"}}
  end

  defp extract_content(%{"type" => "audio", "audio" => audio}) do
    {:media, %{text: nil, media_url: "wa://media/#{audio["id"]}"}}
  end

  defp extract_content(_msg) do
    {:text, %{text: "[unsupported message type]"}}
  end

  defp mime_to_extension(mime_type) do
    case mime_type do
      "image/jpeg" -> ".jpg"
      "image/png" -> ".png"
      "image/gif" -> ".gif"
      "image/webp" -> ".webp"
      "video/mp4" -> ".mp4"
      "video/3gpp" -> ".3gp"
      "audio/aac" -> ".aac"
      "audio/ogg" -> ".ogg"
      "audio/mpeg" -> ".mp3"
      "application/pdf" -> ".pdf"
      _ -> ""
    end
  end
end
