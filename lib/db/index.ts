import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:5432/trackforge";

// Enable SSL for remote Supabase / cloud Postgres instances
const isRemote =
  connectionString.includes("supabase.co") ||
  connectionString.includes("neon.tech") ||
  process.env.NODE_ENV === "production";

const client = postgres(connectionString, {
  prepare: false,
  ssl: isRemote ? { rejectUnauthorized: false } : false,
});

export const db = drizzle(client, { schema });
