defmodule RaccoonPages.PageVersion do
  @moduledoc """
  Page version history schema.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "page_versions" do
    belongs_to :page, RaccoonPages.Page

    field :version, :integer
    field :r2_path, :string
    field :changes, :string

    timestamps(type: :utc_datetime_usec, updated_at: false)
  end

  def changeset(page_version, attrs) do
    page_version
    |> cast(attrs, [:page_id, :version, :r2_path, :changes])
    |> validate_required([:page_id, :version, :r2_path])
    |> unique_constraint([:page_id, :version])
    |> foreign_key_constraint(:page_id)
  end
end
