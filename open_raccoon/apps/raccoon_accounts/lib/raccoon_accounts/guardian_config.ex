defmodule RaccoonAccounts.Guardian do
  @moduledoc """
  Guardian configuration for JWT authentication.
  Encodes user IDs into tokens and retrieves users from claims.
  """

  use Guardian, otp_app: :raccoon_accounts

  alias RaccoonShared.Repo
  alias RaccoonAccounts.User

  @impl true
  def subject_for_token(%User{id: id}, _claims), do: {:ok, id}
  def subject_for_token(_, _), do: {:error, :invalid_resource}

  @impl true
  def resource_from_claims(%{"sub" => id}) do
    case Repo.get(User, id) do
      nil -> {:error, :resource_not_found}
      user -> {:ok, user}
    end
  end

  def resource_from_claims(_), do: {:error, :invalid_claims}

  @impl true
  def after_decode_and_verify(claims, _options) do
    case RaccoonAccounts.Token.check_not_revoked(claims) do
      :ok -> {:ok, claims}
      {:error, _} = error -> error
    end
  end
end
