defmodule RaccoonAccounts.Auth do
  @moduledoc """
  Core authentication logic: registration and credential verification.
  """

  alias RaccoonShared.Repo
  alias RaccoonAccounts.User

  @doc """
  Register a new user with the given attributes.
  Returns `{:ok, user}` or `{:error, changeset}`.
  """
  def register(attrs) do
    %User{}
    |> User.registration_changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Authenticate a user by email and password.
  Returns `{:ok, user}` or `{:error, :invalid_credentials}`.
  Uses constant-time comparison to prevent timing attacks.
  """
  def authenticate(email, password) do
    user = Repo.get_by(User, email: email)

    cond do
      user && Argon2.verify_pass(password, user.password_hash) ->
        {:ok, user}

      user ->
        {:error, :invalid_credentials}

      true ->
        # Prevent timing attacks by simulating password check
        Argon2.no_user_verify()
        {:error, :invalid_credentials}
    end
  end
end
