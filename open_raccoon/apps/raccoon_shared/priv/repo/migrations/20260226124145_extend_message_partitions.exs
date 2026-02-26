defmodule RaccoonShared.Repo.Migrations.ExtendMessagePartitions do
  use Ecto.Migration

  def up do
    # Current partitions end at 2026-07-01 (messages_2026_06 covers June).
    # Create partitions from July 2026 through December 2027.

    partitions = [
      {"messages_2026_07", "2026-07-01", "2026-08-01"},
      {"messages_2026_08", "2026-08-01", "2026-09-01"},
      {"messages_2026_09", "2026-09-01", "2026-10-01"},
      {"messages_2026_10", "2026-10-01", "2026-11-01"},
      {"messages_2026_11", "2026-11-01", "2026-12-01"},
      {"messages_2026_12", "2026-12-01", "2027-01-01"},
      {"messages_2027_01", "2027-01-01", "2027-02-01"},
      {"messages_2027_02", "2027-02-01", "2027-03-01"},
      {"messages_2027_03", "2027-03-01", "2027-04-01"},
      {"messages_2027_04", "2027-04-01", "2027-05-01"},
      {"messages_2027_05", "2027-05-01", "2027-06-01"},
      {"messages_2027_06", "2027-06-01", "2027-07-01"},
      {"messages_2027_07", "2027-07-01", "2027-08-01"},
      {"messages_2027_08", "2027-08-01", "2027-09-01"},
      {"messages_2027_09", "2027-09-01", "2027-10-01"},
      {"messages_2027_10", "2027-10-01", "2027-11-01"},
      {"messages_2027_11", "2027-11-01", "2027-12-01"},
      {"messages_2027_12", "2027-12-01", "2028-01-01"}
    ]

    for {name, from_date, to_date} <- partitions do
      execute """
      CREATE TABLE IF NOT EXISTS #{name}
        PARTITION OF messages
        FOR VALUES FROM ('#{from_date}') TO ('#{to_date}');
      """
    end
  end

  def down do
    partitions = [
      "messages_2026_07", "messages_2026_08", "messages_2026_09",
      "messages_2026_10", "messages_2026_11", "messages_2026_12",
      "messages_2027_01", "messages_2027_02", "messages_2027_03",
      "messages_2027_04", "messages_2027_05", "messages_2027_06",
      "messages_2027_07", "messages_2027_08", "messages_2027_09",
      "messages_2027_10", "messages_2027_11", "messages_2027_12"
    ]

    for name <- partitions do
      execute "DROP TABLE IF EXISTS #{name};"
    end
  end
end
