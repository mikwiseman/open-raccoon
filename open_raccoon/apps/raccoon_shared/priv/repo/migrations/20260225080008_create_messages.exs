defmodule RaccoonShared.Repo.Migrations.CreateMessages do
  use Ecto.Migration

  def change do
    execute """
    CREATE TABLE messages (
      id UUID DEFAULT gen_random_uuid(),
      conversation_id UUID NOT NULL REFERENCES conversations(id),
      sender_id UUID REFERENCES users(id),
      sender_type VARCHAR(16) NOT NULL,
      type VARCHAR(16) NOT NULL,
      content JSONB NOT NULL,
      metadata JSONB DEFAULT '{}',
      edited_at TIMESTAMPTZ,
      deleted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (id, created_at),
      CHECK (sender_type IN ('human', 'agent', 'bridge', 'system')),
      CHECK (type IN ('text', 'media', 'code', 'embed', 'system', 'agent_status'))
    ) PARTITION BY RANGE (created_at);
    """, "DROP TABLE IF EXISTS messages CASCADE;"

    execute """
    CREATE TABLE messages_2026_01 PARTITION OF messages
      FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
    """, "DROP TABLE IF EXISTS messages_2026_01;"

    execute """
    CREATE TABLE messages_2026_02 PARTITION OF messages
      FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
    """, "DROP TABLE IF EXISTS messages_2026_02;"

    execute """
    CREATE TABLE messages_2026_03 PARTITION OF messages
      FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
    """, "DROP TABLE IF EXISTS messages_2026_03;"

    execute "CREATE INDEX idx_messages_conversation ON messages (conversation_id, created_at DESC);", ""
    execute "CREATE INDEX idx_messages_sender ON messages (sender_id);", ""
  end
end
