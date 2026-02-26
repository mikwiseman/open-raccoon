defmodule RaccoonBridges.Adapters.Telegram do
  @moduledoc """
  Telegram Bot API adapter.

  Handles normalizing incoming Telegram messages to MessageEnvelope format,
  sending outbound messages via the Bot API, and processing webhooks.

  Supports: text, photo, video, document, sticker message types.
  Media files are downloaded via the Telegram Bot API getFile endpoint
  and uploaded to R2 storage.
  """

  alias RaccoonShared.MessageEnvelope
  alias RaccoonShared.Media.{R2, CDN}

  @telegram_api_base "https://api.telegram.org/bot"
  @telegram_file_base "https://api.telegram.org/file/bot"

  @doc """
  Convert a Telegram message payload into a `%MessageEnvelope{}`.
  """
  @spec normalize_message(map()) :: {:ok, MessageEnvelope.t()} | {:error, term()}
  def normalize_message(%{"message" => msg} = _payload) do
    {type, content} = extract_content(msg)

    envelope_attrs = %{
      conversation_id: to_string(msg["chat"]["id"]),
      type: type,
      sender: %{
        id: to_string(msg["from"]["id"]),
        type: :bridge,
        display_name: build_display_name(msg["from"]),
        avatar_url: nil
      },
      content: content,
      metadata: %{
        bridge_source: "telegram",
        reply_to: get_reply_to(msg),
        thread_id: nil
      },
      created_at: DateTime.from_unix!(msg["date"])
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
  Send a message to a Telegram chat via the Bot API.
  """
  @spec send_message(map(), String.t()) :: {:ok, map()} | {:error, term()}
  def send_message(%{chat_id: chat_id, text: text}, bot_token) do
    url = "#{@telegram_api_base}#{bot_token}/sendMessage"

    body =
      Jason.encode!(%{
        chat_id: chat_id,
        text: text,
        parse_mode: "HTML"
      })

    case :httpc.request(:post, {String.to_charlist(url), [], ~c"application/json", body}, [], []) do
      {:ok, {{_, 200, _}, _headers, response_body}} ->
        {:ok, Jason.decode!(to_string(response_body))}

      {:ok, {{_, status, _}, _headers, response_body}} ->
        {:error, %{status: status, body: to_string(response_body)}}

      {:error, reason} ->
        {:error, reason}
    end
  end

  @doc """
  Download a Telegram file by file_id using the Bot API, then upload to R2.
  Returns the CDN URL of the uploaded file.

  Steps:
  1. Call getFile to get the file_path from Telegram servers
  2. Download the file binary from Telegram's file storage
  3. Upload to R2 under bridges/telegram/<file_id>
  4. Return the CDN URL
  """
  @spec download_and_upload_media(String.t(), String.t()) :: {:ok, String.t()} | {:error, term()}
  def download_and_upload_media(file_id, bot_token) do
    with {:ok, file_path} <- get_file_path(file_id, bot_token),
         {:ok, file_binary} <- download_file(file_path, bot_token),
         content_type <- guess_content_type(file_path),
         r2_key <- "bridges/telegram/#{file_id}/#{Path.basename(file_path)}",
         {:ok, _} <- R2.upload(r2_key, file_binary, content_type) do
      {:ok, CDN.url(r2_key)}
    end
  end

  @doc """
  Process an incoming Telegram webhook payload.
  Returns a normalized MessageEnvelope or handles non-message updates.
  """
  @spec handle_webhook(map()) :: {:ok, MessageEnvelope.t()} | {:ok, :ignored} | {:error, term()}
  def handle_webhook(%{"message" => _msg} = payload) do
    normalize_message(payload)
  end

  def handle_webhook(%{"edited_message" => msg}) do
    normalize_message(%{"message" => msg})
  end

  def handle_webhook(%{"callback_query" => _query}) do
    {:ok, :ignored}
  end

  def handle_webhook(_payload) do
    {:ok, :ignored}
  end

  # --- Private ---

  defp get_file_path(file_id, bot_token) do
    url = "#{@telegram_api_base}#{bot_token}/getFile?file_id=#{file_id}"

    case :httpc.request(:get, {String.to_charlist(url), []}, [], []) do
      {:ok, {{_, 200, _}, _headers, response_body}} ->
        case Jason.decode!(to_string(response_body)) do
          %{"ok" => true, "result" => %{"file_path" => file_path}} ->
            {:ok, file_path}

          %{"ok" => false, "description" => desc} ->
            {:error, {:telegram_api, desc}}
        end

      {:ok, {{_, status, _}, _headers, response_body}} ->
        {:error, %{status: status, body: to_string(response_body)}}

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp download_file(file_path, bot_token) do
    url = "#{@telegram_file_base}#{bot_token}/#{file_path}"

    case :httpc.request(:get, {String.to_charlist(url), []}, [], body_format: :binary) do
      {:ok, {{_, 200, _}, _headers, body}} ->
        {:ok, IO.iodata_to_binary(body)}

      {:ok, {{_, status, _}, _headers, response_body}} ->
        {:error, %{status: status, body: to_string(response_body)}}

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp extract_content(msg) do
    cond do
      msg["text"] ->
        {:text, %{text: msg["text"]}}

      msg["photo"] ->
        largest = Enum.max_by(msg["photo"], & &1["file_size"])
        {:media, %{text: msg["caption"], media_url: media_ref("tg", largest["file_id"])}}

      msg["video"] ->
        {:media, %{text: msg["caption"], media_url: media_ref("tg", msg["video"]["file_id"])}}

      msg["document"] ->
        {:media, %{text: msg["caption"], media_url: media_ref("tg", msg["document"]["file_id"])}}

      msg["sticker"] ->
        {:media, %{text: nil, media_url: media_ref("tg", msg["sticker"]["file_id"])}}

      true ->
        {:text, %{text: "[unsupported message type]"}}
    end
  end

  # Store file_id as a structured reference for later resolution via download_and_upload_media/2
  defp media_ref("tg", file_id), do: "tg://file/#{file_id}"

  defp build_display_name(from) do
    [from["first_name"], from["last_name"]]
    |> Enum.reject(&is_nil/1)
    |> Enum.join(" ")
  end

  defp get_reply_to(%{"reply_to_message" => %{"message_id" => id}}), do: to_string(id)
  defp get_reply_to(_), do: nil

  defp guess_content_type(file_path) do
    case Path.extname(file_path) do
      ".jpg" -> "image/jpeg"
      ".jpeg" -> "image/jpeg"
      ".png" -> "image/png"
      ".gif" -> "image/gif"
      ".webp" -> "image/webp"
      ".mp4" -> "video/mp4"
      ".webm" -> "video/webm"
      ".ogg" -> "audio/ogg"
      ".oga" -> "audio/ogg"
      ".pdf" -> "application/pdf"
      ".zip" -> "application/zip"
      _ -> "application/octet-stream"
    end
  end
end
