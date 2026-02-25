defmodule RaccoonBridges.Adapters.Telegram do
  @moduledoc """
  Telegram Bot API adapter.

  Handles normalizing incoming Telegram messages to MessageEnvelope format,
  sending outbound messages via the Bot API, and processing webhooks.

  Supports: text, photo, video, document, sticker message types.
  """

  alias RaccoonShared.MessageEnvelope

  @telegram_api_base "https://api.telegram.org/bot"

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

  defp extract_content(msg) do
    cond do
      msg["text"] ->
        {:text, %{text: msg["text"]}}

      msg["photo"] ->
        largest = Enum.max_by(msg["photo"], & &1["file_size"])
        {:media, %{text: msg["caption"], media_url: "tg://file/#{largest["file_id"]}"}}

      msg["video"] ->
        {:media, %{text: msg["caption"], media_url: "tg://file/#{msg["video"]["file_id"]}"}}

      msg["document"] ->
        {:media, %{text: msg["caption"], media_url: "tg://file/#{msg["document"]["file_id"]}"}}

      msg["sticker"] ->
        {:media, %{text: nil, media_url: "tg://file/#{msg["sticker"]["file_id"]}"}}

      true ->
        {:text, %{text: "[unsupported message type]"}}
    end
  end

  defp build_display_name(from) do
    [from["first_name"], from["last_name"]]
    |> Enum.reject(&is_nil/1)
    |> Enum.join(" ")
  end

  defp get_reply_to(%{"reply_to_message" => %{"message_id" => id}}), do: to_string(id)
  defp get_reply_to(_), do: nil
end
