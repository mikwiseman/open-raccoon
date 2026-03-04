import postgres from 'postgres';

const connectionString =
  process.env.DATABASE_URL || 'postgres://raccoon:raccoon@localhost:5432/raccoon_prod';

export const sql = postgres(connectionString, { max: 5 });
