defmodule RaccoonGateway.Workers.MailerWorker do
  @moduledoc """
  Oban worker for sending email notifications.

  - New message notifications
  - Mention notifications
  - Bridge alert notifications

  Currently a placeholder that logs to console.
  In production, integrate with an email service (e.g., Swoosh, Bamboo).
  """

  use Oban.Worker,
    queue: :mailers,
    max_attempts: 5

  require Logger

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"task" => "new_message", "to" => to, "from" => from, "conversation_id" => conversation_id}}) do
    Logger.info("[MailerWorker] Sending new message notification to #{to} from #{from} in conversation #{conversation_id}")

    # Placeholder: send email via Swoosh/Bamboo
    # Email.new_message(to, from, conversation_id) |> Mailer.deliver()
    :ok
  end

  def perform(%Oban.Job{args: %{"task" => "mention", "to" => to, "mentioned_by" => mentioned_by, "conversation_id" => conversation_id}}) do
    Logger.info("[MailerWorker] Sending mention notification to #{to} by #{mentioned_by} in conversation #{conversation_id}")

    # Placeholder: send mention notification email
    :ok
  end

  def perform(%Oban.Job{args: %{"task" => "bridge_alert", "to" => to, "bridge_id" => bridge_id, "alert_type" => alert_type}}) do
    Logger.info("[MailerWorker] Sending bridge alert (#{alert_type}) to #{to} for bridge #{bridge_id}")

    # Placeholder: send bridge alert email
    :ok
  end

  def perform(%Oban.Job{args: args}) do
    {:error, "Unknown mailer task: #{inspect(args)}"}
  end
end
