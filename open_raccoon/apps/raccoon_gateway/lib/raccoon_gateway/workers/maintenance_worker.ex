defmodule RaccoonGateway.Workers.MaintenanceWorker do
  @moduledoc """
  Oban worker for system maintenance tasks.

  - Create new monthly message table partitions ahead of time
  - Clean up expired idempotency keys (>24hr)
  - Clean up expired sessions/tokens
  - Prune old delivery receipts
  """

  use Oban.Worker,
    queue: :maintenance,
    max_attempts: 1

  alias RaccoonShared.Repo
  import Ecto.Query

  require Logger

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"task" => "create_partitions"}}) do
    Logger.info("Creating message table partitions for next month")

    # Calculate next month boundaries
    now = Date.utc_today()
    next_month_start = now |> Date.end_of_month() |> Date.add(1)
    next_month_end = next_month_start |> Date.end_of_month() |> Date.add(1)

    partition_name = "messages_#{Calendar.strftime(next_month_start, "%Y_%m")}"

    sql = """
    CREATE TABLE IF NOT EXISTS #{partition_name}
    PARTITION OF messages
    FOR VALUES FROM ('#{next_month_start}') TO ('#{next_month_end}')
    """

    case Repo.query(sql) do
      {:ok, _} ->
        Logger.info("Created partition #{partition_name}")
        :ok

      {:error, %{postgres: %{code: :duplicate_table}}} ->
        Logger.info("Partition #{partition_name} already exists")
        :ok

      {:error, reason} ->
        Logger.error("Failed to create partition: #{inspect(reason)}")
        {:error, reason}
    end
  end

  def perform(%Oban.Job{args: %{"task" => "cleanup_idempotency_keys"}}) do
    Logger.info("Cleaning up expired idempotency keys")

    now = DateTime.utc_now()

    {count, _} =
      from(ik in RaccoonShared.Idempotency,
        where: ik.expires_at < ^now
      )
      |> Repo.delete_all()

    Logger.info("Deleted #{count} expired idempotency keys")
    :ok
  end

  def perform(%Oban.Job{args: %{"task" => "cleanup_sessions"}}) do
    Logger.info("Cleaning up expired sessions/tokens")

    # Placeholder: Guardian tokens are stateless JWTs,
    # but if we add a token blocklist/revocation table,
    # we'd clean expired entries here.
    :ok
  end

  def perform(%Oban.Job{args: %{"task" => "prune_delivery_receipts"}}) do
    Logger.info("Pruning old delivery receipts")

    # Placeholder: delete delivery receipts older than 30 days
    # cutoff = DateTime.add(DateTime.utc_now(), -30 * 24 * 3600, :second)
    # from(dr in DeliveryReceipt, where: dr.inserted_at < ^cutoff) |> Repo.delete_all()
    :ok
  end

  def perform(%Oban.Job{args: args}) do
    {:error, "Unknown maintenance task: #{inspect(args)}"}
  end
end
