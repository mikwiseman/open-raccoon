defmodule RaccoonAccounts.MagicLinkToken do
  @moduledoc """
  Schema and helpers for magic link authentication tokens.

  Tokens are single-use, expire after 15 minutes, and are stored in the
  `magic_link_tokens` table. On verification the token is marked as used
  and the associated email address is returned.
  """

  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query

  alias RaccoonShared.Repo

  @primary_key {:id, :binary_id, autogenerate: true}
  schema "magic_link_tokens" do
    field :email, :string
    field :token, :string
    field :used, :boolean, default: false
    field :expires_at, :utc_datetime_usec

    timestamps(type: :utc_datetime_usec, updated_at: false)
  end

  def changeset(magic_link_token, attrs) do
    magic_link_token
    |> cast(attrs, [:email, :token, :used, :expires_at])
    |> validate_required([:email, :token, :expires_at])
    |> unique_constraint(:token)
  end

  @doc """
  Generate a magic link token for the given email address.

  Creates a 32-byte cryptographically random token (Base64 URL-safe encoded)
  with a 15-minute expiry window.

  Returns `{:ok, token_string}` or `{:error, changeset}`.
  """
  def generate_token(email) do
    token = :crypto.strong_rand_bytes(32) |> Base.url_encode64(padding: false)
    expires_at = DateTime.utc_now() |> DateTime.add(15, :minute)

    result =
      %__MODULE__{}
      |> changeset(%{email: email, token: token, expires_at: expires_at})
      |> Repo.insert()

    case result do
      {:ok, record} -> {:ok, record.token}
      {:error, changeset} -> {:error, changeset}
    end
  end

  @doc """
  Verify a magic link token.

  Finds the token record that is not used and not expired, marks it as used,
  and returns the associated email address.

  Returns `{:ok, email}` or `{:error, :invalid_token}`.
  """
  def verify_token(token) do
    now = DateTime.utc_now()

    query =
      from t in __MODULE__,
        where: t.token == ^token and t.used == false and t.expires_at > ^now

    case Repo.one(query) do
      nil ->
        {:error, :invalid_token}

      record ->
        record
        |> changeset(%{used: true})
        |> Repo.update()

        {:ok, record.email}
    end
  end

  @doc """
  Delete all expired tokens from the database (maintenance helper).
  """
  def cleanup_expired do
    now = DateTime.utc_now()

    from(t in __MODULE__, where: t.expires_at < ^now)
    |> Repo.delete_all()
  end
end
