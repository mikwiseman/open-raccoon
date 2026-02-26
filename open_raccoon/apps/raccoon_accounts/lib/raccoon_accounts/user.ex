defmodule RaccoonAccounts.User do
  @moduledoc """
  User schema for the Open Raccoon platform.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "users" do
    field(:username, :string)
    field(:display_name, :string)
    field(:email, :string)
    field(:password_hash, :string)
    field(:password, :string, virtual: true, redact: true)
    field(:avatar_url, :string)
    field(:bio, :string)
    field(:status, Ecto.Enum, values: [:active, :suspended, :deleted], default: :active)
    field(:role, Ecto.Enum, values: [:user, :admin, :moderator], default: :user)
    field(:settings, :map, default: %{})
    field(:last_seen_at, :utc_datetime_usec)

    has_many(:credentials, RaccoonAccounts.UserCredential)

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(user, attrs) do
    user
    |> cast(attrs, [
      :username,
      :display_name,
      :email,
      :password,
      :avatar_url,
      :bio,
      :status,
      :role,
      :settings,
      :last_seen_at
    ])
    |> validate_required([:username])
    |> validate_length(:username, min: 3, max: 32)
    |> validate_format(:username, ~r/^[a-zA-Z0-9_]+$/)
    |> validate_length(:display_name, max: 128)
    |> validate_format(:email, ~r/^[^\s]+@[^\s]+$/)
    |> validate_length(:email, max: 255)
    |> validate_inclusion(:status, [:active, :suspended, :deleted])
    |> validate_inclusion(:role, [:user, :admin, :moderator])
    |> unique_constraint(:username)
    |> unique_constraint(:email)
  end

  def registration_changeset(user, attrs) do
    user
    |> changeset(attrs)
    |> validate_required([:email, :password])
    |> validate_length(:password, min: 8)
    |> hash_password()
  end

  defp hash_password(%{valid?: true, changes: %{password: password}} = changeset) do
    put_change(changeset, :password_hash, Argon2.hash_pwd_salt(password))
  end

  defp hash_password(changeset), do: changeset
end
