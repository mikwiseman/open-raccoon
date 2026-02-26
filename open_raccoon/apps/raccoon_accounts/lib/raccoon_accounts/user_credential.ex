defmodule RaccoonAccounts.UserCredential do
  @moduledoc """
  WebAuthn/Passkey credential schema.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "user_credentials" do
    belongs_to(:user, RaccoonAccounts.User)

    field(:credential_id, :binary)
    field(:public_key, :binary)
    field(:sign_count, :integer, default: 0)
    field(:name, :string)

    timestamps(type: :utc_datetime_usec, updated_at: false)
  end

  def changeset(credential, attrs) do
    credential
    |> cast(attrs, [:user_id, :credential_id, :public_key, :sign_count, :name])
    |> validate_required([:user_id, :credential_id, :public_key])
    |> validate_length(:name, max: 255)
    |> unique_constraint(:credential_id)
    |> foreign_key_constraint(:user_id)
  end
end
