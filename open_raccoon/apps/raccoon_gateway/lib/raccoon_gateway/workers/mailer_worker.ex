defmodule RaccoonGateway.Workers.MailerWorker do
  @moduledoc """
  Oban worker for sending email notifications.

  Supported task types:
  - "magic_link" — sends a magic link login email
  - "welcome" — sends a welcome email to a new user
  - "new_message" — sends a new message notification email
  - "mention" — sends a mention notification email
  - "bridge_alert" — sends a bridge alert notification email
  """

  use Oban.Worker,
    queue: :mailers,
    max_attempts: 5

  require Logger

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"task" => "magic_link", "email" => email, "token" => token}}) do
    base_url = Application.fetch_env!(:raccoon_gateway, :base_url)

    email
    |> RaccoonShared.Emails.magic_link(token, base_url)
    |> deliver_email("magic_link")
  end

  def perform(%Oban.Job{args: %{"task" => "welcome", "user_id" => user_id}}) do
    case RaccoonAccounts.get_user(user_id) do
      nil ->
        {:discard, "User not found: #{user_id}"}

      user ->
        user
        |> RaccoonShared.Emails.welcome()
        |> deliver_email("welcome")
    end
  end

  def perform(%Oban.Job{
        args: %{
          "task" => "new_message",
          "to" => to,
          "from" => from,
          "conversation_id" => conversation_id
        }
      }) do
    Logger.info(
      "[MailerWorker] Sending new message notification to #{to} from #{from} in conversation #{conversation_id}"
    )

    import Swoosh.Email

    new()
    |> to(to)
    |> from({"Open Raccoon", "noreply@mail.waiwai.is"})
    |> subject("New message in your conversation")
    |> text_body("You have a new message from #{from} in conversation #{conversation_id}.")
    |> deliver_email("new_message")
  end

  def perform(%Oban.Job{
        args: %{
          "task" => "mention",
          "to" => to,
          "mentioned_by" => mentioned_by,
          "conversation_id" => conversation_id
        }
      }) do
    Logger.info(
      "[MailerWorker] Sending mention notification to #{to} by #{mentioned_by} in conversation #{conversation_id}"
    )

    import Swoosh.Email

    new()
    |> to(to)
    |> from({"Open Raccoon", "noreply@mail.waiwai.is"})
    |> subject("You were mentioned in a conversation")
    |> text_body("#{mentioned_by} mentioned you in conversation #{conversation_id}.")
    |> deliver_email("mention")
  end

  def perform(%Oban.Job{
        args: %{
          "task" => "bridge_alert",
          "to" => to,
          "bridge_id" => bridge_id,
          "alert_type" => alert_type
        }
      }) do
    Logger.info(
      "[MailerWorker] Sending bridge alert (#{alert_type}) to #{to} for bridge #{bridge_id}"
    )

    import Swoosh.Email

    new()
    |> to(to)
    |> from({"Open Raccoon", "noreply@mail.waiwai.is"})
    |> subject("Bridge alert: #{alert_type}")
    |> text_body("Alert (#{alert_type}) for bridge #{bridge_id}.")
    |> deliver_email("bridge_alert")
  end

  def perform(%Oban.Job{args: args}) do
    {:error, "Unknown mailer task: #{inspect(args)}"}
  end

  defp deliver_email(email, task_type) do
    case RaccoonShared.Mailer.deliver(email) do
      {:ok, _} ->
        :ok

      {:error, reason} ->
        Logger.error("[MailerWorker] Failed to deliver #{task_type} email: #{inspect(reason)}")
        {:error, "Email delivery failed: #{inspect(reason)}"}
    end
  end
end
