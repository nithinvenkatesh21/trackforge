# Database & Supabase Connection Guidelines

## 1. Supabase Connection Strings on Serverless (Vercel)
- Direct Supabase hostnames (`db.<project-ref>.supabase.co`) are IPv6-only. On IPv4 serverless hosts (Vercel), Node.js DNS resolution will fail with `getaddrinfo ENOTFOUND`.
- Always connect using the Supabase IPv4 Pooler hostname: `aws-0-<region>.pooler.supabase.com:6543` with username format `postgres.<project-ref>`.
- In `lib/db/index.ts`, maintain auto-rewrite logic for any legacy `db.<ref>.supabase.co` URLs.

## 2. Serverless Connection Resilience
- Serverless postgres connections can drop when idle.
- Always wrap database query executions in `lib/auth.ts` and server actions with `withDbRetry` to handle transient socket disconnects automatically.
