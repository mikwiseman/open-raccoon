defmodule RaccoonGatewayWeb.AuthController do
  use RaccoonGatewayWeb, :controller
  action_fallback RaccoonGatewayWeb.FallbackController

  alias RaccoonAccounts.Auth
  alias RaccoonAccounts.Token
  alias RaccoonAccounts.MagicLinkToken

  def register(conn, %{"username" => _, "email" => _, "password" => _} = params) do
    with {:ok, user} <- Auth.register(params),
         {:ok, tokens} <- Token.create_tokens(user) do
      conn
      |> put_status(:created)
      |> json(%{user: user_json(user), tokens: tokens})
    end
  end

  def register(conn, _params) do
    conn
    |> put_status(:unprocessable_entity)
    |> json(%{
      error: %{
        code: "validation_failed",
        message: "username, email, and password are required"
      }
    })
  end

  def login(conn, %{"email" => email, "password" => password}) do
    with {:ok, user} <- Auth.authenticate(email, password),
         {:ok, tokens} <- Token.create_tokens(user) do
      json(conn, %{user: user_json(user), tokens: tokens})
    end
  end

  def login(conn, _params) do
    conn
    |> put_status(:unprocessable_entity)
    |> json(%{
      error: %{code: "validation_failed", message: "email and password are required"}
    })
  end

  def refresh(conn, %{"refresh_token" => refresh_token}) do
    with {:ok, tokens} <- Token.refresh(refresh_token) do
      json(conn, tokens)
    end
  end

  def refresh(conn, _params) do
    conn
    |> put_status(:unprocessable_entity)
    |> json(%{error: %{code: "validation_failed", message: "refresh_token is required"}})
  end

  def logout(conn, %{"refresh_token" => token}) do
    Token.revoke(token)
    send_resp(conn, :no_content, "")
  end

  def logout(conn, _params) do
    # Even without a refresh_token, we can still "logout" successfully
    send_resp(conn, :no_content, "")
  end

  def magic_link(conn, %{"email" => email}) do
    # Always return the same response regardless of whether the email exists,
    # to avoid revealing whether an account is registered.
    base_url = Application.fetch_env!(:raccoon_gateway, :base_url)

    case MagicLinkToken.generate_token(email) do
      {:ok, token} ->
        email
        |> RaccoonShared.Emails.magic_link(token, base_url)
        |> RaccoonShared.Mailer.deliver()

      {:error, _changeset} ->
        :ok
    end

    json(conn, %{message: "If an account exists with that email, a login link has been sent."})
  end

  def magic_link(conn, _params) do
    conn
    |> put_status(:unprocessable_entity)
    |> json(%{error: %{code: "validation_failed", message: "email is required"}})
  end

  def verify_magic_link(conn, %{"token" => token}) do
    with {:ok, email} <- MagicLinkToken.verify_token(token),
         {:ok, user} <- find_or_create_user(email),
         {:ok, tokens} <- Token.create_tokens(user) do
      json(conn, %{user: user_json(user), tokens: tokens})
    else
      {:error, :invalid_token} ->
        conn
        |> put_status(:unauthorized)
        |> json(%{error: %{code: "invalid_token", message: "Token is invalid or expired"}})

      {:error, changeset} when is_struct(changeset, Ecto.Changeset) ->
        {:error, changeset}

      error ->
        error
    end
  end

  def verify_magic_link(conn, _params) do
    conn
    |> put_status(:unprocessable_entity)
    |> json(%{error: %{code: "validation_failed", message: "token is required"}})
  end

  defp find_or_create_user(email) do
    case RaccoonAccounts.get_user_by_email(email) do
      nil ->
        # Create a new user with a username derived from the email prefix
        username = generate_username_from_email(email)

        RaccoonAccounts.register_user(%{
          "username" => username,
          "email" => email,
          "password" => :crypto.strong_rand_bytes(32) |> Base.url_encode64(padding: false)
        })

      user ->
        {:ok, user}
    end
  end

  defp generate_username_from_email(email) do
    base =
      email
      |> String.split("@")
      |> List.first()
      |> String.replace(~r/[^a-zA-Z0-9_]/, "_")
      |> String.slice(0, 28)

    # Ensure minimum length
    base = if String.length(base) < 3, do: base <> "_user", else: base

    # If the username is taken, append random digits
    case RaccoonAccounts.get_user_by_username(base) do
      nil -> base
      _taken -> "#{base}_#{:rand.uniform(9999)}"
    end
  end

  defp user_json(user) do
    %{
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      email: user.email,
      avatar_url: user.avatar_url,
      bio: user.bio,
      status: user.status,
      role: user.role,
      created_at: user.inserted_at,
      updated_at: user.updated_at
    }
  end
end
