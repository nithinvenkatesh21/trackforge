import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const DEFAULT_SUPABASE_URL =
  "postgresql://postgres:lloydVenk123%21Nv20890%21@db.pglskfzycplkfrmaglgy.supabase.co:5432/postgres";

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.SUPABASE_DATABASE_URL ||
  DEFAULT_SUPABASE_URL;

// Enable SSL for remote Supabase / cloud Postgres instances
const isRemote =
  connectionString.includes("supabase.co") ||
  connectionString.includes("neon.tech") ||
  process.env.NODE_ENV === "production";

declare global {
  var _postgresClient: ReturnType<typeof postgres> | undefined;
}

const client =
  globalThis._postgresClient ||
  postgres(connectionString, {
    prepare: false,
    ssl: isRemote ? { rejectUnauthorized: false } : false,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis._postgresClient = client;
}

export const db = drizzle(client, { schema });

