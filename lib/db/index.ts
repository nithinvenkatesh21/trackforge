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

// Ensure Supabase connection uses IPv4-compatible transaction pooler port 6543 on Vercel
try {
  const url = new URL(rawConnectionString);
  if (url.hostname.includes("supabase.co") && (!url.port || url.port === "5432")) {
    url.port = "6543";
    rawConnectionString = url.toString();
  }
} catch (e) {
  if (rawConnectionString.includes("supabase.co:5432")) {
    rawConnectionString = rawConnectionString.replace(":5432", ":6543");
  }
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
      max: 5,
      idle_timeout: 30,
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

export async function withDbRetry<T>(operation: () => Promise<T>, maxRetries = 2): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (error: any) {
      attempt++;
      const msg = String(error?.message || "");
      const causeMsg = String(error?.cause?.message || error?.cause || "");
      const isConnError =
        msg.includes("Failed query") ||
        msg.includes("connection") ||
        msg.includes("socket") ||
        msg.includes("CLOSED") ||
        causeMsg.includes("ECONNRESET") ||
        causeMsg.includes("EPIPE") ||
        error?.code === "ECONNRESET" ||
        error?.code === "EPIPE" ||
        error?.code === "57P01";

      if (isConnError && attempt < maxRetries) {
        console.warn(`[db] Connection issue detected on query (attempt ${attempt}/${maxRetries}). Resetting Postgres client and retrying...`);
        resetPostgresClient();
        await new Promise((res) => setTimeout(res, 250 * attempt));
        continue;
      }
      throw error;
    }
  }
}



