import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const DEFAULT_SUPABASE_URL =
  "postgresql://postgres:lloydVenk123%21Nv20890%21@db.pglskfzycplkfrmaglgy.supabase.co:6543/postgres";

let rawConnectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.SUPABASE_DATABASE_URL ||
  DEFAULT_SUPABASE_URL;

// Automatically use Supabase IPv4-compatible transaction pooler port 6543 for serverless environments (Vercel)
if (rawConnectionString.includes("supabase.co:5432")) {
  rawConnectionString = rawConnectionString.replace(":5432", ":6543");
}

const connectionString = rawConnectionString;

// Enable SSL for remote Supabase / cloud Postgres instances
const isRemote =
  connectionString.includes("supabase.co") ||
  connectionString.includes("neon.tech") ||
  process.env.NODE_ENV === "production";

declare global {
  var _postgresClient: ReturnType<typeof postgres> | undefined;
}

export function getPostgresClient() {
  if (!globalThis._postgresClient) {
    globalThis._postgresClient = postgres(connectionString, {
      prepare: false,
      max: process.env.NODE_ENV === "production" ? 1 : 10,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: isRemote ? { rejectUnauthorized: false } : false,
    });
  }
  return globalThis._postgresClient;
}

export function resetPostgresClient() {
  if (globalThis._postgresClient) {
    try {
      globalThis._postgresClient.end();
    } catch {}
    globalThis._postgresClient = undefined;
  }
}

export const db = drizzle(
  new Proxy({} as any, {
    get(_, prop: any) {
      const client = getPostgresClient() as any;
      const value = client[prop];
      return typeof value === "function" ? value.bind(client) : value;
    },
  }),
  { schema }
);


