defmodule RaccoonAccounts do
  @moduledoc """
  Account management context: user registration, authentication, profiles.
  """

  alias RaccoonShared.Repo
  alias RaccoonAccounts.User
  alias RaccoonAccounts.UserCredential

  # --- Users ---

  def register_user(attrs) do
    %User{}
    |> User.registration_changeset(attrs)
    |> Repo.insert()
  end

  def get_user(id), do: Repo.get(User, id)

  def get_user!(id), do: Repo.get!(User, id)

  def get_user_by_username(username), do: Repo.get_by(User, username: username)

  def get_user_by_email(email), do: Repo.get_by(User, email: email)

  def update_user(%User{} = user, attrs) do
    user |> User.changeset(attrs) |> Repo.update()
  end

  def delete_user(%User{} = user) do
    user |> User.changeset(%{status: :deleted}) |> Repo.update()
  end

  def authenticate_by_email_password(email, password) do
    user = get_user_by_email(email)

    cond do
      user && Argon2.verify_pass(password, user.password_hash) -> {:ok, user}
      user -> {:error, :invalid_credentials}
      true -> Argon2.no_user_verify(); {:error, :invalid_credentials}
    end
  end

  # --- Credentials (Passkeys) ---

  def create_credential(attrs) do
    %UserCredential{}
    |> UserCredential.changeset(attrs)
    |> Repo.insert()
  end

  def list_user_credentials(user_id) do
    import Ecto.Query
    Repo.all(from c in UserCredential, where: c.user_id == ^user_id)
  end

  def get_credential_by_credential_id(credential_id) do
    Repo.get_by(UserCredential, credential_id: credential_id)
  end
end
