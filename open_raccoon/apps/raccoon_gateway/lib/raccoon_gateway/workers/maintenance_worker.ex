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
    max_attempts: 3

  alias RaccoonShared.Repo
  import Ecto.Query

  require Logger

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"task" => "create_partitions"}}) do
    Logger.info("Creating message table partitions for the next 3 months")

    now = Date.utc_today()

    results =
      for offset <- 0..2 do
        month_start = advance_months(now, offset)
        month_end = month_start |> Date.end_of_month() |> Date.add(1)
        partition_name = "messages_#{Calendar.strftime(month_start, "%Y_%m")}"

        unless Regex.match?(~r/\Amessages_\d{4}_\d{2}\z/, partition_name) do
          raise "Invalid partition name: #{partition_name}"
        end

        sql =
          "CREATE TABLE IF NOT EXISTS messages_partition PARTITION OF messages FOR VALUES FROM ($1::date) TO ($2::date)"
          |> String.replace("messages_partition", partition_name)

        case Repo.query(sql, [month_start, month_end]) do
          {:ok, _} ->
            Logger.info("Created partition #{partition_name}")
            :ok

          {:error, %{postgres: %{code: :duplicate_table}}} ->
            Logger.info("Partition #{partition_name} already exists")
            :ok

          {:error, reason} ->
            Logger.error("Failed to create partition #{partition_name}: #{inspect(reason)}")
            {:error, reason}
        end
      end

    case Enum.find(results, &match?({:error, _}, &1)) do
      nil -> :ok
      error -> error
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

  defp advance_months(date, 0), do: Date.beginning_of_month(date)

  defp advance_months(date, n) when n > 0 do
    date
    |> Date.end_of_month()
    |> Date.add(1)
    |> advance_months(n - 1)
  end
end
