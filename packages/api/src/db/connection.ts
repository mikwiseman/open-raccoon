import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString =
  process.env.DATABASE_URL || 'postgres://raccoon:raccoon@localhost:5432/raccoon_prod';

const sql = postgres(connectionString, { max: 20 });
export const db = drizzle(sql);
export { sql };
