defmodule RaccoonBridges.Adapters.WhatsApp do
  @moduledoc """
  WhatsApp Cloud API adapter.

  Handles normalizing incoming WhatsApp messages to MessageEnvelope format,
  sending outbound messages via the Cloud API, processing webhooks, and
  challenge/response webhook verification.
  """

  alias RaccoonShared.MessageEnvelope

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

    case :httpc.request(:post, {String.to_charlist(url), headers, ~c"application/json", body}, [], []) do
      {:ok, {{_, 200, _}, _headers, response_body}} ->
        {:ok, Jason.decode!(to_string(response_body))}

      {:ok, {{_, status, _}, _headers, response_body}} ->
        {:error, %{status: status, body: to_string(response_body)}}

      {:error, reason} ->
        {:error, reason}
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
end
