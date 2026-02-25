defmodule RaccoonPages.Page do
  @moduledoc """
  Page schema for user-created web pages deployed to raccoon.page.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "pages" do
    belongs_to :creator, RaccoonAccounts.User
    belongs_to :agent, RaccoonAgents.Agent
    belongs_to :conversation, RaccoonChat.Conversation
    belongs_to :forked_from_page, RaccoonPages.Page, foreign_key: :forked_from

    field :title, :string
    field :slug, :string
    field :description, :string
    field :thumbnail_url, :string
    field :r2_path, :string
    field :deploy_url, :string
    field :custom_domain, :string
    field :version, :integer, default: 1
    field :visibility, Ecto.Enum, values: [:public, :unlisted, :private], default: :public
    field :view_count, :integer, default: 0

    has_many :versions, RaccoonPages.PageVersion

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(page, attrs) do
    page
    |> cast(attrs, [
      :creator_id, :agent_id, :conversation_id, :title, :slug, :description,
      :thumbnail_url, :r2_path, :deploy_url, :custom_domain, :version,
      :forked_from, :visibility
    ])
    |> validate_required([:creator_id, :title, :slug, :r2_path])
    |> validate_length(:title, max: 255)
    |> validate_length(:slug, max: 128)
    |> validate_number(:version, greater_than: 0)
    |> validate_inclusion(:visibility, [:public, :unlisted, :private])
    |> unique_constraint([:creator_id, :slug])
    |> foreign_key_constraint(:creator_id)
    |> foreign_key_constraint(:agent_id)
    |> foreign_key_constraint(:conversation_id)
    |> foreign_key_constraint(:forked_from)
  end
end
