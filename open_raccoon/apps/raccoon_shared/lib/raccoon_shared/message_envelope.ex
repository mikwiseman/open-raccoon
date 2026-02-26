defmodule RaccoonShared.MessageEnvelope do
  @moduledoc """
  Unified message envelope format matching spec Section 4.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @type t :: %__MODULE__{}

  @primary_key false
  embedded_schema do
    field(:conversation_id, :string)
    field(:type, Ecto.Enum, values: [:text, :media, :code, :embed, :system, :agent_status])

    embeds_one :sender, Sender, primary_key: false do
      field(:id, :string)
      field(:type, Ecto.Enum, values: [:human, :agent, :bridge, :system])
      field(:display_name, :string)
      field(:avatar_url, :string)
    end

    embeds_one :content, Content, primary_key: false do
      field(:text, :string)
      field(:media_url, :string)
      field(:code, :string)
      field(:language, :string)
    end

    embeds_one :metadata, Metadata, primary_key: false do
      field(:bridge_source, :string)
      field(:agent_model, :string)
      field(:agent_tools_used, {:array, :string}, default: [])
      field(:encryption, Ecto.Enum, values: [:e2e, :server, :none], default: :none)
      field(:reply_to, :string)
      field(:thread_id, :string)
    end

    field(:reactions, {:array, :map}, default: [])
    field(:created_at, :utc_datetime_usec)
    field(:updated_at, :utc_datetime_usec)
  end

  def changeset(envelope, attrs) do
    envelope
    |> cast(attrs, [:conversation_id, :type, :reactions, :created_at, :updated_at])
    |> cast_embed(:sender, required: true, with: &sender_changeset/2)
    |> cast_embed(:content, required: true, with: &content_changeset/2)
    |> cast_embed(:metadata, with: &metadata_changeset/2)
    |> validate_required([:conversation_id, :type])
  end

  defp sender_changeset(sender, attrs) do
    sender
    |> cast(attrs, [:id, :type, :display_name, :avatar_url])
    |> validate_required([:id, :type])
  end

  defp content_changeset(content, attrs) do
    cast(content, attrs, [:text, :media_url, :code, :language])
  end

  defp metadata_changeset(metadata, attrs) do
    cast(metadata, attrs, [
      :bridge_source,
      :agent_model,
      :agent_tools_used,
      :encryption,
      :reply_to,
      :thread_id
    ])
  end
end
