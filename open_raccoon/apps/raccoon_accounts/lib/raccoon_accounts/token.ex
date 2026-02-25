defmodule RaccoonAccounts.Token do
  @moduledoc """
  JWT token creation, refresh, and revocation.
  Access tokens are short-lived (15 min), refresh tokens are long-lived (30 days).
  """

  alias RaccoonAccounts.Guardian

  @access_ttl {15, :minute}
  @refresh_ttl {30, :day}

  @doc """
  Create an access/refresh token pair for the given user.
  Returns `{:ok, %{access_token: ..., refresh_token: ..., expires_in: 900}}`.
  """
  def create_tokens(user) do
    with {:ok, access_token, _claims} <-
           Guardian.encode_and_sign(user, %{}, token_type: "access", ttl: @access_ttl),
         {:ok, refresh_token, _claims} <-
           Guardian.encode_and_sign(user, %{}, token_type: "refresh", ttl: @refresh_ttl) do
      {:ok, %{access_token: access_token, refresh_token: refresh_token, expires_in: 900}}
    end
  end

  @doc """
  Refresh tokens by validating the refresh token and issuing a new pair.
  Returns `{:ok, tokens}` or `{:error, reason}`.
  """
  def refresh(refresh_token) do
    case Guardian.decode_and_verify(refresh_token, %{"typ" => "refresh"}) do
      {:ok, claims} ->
        case Guardian.resource_from_claims(claims) do
          {:ok, user} -> create_tokens(user)
          error -> error
        end

      error ->
        error
    end
  end

  @doc """
  Revoke a token (typically the refresh token on logout).
  """
  def revoke(token) do
    Guardian.revoke(token)
  end
end
