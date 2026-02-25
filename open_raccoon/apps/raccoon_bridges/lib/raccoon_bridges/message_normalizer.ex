defmodule RaccoonBridges.MessageNormalizer do
  @moduledoc """
  Unified bridge-to-envelope message conversion.

  Takes platform-specific messages and delegates to the appropriate adapter
  to produce a `%RaccoonShared.MessageEnvelope{}`.
  """

  alias RaccoonBridges.Adapters.{Telegram, WhatsApp}
  alias RaccoonShared.MessageEnvelope

  @doc """
  Normalize a platform-specific message into a `%MessageEnvelope{}`.

  ## Parameters
    - `platform` - The bridge platform atom (`:telegram`, `:whatsapp`)
    - `payload` - The raw webhook payload map from the platform
  """
  @spec normalize(:telegram | :whatsapp, map()) ::
          {:ok, MessageEnvelope.t()} | {:error, term()}
  def normalize(:telegram, payload) do
    Telegram.normalize_message(payload)
  end

  def normalize(:whatsapp, payload) do
    WhatsApp.normalize_message(payload)
  end

  def normalize(platform, _payload) do
    {:error, {:unsupported_platform, platform}}
  end

  @doc """
  Normalize sender info from a platform-specific format into a common map.

  Returns `%{id: String.t(), type: :bridge, display_name: String.t(), avatar_url: String.t() | nil}`
  """
  @spec normalize_sender(:telegram | :whatsapp, map()) :: map()
  def normalize_sender(:telegram, %{"from" => from}) do
    %{
      id: to_string(from["id"]),
      type: :bridge,
      display_name:
        [from["first_name"], from["last_name"]]
        |> Enum.reject(&is_nil/1)
        |> Enum.join(" "),
      avatar_url: nil
    }
  end

  def normalize_sender(:whatsapp, %{"from" => phone, "contacts" => [contact | _]}) do
    %{
      id: phone,
      type: :bridge,
      display_name: get_in(contact, ["profile", "name"]) || phone,
      avatar_url: nil
    }
  end

  def normalize_sender(_platform, _payload), do: %{id: "unknown", type: :bridge, display_name: "Unknown", avatar_url: nil}

  @doc """
  Normalize a timestamp from a platform-specific format to a DateTime.
  """
  @spec normalize_timestamp(:telegram | :whatsapp, map()) :: DateTime.t()
  def normalize_timestamp(:telegram, %{"message" => %{"date" => unix}}) do
    DateTime.from_unix!(unix)
  end

  def normalize_timestamp(:whatsapp, %{"messages" => [%{"timestamp" => ts} | _]}) do
    DateTime.from_unix!(String.to_integer(ts))
  end

  def normalize_timestamp(_platform, _payload), do: DateTime.utc_now()
end
