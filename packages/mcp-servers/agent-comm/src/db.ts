import postgres from 'postgres';

const connectionString =
  process.env.DATABASE_URL || 'postgres://waiagents:waiagents@localhost:5432/wai_agents_prod';

export const sql = postgres(connectionString, { max: 5 });
