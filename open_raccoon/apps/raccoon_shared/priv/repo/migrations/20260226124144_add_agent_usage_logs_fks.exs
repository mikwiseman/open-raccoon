defmodule RaccoonShared.Repo.Migrations.AddAgentUsageLogsFks do
  use Ecto.Migration

  def up do
    # Drop existing indexes that will conflict with the new FK indexes
    # (Ecto adds indexes automatically for references)

    # Add FK constraint for user_id
    execute """
    ALTER TABLE agent_usage_logs
      ADD CONSTRAINT agent_usage_logs_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    """

    # Add FK constraint for agent_id
    execute """
    ALTER TABLE agent_usage_logs
      ADD CONSTRAINT agent_usage_logs_agent_id_fkey
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    """
  end

  def down do
    execute "ALTER TABLE agent_usage_logs DROP CONSTRAINT agent_usage_logs_user_id_fkey"
    execute "ALTER TABLE agent_usage_logs DROP CONSTRAINT agent_usage_logs_agent_id_fkey"
  end
end
