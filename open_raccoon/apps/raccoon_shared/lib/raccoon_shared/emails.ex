defmodule RaccoonShared.Emails do
  @moduledoc """
  Email templates for the Open Raccoon platform.

  Uses Swoosh to compose emails that are delivered via the configured
  `RaccoonShared.Mailer` adapter (Resend in production, Local in dev).
  """

  import Swoosh.Email

  @from {"Open Raccoon", "noreply@mail.waiwai.is"}

  @doc """
  Build a magic link login email.
  """
  def magic_link(email, token, base_url) do
    magic_link_url = "#{base_url}/auth/magic-link/verify?token=#{token}"

    new()
    |> to(email)
    |> from(@from)
    |> subject("Your Open Raccoon login link")
    |> html_body(magic_link_html(magic_link_url))
    |> text_body(magic_link_text(magic_link_url))
  end

  defp magic_link_html(url) do
    """
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#111111;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#111111;padding:40px 20px;">
        <tr><td align="center">
          <table width="480" cellpadding="0" cellspacing="0" style="background:#1A1A1A;border-radius:12px;padding:40px;">
            <tr><td align="center" style="padding-bottom:24px;">
              <h1 style="color:#FFFFFF;font-size:24px;margin:12px 0 0;">Open Raccoon</h1>
            </td></tr>
            <tr><td style="color:#A0A0A0;font-size:16px;line-height:24px;padding-bottom:32px;" align="center">
              Click the button below to log in to your account. This link expires in 15 minutes.
            </td></tr>
            <tr><td align="center" style="padding-bottom:32px;">
              <a href="#{url}" style="display:inline-block;background:#6E56CF;color:#FFFFFF;text-decoration:none;font-size:16px;font-weight:600;padding:14px 32px;border-radius:8px;">
                Log In to Open Raccoon
              </a>
            </td></tr>
            <tr><td style="color:#666666;font-size:13px;line-height:20px;border-top:1px solid #2A2A2A;padding-top:24px;" align="center">
              If you didn't request this link, you can safely ignore this email.<br>
              <span style="color:#444444;">This link can only be used once.</span>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
    """
  end

  defp magic_link_text(url) do
    """
    Open Raccoon -- Login Link

    Click the link below to log in to your account:
    #{url}

    This link expires in 15 minutes and can only be used once.

    If you didn't request this link, you can safely ignore this email.
    """
  end

  @doc """
  Build a welcome email for a newly registered user.
  """
  def welcome(user) do
    new()
    |> to(user.email)
    |> from(@from)
    |> subject("Welcome to Open Raccoon!")
    |> html_body(welcome_html(user))
    |> text_body("Welcome to Open Raccoon, #{user.display_name || user.username}! Your account is ready.")
  end

  defp welcome_html(user) do
    name = user.display_name || user.username

    """
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#111111;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#111111;padding:40px 20px;">
        <tr><td align="center">
          <table width="480" cellpadding="0" cellspacing="0" style="background:#1A1A1A;border-radius:12px;padding:40px;">
            <tr><td align="center" style="padding-bottom:24px;">
              <h1 style="color:#FFFFFF;font-size:24px;margin:12px 0 0;">Welcome, #{name}!</h1>
            </td></tr>
            <tr><td style="color:#A0A0A0;font-size:16px;line-height:24px;" align="center">
              Your Open Raccoon account is ready. Start chatting with friends and AI agents.
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
    """
  end
end
