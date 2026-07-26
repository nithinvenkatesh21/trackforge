# TrackForge — Next.js + Postgres Edition

TrackForge gives music creators (artists, producers, mixers, engineers) the same collaborative iteration loop software developers have with Git — applied to audio tracks and stem revisions.

---

## Technical Stack Overview

| Layer | Technology |
|---|---|
| Framework | **Next.js 15 (App Router)** |
| Database | **Postgres** (Supabase / Neon) |
| ORM | **Drizzle ORM** & `drizzle-kit` |
| Authentication | **Clerk** (`@clerk/nextjs`) |
| Storage | **Cloudflare R2** (`@aws-sdk/client-s3`) via Presigned URLs |
| Waveform & Audio | **wavesurfer.js** + `@wavesurfer/plugins` |
| Realtime | **Supabase Realtime** (Notifications, Presence & Chat) |
| Background Jobs | **Inngest** & **Replicate AI** (Demucs stem separation) |
| GitHub Sync | **Octokit** (`@octokit/rest`) |
| Styling | **Tailwind CSS v4** & OKLCH color system |

---

## Application Structure & Routing Map

```
app/
├── (marketing)/
│   └── page.tsx                          # Landing page
├── auth/
│   ├── sign-in/[[...sign-in]]/page.tsx
│   └── sign-up/[[...sign-up]]/page.tsx
├── (app)/                                 # Protected Route Group
│   ├── layout.tsx                         # Header, Notifications & Balance
│   ├── dashboard/page.tsx                # My Projects & Collaborating
│   ├── explore/page.tsx                  # Public Project Explorer
│   ├── projects/new/page.tsx             # New Project Initialization
│   ├── projects/[projectId]/
│   │   ├── layout.tsx                    # Project sticky header & tabs
│   │   ├── page.tsx                      # Versions Tree & Wavesurfer Player
│   │   ├── issues/page.tsx               # Issue Tickets Discussion
│   │   ├── collaborators/page.tsx        # Team Invites & Roles
│   │   ├── settings/page.tsx             # Project Settings & Deletion
│   │   └── activity/page.tsx             # Activity Log
│   ├── marketplace/
│   │   ├── page.tsx                      # Marketplace Asset Listings & FTS
│   │   ├── [assetId]/page.tsx            # Asset Detail & Credit Purchase
│   │   └── upload/page.tsx               # List Audio Asset
│   ├── service-requests/
│   │   ├── page.tsx                      # Gigs Board
│   │   └── [requestId]/page.tsx          # Gig Proposals & Escrow Release
│   ├── profile/[userId]/page.tsx         # User Profile & Credit Top-up
│   └── integrations/page.tsx             # GitHub Synchronization
├── share/v/[versionId]/
│   ├── page.tsx                          # Public Share Link
│   └── opengraph-image.tsx               # Dynamic OG Image Generator
├── api/
│   ├── webhooks/clerk/route.ts
│   ├── webhooks/replicate/route.ts
│   ├── uploads/presign/route.ts
│   └── inngest/route.ts
├── not-found.tsx
├── error.tsx
└── layout.tsx
```

---

## Environment Variables

Copy `.env.example` to `.env.local` and populate:

```env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/trackforge
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=trackforge-storage
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
REPLICATE_API_TOKEN=r8_...
REPLICATE_WEBHOOK_SECRET=whsec_...
GITHUB_TOKEN=ghp_...
GH_OWNER=trackforge
GH_REPO=trackforge-artifacts
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...
```

---

## Getting Started Locally

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Sync Database Schema with Drizzle:
   ```bash
   pnpm db:push
   ```

3. Run Development Server:
   ```bash
   pnpm dev
   ```

4. Run Inngest Dev Server (for background stem separation jobs):
   ```bash
   npx inngest-cli dev
   ```
