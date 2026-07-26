TrackForge — Build Specification (Next.js + Postgres Edition)

You are building **TrackForge**, a music collaboration platform with version control for audio projects, AI stem separation, a marketplace for audio assets, service requests (hire-a-mixer/master, etc.), GitHub-style issue tickets, and an in-app credit economy.

Use this document as your single source of truth. If anything is ambiguous, follow the conventions and constraints below rather than asking — only stop to ask when a fact genuinely blocks implementation.

*This is a full rewrite of the original Convex/Vite spec against a Postgres + Next.js stack. Same product, same business logic — different, more conventional foundations. Where the new stack actually changes what's possible (real joins, real search, server-rendered share links, durable background jobs), I've leaned into it rather than just doing a mechanical find-and-replace. New capabilities beyond the original scope are called out with 💡 as I go, and gathered again in §9.*

---

## 1. Project Overview

### 1.1 Purpose
TrackForge gives music creators (artists, producers, mixers, engineers) the same collaborative iteration loop software developers have with Git — applied to audio tracks. A creator opens a **Project** for a song, invites collaborators, and uploads **Versions** over time. Every version can be uniquely attributed to an uploader, forked like a Git branch from any prior version, and commented on with **timestamped** feedback anchored to a specific second of the audio, shown against a real waveform rather than a flat bar. Collaborators leave **Issues** (feedback tickets) on specific versions or timestamps. TrackForge also provides a **Marketplace** where creators list audio assets (loops, acapellas, drum kits, presets, MIDI packs, sound FX, bundles) priced in in-app **Credits**, and a **Service Requests** board where users post gigs (mix / master / vocal feature / instrumental add-on) that other professionals apply to.

### 1.2 Problem It Solves
Today, music collaboration is split across Google Drive folders, WeTransfer links, WhatsApp voice notes, Discord calls, and Fiverr gig posts. There is no canonical record of:
- Which iteration of a track someone is reviewing
- Who changed what, when, and why between versions
- Where in the audio (timestamp) a specific piece of feedback applies
- Who was paid for what service and when milestones are released
- A single marketplace where audio assets can be priced, reviewed, and paid for in a unified currency

TrackForge makes the iteration deterministic (every version is committed and attributed), feedback precise (anchored to audio time), and the commercial layer auditable (credits + milestones + transaction logs). Because pages are server-rendered, a shared version link now actually replaces "here's a WeTransfer link" the way it's meant to — it unfurls with a waveform preview in Discord/Slack/iMessage instead of being a dead URL.

### 1.3 Target Users
- **Artists** — vocalists, songwriters; the mood-and-vibe layer of a project.
- **Producers** — own the project, manage versions and collaborators.
- **Mixers** — receive versions, mix and master, deliver stems.
- **Engineers** — handle technical FX, restoration work; they may also act as producers.
- **Buyers / Asset customers** — purchase loops, presets, drum kits in the marketplace; may not post projects themselves.

A user simultaneously holds a profile, credits, projects, and a marketplace inventory. Roles are not mutually exclusive — `creatorRoles` is a `text[]` column on the `users` row.

> **Note on the two role systems** — TrackForge has two enums that share some labels but mean different things, so name them distinctly in code and as distinct Postgres enum types:
> - **`creator_role`** (`artist | producer | mixer | engineer`) — a musical discipline. Used for `users.creator_roles[]`, `projects.needed_roles[]`, and collab invites.
> - **`project_role`** (`owner | producer | engineer | mixer | artist | viewer`) — a *permission level* scoped to one project, stored in `project_collaborator_roles.role`. See §2.7 for why this had to become its own fully-specified enum rather than a re-use of `creator_role`.

### 1.4 Success Criteria
A built application satisfies all of the following:

1. **End-to-end project flow works**: a signed-in user can create a project, upload a version (audio or ZIP bundle), fork a previous version, leave a timestamped comment, file an issue tied to a version, invite a collaborator with a creator role, and see the new collaborator receive a realtime notification — with no manual steps beyond UI clicks.
2. **Branching is visualized**: the version history renders as a tree (parent/child) with the latest versions on top, expandable nodes, fork edges, and bundle badges.
3. **Audio playback is timestamped against a real waveform**: server-computed peak data renders an actual waveform (via wavesurfer.js), clicking anywhere seeks, commenting at that timestamp drops a marker on the waveform, and clicking the marker seeks back and resumes playback.
4. **Marketplace purchase flow works**: a seller lists an asset with a cover and preview, a buyer purchases using credits, the buyer's balance decrements and the seller's increments inside one DB transaction, and an immutable transaction record is written for both parties.
5. **Service requests lifecycle works end-to-end**: a poster creates a request, applicants apply with proposal + price, the poster accepts one (others auto-rejected), a milestone is created, the poster releases it (credits move), and both sides can mark it completed.
6. **Auth, authorization, and credit overdraft are enforced**: every Server Action rejects unauthenticated, unauthorized, and insufficient-balance requests server-side; UI surfaces those failures via toasts.
7. **Stem separation works as a durable background job**: a user with `REPLICATE_API_TOKEN` configured can trigger Demucs on a version; the job runs via Inngest, Replicate calls back via webhook, and 4 stems (vocals / drums / bass / other) land as `project_files` rows visible in that version's file list without a page refresh.
8. **GitHub sync works**: with `GITHUB_TOKEN` configured, a user can list the repo, view a file tree, fetch a file, push (≤25 files) one or more text files, and delete a file — all through the GitHub REST API via Octokit.
9. **A public share link works**: `/share/v/[versionId]` renders a read-only, unauthenticated, server-rendered page for a single version with a dynamically generated Open Graph image, so pasting the link into Discord/Slack/iMessage shows a real preview.
10. **The app builds and typechecks**: `next build` succeeds, no `tsc` errors, `drizzle-kit` migrations apply cleanly against a fresh database, no console errors at runtime on every key page.

---

## 2. Functional Requirements

### 2.1 Authentication & Users
- **Sign in / sign up** through Clerk's hosted or embedded components at `/auth/sign-in` and `/auth/sign-up` (Next.js catch-all routes: `app/auth/sign-in/[[...sign-in]]/page.tsx`). Clerk is the sole user-facing auth system — there's no parallel email-OTP flow to reason about here, unlike some boilerplates; keep it that way.
- A Clerk webhook (`user.created`, `user.updated`, `user.deleted`) hits `app/api/webhooks/clerk/route.ts`, verified with `svix`, and upserts the corresponding `users` row keyed on `clerk_id`. A `getCurrentUser()` server helper (usable in Server Components, Server Actions, and Route Handlers) wraps Clerk's `auth()` and looks up the matching Postgres row, returning `null` if unauthenticated.
- The `users` table carries: `name`, `image_url`, `email`, `email_verified_at`, `is_anonymous`, `role` (`admin|user|member`), plus TrackForge-specific: `bio`, `creator_roles` (`creator_role[]`), `genres` (`text[]`), `daw`, `looking_for` (`creator_role[]`), `rating`, `total_ratings`.
- `role = 'admin'` gates two operations: `userCredits.addCredits` (admin top-ups) and toggling `marketplace_assets.featured`. Enforce this in the Server Action, not just in the UI. No dedicated admin UI is required for MVP — a Drizzle Studio session or a raw SQL console covers it for now; document that in the README.
- Profile editing is a Server Action (`updateProfile`) that patches the `users` row for the current user only.
- User search supports name/email lookup. Use Postgres `ILIKE` with a trigram index (`pg_trgm`) for fast fuzzy substring matching rather than a full table scan — meaningfully better than the naive substring filter this replaces, and it's free (no external search service). Returns `{ id, name, image_url, creator_roles }`.
- `users.is_anonymous` is respected everywhere: anonymous/guest sessions (if you ever wire one up) cannot post, purchase, or view private data — reserved for a possible future "try before you sign up" flow, not built in MVP.

### 2.2 Projects
A project is a workspace for one song.

**Fields**: `title`, `description`, `genre`, `bpm?`, `key?`, `creator_id`, `visibility` (`public|private`), `status` (`open|in_progress|final`), `needed_roles` (`creator_role[]`), `cover_art_key?` (R2 object key), `default_cover_index?`. `collaborators` is **not** a denormalized array column here — it's the `project_collaborators` join table (see §2.7), which is the more relational, more correct shape now that we have real joins. The project creator gets a row in that join table at creation time with `project_role = 'owner'`.

**Workflows** (all as Server Actions in `lib/actions/projects.ts`):
- **Create**: signed-in user supplies title/description/genre/bpm/key/visibility/needed_roles. A `project_collaborators` row is inserted for the creator with `role = 'owner'` in the same transaction. Default status `open`. If `visibility = 'public'`, it's eligible for `listPublic` and, via ISR, for the public Explore page.
- **Update**: only the creator (or a collaborator with `project_role = 'owner'`) may patch. Patchable: title, description, status, needed_roles, default_cover_index. Fires notification `project_updated` to all other collaborators.
- **Delete**: only the owner. In Postgres this is genuinely simpler than the original hand-rolled cascade: `versions`, `project_files`, `comments`, `issues`, `issue_replies`, `collab_requests`, `project_collaborator_roles`, `project_collaborators`, `messages`, `ratings`, `notifications`, and `version_waveforms` are all declared `ON DELETE CASCADE` against `projects.id`, so a single `DELETE FROM projects WHERE id = ...` removes everything correctly, and there's no list of tables to remember to update by hand as the schema grows. This is one of the clearer wins of moving off an app-level cascade.
- **List (mine)**: projects where the current user has an `owner` row in `project_collaborators`. Returned with `version_count` via a `COUNT(*)` subquery/join, computed in one SQL statement instead of N+1 application code.
- **List (collaborating)**: projects where the current user is in `project_collaborators` with any non-`owner` role. Sorted by `created_at desc`.

### 2.3 Versions (the Git-for-audio tree)
This is the core domain object.

**Fields**: `project_id`, `parent_version_id?` (null iff root), `file_key?` (R2 object key), `file_name`, `file_size?`, `uploader_id`, `notes`, `version_number` (assigned inside the same transaction as insert, via `SELECT COUNT(*) ... FOR UPDATE` or a per-project sequence — avoid a race where two simultaneous uploads both compute the same next number), `is_bundle?` (true if uploaded as a multi-file DAW export), `is_pinned_release?` (default false — see the version-pinning feature below).

**Workflows**:
- **Create**: current user must be a collaborator. `version_number` auto-assigned per project. Fires `version_uploaded` to every other collaborator. Enqueues a waveform-generation background job (below) so peak data is ready by the time anyone opens the player.
- **Fork**: creates a new version with `parent_version_id = source.id`, reuses `file_key` (files aren't duplicated in storage, just referenced), names the file `<source.fileName> (forked)`, prepends notes with `Forked from Version N: …`, increments `version_number`.
- **List by project with comments**: one query (via Drizzle's relational query API) returns versions with `uploader`, a resolved playback URL, `comments[]` (sorted asc), `comment_count`, `project_files[]`, `file_count`, and waveform peaks. `project_files[]` and `file_count` are returned whenever the version has associated files — **not gated behind `is_bundle`**. `is_bundle` only drives the "Bundle" UI badge (this was a real bug in the original Convex draft, where gating file visibility on `is_bundle` silently hid AI-generated stems attached to plain, non-bundle versions).
- **Get single version**: version + playback URL + waveform peaks + uploader info including `creator_roles`.
- Versions are immutable once created — no `delete` action exists for a single version, mirroring Git's append-only commit history. The only way a version disappears is whole-project deletion.
- **💡 Version pinning (promoted to core)**: the project owner can call `pinRelease(versionId)` to set `is_pinned_release = true` on one version and `false` on any previously pinned version in the same project (enforced with a partial unique index: `CREATE UNIQUE INDEX ON versions (project_id) WHERE is_pinned_release`). The pinned version renders with a star badge at the top of the tree and is what a public share link defaults to if no specific version is requested.

**Tree rendering contract** (frontend):
- Roots are versions with no `parent_version_id`. Children are versions whose `parent_version_id === parent.id`.
- Display order: roots and children sorted by `version_number desc` (latest first).
- Each node shows `v<number>`, uploader name + avatar, creation timestamp, truncated notes, branch-count badge (`{n} branches`), a `Bundle` badge if `is_bundle`, and a star if `is_pinned_release`.
- Edges drawn between parent and child nodes. Forks use a different color (cyan) vs mainline (teal).
- `Expand All` / `Collapse All` controls expand/collapse node bodies.
- Empty state: "No versions yet" with primary CTA "Upload First Version" visible only to collaborators.

> **💡 Enhancement idea — Audio Diff Mode (post-MVP, see §9):** pick any two versions and get a synced A/B player plus a waveform-amplitude overlay showing where they diverge — the audio equivalent of `git diff`. Kept out of MVP scope deliberately.

### 2.4 Project Files (bundles & generated assets)
Individual files inside a version — whether from a multi-file DAW bundle upload or from AI stem separation — live here.

**Fields**: `version_id`, `file_name`, `file_path`, `file_type` (`project|audio|midi|preset|other`), `file_key?` (R2 object key), `file_size?`.

A version with files displays its file tree via the `FileTreeView` component: hierarchical rendering of paths grouped by type, with download buttons resolving short-lived presigned R2 GET URLs on click (not baked into the page — see §3.8).

### 2.5 Audio Playback + Timestamp Comments
The `AudioPlayerWithComments` client component wraps **wavesurfer.js**, not a bare `<audio>` element with a custom bar. This is a real upgrade over the original spec, which never called for actual waveform rendering despite being an audio product — a flat progress bar was doing a lot of the UX's heavy lifting for no good reason.

**`comments` fields**: `version_id`, `project_id`, `author_id`, `content`, `parent_comment_id?`, `timestamp_seconds?`. Threaded replies nest one level deep, matching `issue_replies`.

**Waveform generation**: on version upload, a background job (Inngest function `generateWaveform`) downloads the audio, computes peak data (e.g. via `audiowaveform` or a small ffmpeg-based decode step), and writes a row to `version_waveforms` (`version_id`, `peaks jsonb`, `duration_seconds`, `sample_rate`). The player fetches this instead of decoding the full audio file client-side — faster first paint, works the same on mobile data connections.

**Behavior**:
- Click anywhere on the waveform → seek to that position.
- "Comment at MM:SS" → opens a comment form pre-tagged with `timestamp_seconds = currentTime`.
- Each timestamp comment renders as a **region marker directly on the waveform** (wavesurfer's regions plugin) rather than a plain vertical line; clicking it seeks and resumes playback.
- General comments (no timestamp) render in a separate list below.
- Same form posts both kinds of comments.
- Posting a comment fires `comment_added` to the version's uploader and any other participants already in that thread, delivered over the project's Supabase Realtime channel so it appears live without a refresh.

**Playback analytics** — now genuinely simpler than before, since this is exactly what SQL aggregation is for:
- `recordPlayback({ versionId, timestampSeconds?, durationSeconds?, completed })` called at intervals (`timeupdate` + on `ended`), written via a lightweight Server Action.
- `getAudioAnalytics({ versionId })` is one SQL query with a few `GROUP BY`s and window functions instead of hand-rolled JS aggregation: `total_plays`, `unique_listeners`, `avg_listen_duration`, `completion_rate`, `top_listeners` (top 5 by play count), `most_replayed_sections` (10-second buckets via `width_bucket`).

> **💡 Enhancement idea:** render `most_replayed_sections` as a subtle heatmap directly under the waveform instead of only in a separate analytics tab — the data's already computed server-side, so this is a cheap, high-value addition once the waveform component exists anyway.

> **💡 Enhancement idea — presence (promoted to core, see §2.19):** show small avatars of who else currently has this version's player open, via Supabase Realtime presence. Genuinely cheap given Realtime is already in the stack for notifications.

### 2.6 Issues (feedback tickets)
Issues are project-level feedback that may or may not be tied to a specific version/timestamp.

**Fields**: `project_id`, `creator_id`, `title`, `description`, `status` (`open|in_progress|resolved|closed`), `tags` (`text[]`), `version_id?`, `timestamp_seconds?`.

**Workflows**:
- Create requires the user to be a project collaborator. Fires `issue_created` to all other collaborators.
- Status filter tabs (All / Open / In Progress / Resolved).
- Threaded replies via `issue_replies` with `parent_reply_id`, nesting one level deep.
- Status updates only by collaborators; fires `issue_updated` to all collaborators except the updater.
- Card UI: title, status icon (color-coded), creator, date, tag chips, reply count, expandable body with a status selector for collaborators.

### 2.7 Collaboration: Invites & Roles
Two related but distinct concepts:

1. **`project_collaborators`** — flat membership join table (`project_id`, `user_id`), replacing the original's denormalized array column now that we have real joins. This is what "is this person even on the project" checks query.
2. **`project_collaborator_roles`** — the `project_role` permission level per collaborator (see §1.3): `owner | producer | engineer | mixer | artist | viewer`, a real Postgres enum, not a free-form string.

**Permission flags by `project_role`**:

| Role | Upload | Manage settings | Invite / remove collaborators | Transfer ownership |
|---|---|---|---|---|
| `owner` | ✅ | ✅ | ✅ | ✅ |
| `producer` | ✅ | – | ✅ | – |
| `engineer` | ✅ | – | – | – |
| `mixer` | ✅ | – | – | – |
| `artist` | ✅ (their own takes) | – | – | – |
| `viewer` | – | – | – | – |

This table exists because inviting someone with a `creator_role` of `artist` or `engineer` and then trying to store that directly as their `project_role` would fail if the permission enum only had `owner|producer|mixer|viewer` (as originally scoped) — `artist` and `engineer` had nowhere valid to land. Expanding `project_role` to mirror all four `creator_role` values (plus `owner`/`viewer`) keeps "what you were invited to do" and "what you're permitted to click" in sync by construction.

**Workflows**:
- **Invite**: search user by name/email, pick a `creator_role`, optional message → inserts a `collab_requests` row (`from_user_id` = inviter, `to_user_id` = invitee, `status = 'pending'`). Fires `collab_request` to the invitee.
- **Accept** (invitee side): adds **the accepting user themself** to `project_collaborators` — worth stating explicitly, since it's an easy off-by-one-person mistake to write it the other way around (adding the inviter, who's typically already the owner and thus already a member). Deletes the request, inserts a `project_collaborator_roles` row with the matched `creator_role` value. Fires `collab_accepted` to the inviter.
- **Reject**: request moves to `status = 'rejected'`.
- **List received**: all invites where `to_user_id === me`.
- **Change collaborator role**: owner-only.
- **Transfer ownership**: owner transfers to another collaborator; owner becomes `producer`.
- **Remove collaborator**: owner removes; cascades (DB-level `ON DELETE CASCADE`) the role row.

### 2.8 Marketplace (assets, purchases, reviews, collections)
**Asset fields**: `creator_id`, `title`, `description`, `type` (`loop|acapella|drumkit|preset|midi_pack|sound_fx|bundle`), `genre`, `bpm?`, `key?`, `price`, `license_type` (free text — deliberately not an enum, since license terms are genuinely arbitrary), `file_key`, `preview_key?`, `cover_image_key?`, `tags` (`text[]`), `downloads`, `rating`, `review_count`, `featured` (admin-curated), plus a generated `search_vector tsvector` column combining title + description + tags for full-text search.

*(The original field list also carried `download_count` and `rating_count` alongside `downloads` and `review_count` — redundant given the workflows below: every purchase increments exactly one counter, and every review always carries a rating, so a separate rating count can never diverge from review count. Collapsed to one field each.)*

**Workflows**:
- **Create**: seller uploads via presigned R2 URLs (file + optional preview + optional cover), supplies metadata. Counters start at `0`, `featured = false`.
- **Update / Remove**: only the asset's `creator_id`.
- **List with filters**: `type` (indexed), genre, price range, license type, and **full-text search** against `search_vector` (with `pg_trgm` similarity as a fallback for typo tolerance) — a real upgrade over a naive substring scan, still without adding an external search service.
- **Featured** carousel: top 6 where `featured = true`.
- **Detail page**: file + preview URLs, creator info, reviews, purchase CTA.
- **Purchase**: single Postgres transaction — checks `user_credits.balance >= asset.price`, checks non-ownership (enforced by a `UNIQUE (user_id, asset_id)` constraint on `marketplace_purchases`, not just an app-level check — a genuine defense-in-depth win over relying on an "atomic check" in application code), deducts buyer / credits seller, inserts the purchase row, increments `downloads`, writes two `credit_transactions` rows. Fires `asset_sold` to the seller.
- **Review**: only after purchase, one review per (reviewer, asset) — also DB-enforced via a unique constraint. Updates the running average.
- **Collections**: user-created named groups of asset IDs, public or private. `create`, `addAsset`, `removeAsset`, `setPublic`, `remove`, `listMine`, `listPublic`, owner-only mutation, public collections readable by anyone.

### 2.9 Credits
The in-app currency.

**Account (`user_credits`)**: `user_id`, `balance`, `total_earned`, `total_spent`. Defaults to a `0`-balance row rather than failing when missing.

**Transactions (`credit_transactions`)**: `user_id`, `amount`, `type` (`earned|spent|refund`), `related_id?` (a purchase, request, or milestone), `description`, `created_at`. **This table is designed as an append-only, event-sourced ledger from day one** — balances are a derived sum, not the source of truth — specifically so that if/when real-money payouts (Stripe Connect, see §9) get added later, the ledger doesn't need a redesign, just a new transaction type and a reconciliation job.

**Operations** (`lib/actions/credits.ts`):
- `getBalance(userId)` — always returns a row (defaulted if missing).
- `getTransactions(userId, limit?)` — ordered desc, default 50.
- `addCredits(userId, amount, description)` — admin-only.
- `deductCredits(userId, amount, description)` — throws if balance insufficient.

Both the marketplace `purchase` action and the milestone `release` action route through these same two functions rather than re-implementing balance math inline.

### 2.10 Service Requests (hire-a-mixer/post-a-gig)
**Request fields**: `project_id?`, `creator_id`, `type` (`mix|master|vocal_feature|instrumental_addon`), `title`, `description`, `budget_min`, `budget_max`, `deadline`, `status` (`open|in_progress|completed|cancelled`), `accepted_application_id?`.

**Application fields**: `request_id`, `applicant_id`, `proposal`, `proposed_price`, `status` (`pending|accepted|rejected|completed`).

**Milestone fields**: `request_id`, `application_id`, `applicant_id`, `amount`, `status` (`pending|released|completed`), `release_date?`.

**Workflows**:
- **Post request**: any signed-in user; if `project_id` is set, only that project's owner may post.
- **Apply**: allowed if `request.status === 'open'` and applicant ≠ creator. Fires `application_received` to the poster.
- **Accept**: one application → `accepted` (fires `application_accepted`); siblings → `rejected` (fires `application_rejected` to each); request → `in_progress`; inserts a `milestones` row in `pending`.
- **Reject**: explicit single-application reject.
- **Milestone lifecycle**:
  - `pending → released`: poster calls `milestones.release`, which routes through `deductCredits`(poster)/`addCredits`(applicant), both `credit_transactions` rows tagged `related_id = milestone.id`. Fires `milestone_released` to the applicant.
  - `released → completed`: poster marks the deliverable accepted (or, optionally, both sides confirm independently — cheap dispute protection since funds already moved at `released`). Also flips the parent `service_request.status = 'completed'` if this was its only/last milestone. Fires `milestone_completed` to both parties and prompts each to rate the other (§2.15).
- **Update status / cancel**: poster may transition request states.
- **Browse open**: `/explore?tab=service-requests`, server-rendered, showing open requests with applicant count.

### 2.11 Notifications
A flat, single stream — but now delivered live.

**Types**: `version_uploaded`, `comment_added`, `collab_request`, `collab_accepted`, `issue_created`, `issue_updated`, `project_updated`, `application_received`, `application_accepted`, `application_rejected`, `milestone_released`, `milestone_completed`, `asset_sold`.

**Fields**: `user_id`, `type`, `title`, `message`, `project_id?`, `version_id?`, `comment_id?`, `issue_id?`, `from_user_id?`, `read`.

**Behavior**: inserted directly by the triggering Server Action inside the same transaction where possible (e.g., accepting a collab request and inserting its notification happen together, so you never end up with one without the other). Supabase Realtime is subscribed to the `notifications` table filtered to `user_id = current user`, so `NotificationsDropdown` updates live without polling. Unread badge, mark-one, mark-all-read.

### 2.12 GitHub Integration (developer / studio use case)
Push tracks-and-metadata-as-JSON (or any text artifacts) to a GitHub repo for version-controlled history outside TrackForge.

**Single fixed repo per installation**: `GH_OWNER` and `GH_REPO` are Vercel/server environment variables, never client-supplied — same rationale as before (prevents an authenticated client from repointing the integration), now just a standard env var instead of a platform-specific "hardcoded constant" workaround. Default branch `main`.

**Implementation**: `lib/github.ts` wraps `@octokit/rest`, called from Server Actions (`getRepoInfo`, `listRepoContents`, `getFileContents`, `pushFilesToRepo`, `deleteFileFromRepo`) — no need for a special `"use node"` file convention; any Server Action already runs in a Node.js server environment. `pushFilesToRepo` still caps at 25 files per push, updating existing blobs by SHA rather than erroring 422.

### 2.13 Stem Separation (AI via Replicate)
This is the one piece of the app that's a genuinely better architectural fit for background jobs than for a request/response action, and the rewrite reflects that:

1. User triggers `separateAudioStems({ versionId })` — a Server Action that enqueues an Inngest event (`stems/requested`) and returns immediately (no blocking on a slow serverless function).
2. The Inngest function `separateStems` (in `lib/jobs/stems.ts`) calls the Replicate API with a **webhook URL** (`app/api/webhooks/replicate/route.ts`) rather than polling — Replicate lets you register a callback, so the job doesn't need to hold a connection open or poll on an interval.
3. When Replicate finishes, its webhook (signature-verified) resumes the Inngest step, which downloads the 4 stems, uploads each to R2, and inserts 4 `project_files` rows (type `audio`) attached to the source version.
4. A `stems_ready` notification fires and, via Supabase Realtime, the file list updates live in the UI — no page refresh needed to see the new stems appear.

This gets automatic retries, step-level observability in the Inngest dashboard, and no risk of a stuck "generating…" spinner if a serverless function times out mid-poll — all things the original single-action design didn't get for free.

**Naming pattern**: optional, validated by `validateNamingPattern`. Required token: `{stemtype}`. Optional: `{trackname}`, `{version}`. Reject unknown tokens.

> **💡 Enhancement idea — stem-level merging (post-MVP, §9):** combine the vocal stem from one fork with the instrumental stems from another into a new version.

### 2.14 Integrations Page
`/integrations` (server-rendered shell, client components for interactivity):
- Repo info card via `getRepoInfo`.
- File tree browser via `listRepoContents`.
- File viewer via `getFileContents` — a plain read-only text/code view is enough for MVP; no diff library needed unless you specifically want side-by-side diffing later.
- Commit composer (`pushFilesToRepo`): commit message + up to 25 path/content pairs.
- Delete-file form: path + commit message + SHA.
- GitHub API errors surface as toasts with the actual GitHub error message.

### 2.15 Ratings (across collaborators)
`ratings`: `from_user_id`, `to_user_id`, `project_id?`, `service_request_id?`, `stars`, `comment?`. Both context fields are optional (at least one should be present) — a rating originating from a completed milestone often has no associated project, since `service_requests.project_id` is itself optional.

After each new rating, recompute the recipient's `users.rating` and `users.total_ratings` as a running average (a small trigger or the same transaction as the insert — either is fine, just keep it atomic with the insert).

### 2.16 Messages (project chat)
`messages`: `project_id`, `sender_id`, `content`. Delivered live via Supabase Realtime subscribed to the project's channel — this maps almost one-to-one onto what Realtime is built for. Lightweight; defer if MVP time-pressured.

### 2.17 Edge Cases & Error Handling (apply app-wide)
- Unauthenticated Server Action → throw `"Not authenticated"`. UI catches and shows a re-auth toast.
- Forbidden action → throw a specific error; frontend toasts `Failed to X`.
- Credit overdraft → `"Insufficient credits"`, both app-checked and structurally impossible to overspend given the transaction wraps the balance check and the debit together.
- Duplicate purchase → DB-level unique constraint violation, caught and surfaced as `"Already purchased"`. UI also disables the button proactively.
- File too large → reject client-side before upload, using the per-type caps in §3.9 (audio ≤ 50 MB, bundles/marketplace assets ≤ 200 MB) — not one flat number.
- Fork of a version whose R2 object no longer exists → `"Version not found"` (surfaced from a failed presigned-URL resolution).
- Replicate job failure → Inngest surfaces the error in its dashboard; the app shows "Stem separation failed" plus retry, which re-enqueues the same event.
- GitHub API 401 → "GitHub token invalid; rotate `GITHUB_TOKEN` in your environment variables."
- Database unreachable → a root `error.tsx` boundary with a friendly retry, rather than an unstyled crash.
- Empty states everywhere — see §4.

### 2.18 Validation
Zod schemas live in `lib/schemas/*.ts` and are imported by **both** the client form (via `@hookform/resolvers/zod`) and the Server Action that ultimately writes the row — one source of truth instead of the client/server rule duplication the original Convex draft implied.
- String lengths (titles 3-100, descriptions ≤2000, comments ≤2000).
- Numeric ranges (bpm 20-300, price ≥0, ratings 1-5).
- Enum membership mirrors the Postgres enum types exactly.
- File extensions — audio: `mp3|wav|aiff|flac|ogg|m4a`; bundles: `zip|flp|als|logicx|ptx|cpr|rpp|song|aup` (broadened from a 4-extension list to also cover Pro Tools, Cubase, Reaper, Studio One, and Audacity — producers use more than four DAWs).
- Tag arrays ≤10.

### 2.19 Real-time Presence 💡 *(new — promoted to core)*
Using Supabase Realtime's presence channels (no extra infrastructure — same connection already open for notifications/chat), show:
- Small stacked avatars on a project page for who else currently has it open.
- A subtle "listening now" indicator on a version's player.

This is cheap specifically because Realtime is already wired in for notifications and messages — it's a few more lines on an existing channel, not a new subsystem.

### 2.20 Public Share Links & Rich Previews 💡 *(new — promoted to core)*
`app/share/v/[versionId]/page.tsx` — a public, unauthenticated, server-rendered route:
- Read-only waveform player for that one version (no comments, no edit controls), gated to only work if the parent project is `public` or the version was explicitly marked shareable.
- `generateMetadata()` sets Open Graph tags; `app/share/v/[versionId]/opengraph-image.tsx` uses `next/og` to render a dynamic preview image (waveform snippet + track title + uploader) server-side at request time.
- This directly answers the "replace WeTransfer/Drive links" problem from §1.2, and it's specifically a Next.js-shaped win — a client-only SPA can't produce a real link preview, since there's nothing for a link-unfurling bot to render before JS loads.

---

## 3. Technical Requirements

### 3.1 Architecture
- **Frontend + Backend**: Next.js 15 (App Router), Server Components for data fetching, **Server Actions** for all mutations, Route Handlers reserved for webhooks (Clerk, Replicate) and R2 presigned-URL issuance.
- **Database**: Postgres via **Supabase** (bundles Postgres + Realtime, which this app leans on heavily for notifications/chat/presence — reimplementing that on a bare Postgres box would be more moving parts for no benefit). **Neon** is an equally valid alternative if you'd rather pair branch-per-PR preview databases with Vercel preview deployments and don't need built-in realtime — in that case, pair it with Pusher or Ably instead. Pick one; don't mix.
- **ORM**: **Drizzle** — schema-as-code, SQL-shaped migrations, and a relational query API that makes the "version + uploader + comments + files + counts" fan-out queries (painful to hand-write in Convex) a single readable call.
- **Auth**: Clerk, via `@clerk/nextjs`, `clerkMiddleware()` in `middleware.ts`.
- **Storage**: **Cloudflare R2** (S3-compatible API, zero egress fees — matters a lot for an app where people repeatedly stream 50–200 MB audio files).
- **Realtime**: Supabase Realtime (Postgres change-data-capture over websockets) for notifications, chat, and presence.
- **Background jobs**: **Inngest** for stem separation orchestration and any future scheduled/retryable work (milestone reminders, etc.) — durable functions with built-in retries and step-level observability, which fits Vercel's serverless model better than a long-running worker process would.
- **AI**: Replicate, Demucs `htdemucs`, invoked with a webhook callback (not polling).
- **GitHub**: `@octokit/rest`.
- **Search**: Postgres full-text search (`tsvector` + `pg_trgm`) — no external search service for MVP scale.
- **Rate limiting**: Upstash Redis + `@upstash/ratelimit` on GitHub-proxying and job-triggering endpoints.
- **Payments (future, not MVP)**: Stripe Connect, sitting on top of the append-only credits ledger (§2.9).

### 3.2 Tech Stack (exact versions non-binding, should roughly match)
- Next.js 15 (App Router), React 19, TypeScript 5.8+ (strict mode)
- Tailwind v4 (no `tailwind.config.ts`; theme tokens in `app/globals.css` via `@theme`, OKLCH colors) — unchanged from the original, framework-agnostic
- Shadcn UI primitives (Radix UI), Lucide React (icons), Framer Motion (animation)
- **wavesurfer.js** — waveform rendering + regions plugin for comment markers (new)
- Three.js + `@react-three/fiber` + `@react-three/drei` — landing page only, dynamically imported client component (`next/dynamic`, `{ ssr: false }`) since it's browser-only; a deliberate exception to "keep dependencies lean," same as before
- Drizzle ORM + `drizzle-kit` (migrations), `postgres` or `@supabase/supabase-js` as the driver
- `@clerk/nextjs`
- `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (R2 is S3-compatible)
- `inngest` (background jobs)
- `replicate` SDK (only inside `lib/jobs/stems.ts`)
- `@octokit/rest`
- `@supabase/supabase-js` (Realtime client)
- `@upstash/ratelimit` + `@upstash/redis`
- `sonner` (toasts)
- `zod` + `@hookform/resolvers` + `react-hook-form`
- `@tanstack/react-query` — for client-side caching around realtime-driven data (notifications, chat, presence, marketplace filters) layered on top of Server Component initial data; **not** a replacement for Server Actions as the mutation path
- `class-variance-authority`, `clsx`, `tailwind-merge`
- `react-day-picker`, `vaul`, `cmdk`, `input-otp`, `embla-carousel-react`, `recharts`, `date-fns`, `next-themes`
- Package manager: **pnpm** (Next.js ecosystem default; corepack-pinned)

### 3.3 Database Design

> Schema source of truth: `lib/db/schema.ts` (Drizzle). Migrations generated with `drizzle-kit generate`, applied with `drizzle-kit migrate` in CI/prod, `drizzle-kit push` for fast local iteration. Every enum is a native Postgres `enum` type. Every FK that should cascade-delete with its parent is declared `ON DELETE CASCADE` at the schema level — don't reimplement cascades in application code where the database can do it correctly and atomically.

**Tables** (22 from the original scope, plus one new one for waveforms):
1. `users`
2. `notifications` — indexes: `(user_id)`, `(user_id, read)`
3. `projects` — indexes: `(creator_id)`, `(status)`, `(visibility)`, `(genre)`, GIN index on `needed_roles`
4. `versions` — indexes: `(project_id)`, `(uploader_id)`, `(parent_version_id)`; partial unique index on `(project_id) WHERE is_pinned_release`
5. `version_waveforms` — `version_id` (unique FK), `peaks jsonb`, `duration_seconds`, `sample_rate` *(new table — supports the waveform rendering feature in §2.5)*
6. `project_files` — index: `(version_id)`
7. `comments` — indexes: `(version_id)`, `(project_id)`, `(author_id)`
8. `collab_requests` — indexes: `(project_id)`, `(from_user_id)`, `(to_user_id)`, `(status)`
9. `ratings` — indexes: `(from_user_id)`, `(to_user_id)`, `(project_id)`, `(service_request_id)`
10. `messages` — indexes: `(project_id)`, `(sender_id)`
11. `service_requests` — indexes: `(project_id)`, `(creator_id)`, `(status)`
12. `service_applications` — indexes: `(request_id)`, `(applicant_id)`, `(status)`
13. `milestones` — indexes: `(request_id)`, `(application_id)`, `(applicant_id)`
14. `user_credits` — unique index: `(user_id)`
15. `credit_transactions` — index: `(user_id)`
16. `issues` — indexes: `(project_id)`, `(creator_id)`, `(status)`
17. `issue_replies` — indexes: `(issue_id)`, `(author_id)`
18. `project_collaborators` — unique index: `(project_id, user_id)`
19. `project_collaborator_roles` — unique index: `(project_id, user_id)`
20. `marketplace_assets` — indexes: `(creator_id)`, `(type)`, `(genre)`, `(featured)`, GIN index on `search_vector`
21. `marketplace_purchases` — unique index: `(user_id, asset_id)` — this is the source of truth for "already owns," enforced by the database, not just checked in application code
22. `marketplace_reviews` — unique index: `(reviewer_id, asset_id)`
23. `marketplace_collections` — index: `(user_id)`
24. `audio_playbacks` — indexes: `(version_id)`, `(user_id)`, `(version_id, user_id)`

### 3.4 Application Structure

Instead of one function-per-file Convex module per domain, mutations are **Server Actions** and reads are plain server-side query functions called from Server Components. Roughly one pair of files per domain:

| Domain | Reads | Writes |
|---|---|---|
| Projects | `lib/queries/projects.ts` | `lib/actions/projects.ts` |
| Versions | `lib/queries/versions.ts` | `lib/actions/versions.ts` |
| Comments | `lib/queries/comments.ts` | `lib/actions/comments.ts` |
| Project files | `lib/queries/project-files.ts` | `lib/actions/project-files.ts` |
| Collaborators / invites | `lib/queries/collaborators.ts` | `lib/actions/collaborators.ts` |
| Issues | `lib/queries/issues.ts` | `lib/actions/issues.ts` |
| Marketplace assets | `lib/queries/marketplace.ts` | `lib/actions/marketplace.ts` |
| Collections | `lib/queries/collections.ts` | `lib/actions/collections.ts` |
| Credits | `lib/queries/credits.ts` | `lib/actions/credits.ts` |
| Service requests | `lib/queries/service-requests.ts` | `lib/actions/service-requests.ts` |
| Applications | `lib/queries/applications.ts` | `lib/actions/applications.ts` |
| Milestones | `lib/queries/milestones.ts` | `lib/actions/milestones.ts` |
| Notifications | `lib/queries/notifications.ts` | `lib/actions/notifications.ts` |
| Analytics | `lib/queries/analytics.ts` | `lib/actions/analytics.ts` (just `recordPlayback`) |
| Ratings | `lib/queries/ratings.ts` | `lib/actions/ratings.ts` |
| Profile | `lib/queries/users.ts` | `lib/actions/users.ts` |

Plus:
- `lib/jobs/stems.ts`, `lib/jobs/waveform.ts` — Inngest functions
- `lib/github.ts` — Octokit wrapper, called from `lib/actions/integrations.ts`
- `lib/storage.ts` — R2 presigned URL helpers (`getUploadUrl`, `getDownloadUrl`)
- `lib/realtime.ts` — typed Supabase Realtime channel helpers
- `app/api/webhooks/clerk/route.ts`, `app/api/webhooks/replicate/route.ts` — signature-verified webhook handlers
- `app/api/uploads/presign/route.ts` — issues presigned R2 upload URLs (a Route Handler rather than a Server Action, since it's called via `fetch` from a raw file-input flow before a form submit)

#### Conventions (apply to every module)
- Server Actions start with `"use server"`, validate input against the shared Zod schema, call `getCurrentUser()`, and throw typed errors that the client catches and toasts.
- Never trust an ID passed from the client without a corresponding ownership/membership check in the same function.
- Drizzle relational queries (`db.query.versions.findMany({ with: { uploader: true, comments: true } })`) are preferred over manual `Promise.all` fan-outs for anything with more than one related table.
- Route Handlers used only for webhooks and the upload-presign endpoint — everything else is a Server Action.

### 3.5 Authentication & Authorization
- **Middleware**: `middleware.ts` uses `clerkMiddleware()` with a route matcher protecting the authenticated route group; `/`, `/auth/*`, `/share/*`, and `/api/webhooks/*` stay public.
- **Server-side**: every Server Action and protected Route Handler starts by resolving `getCurrentUser()`; throws `"Not authenticated"` if null.
- **Authorization model** (unchanged in substance from the original, now enforced in Server Actions instead of Convex mutations):
  - Project-level actions require project-collaborator membership.
  - Marketplace: any signed-in user can create assets; only the creator can update/delete theirs.
  - Credits: server-checked balance; `addCredits` additionally requires `role = 'admin'`.
  - Service requests: only the poster can accept/reject/cancel/release a milestone; applicants can't apply to their own request.
  - Issues: only project collaborators can create/reply.
- **Row-Level Security as a second layer**: since Postgres has real RLS, it's worth turning on as defense-in-depth even though application-level checks above are the primary line — the goal is that a bug in a Server Action's authorization check doesn't automatically become a data leak. The client never queries Postgres directly (all access is server-mediated through Server Actions/Route Handlers using a service-role connection), so RLS here is a safety net rather than the primary gate. If you want RLS policies to reference the Clerk user id directly rather than relying purely on the server-role connection being trusted, Supabase supports wiring an external JWT issuer (including Clerk) as a "third-party auth" provider for RLS — check Supabase's current docs for the exact setup, since the specifics of that integration have evolved.

### 3.6 State Management
- **Server state lives in Postgres**, fetched via Server Components on first load — no separate client-side "hydrate the store" step for most pages.
- **Server Actions** are the default mutation path; Next.js's `useFormStatus`/`useActionState` cover most pending/error UI without extra libraries.
- **TanStack Query** layers on top specifically where a client needs to react to realtime pushes (notifications, chat, presence) or wants optimistic updates smoother than a full Server Action round-trip (e.g., toggling a "mark as read"). Realtime events invalidate/update the relevant query cache.
- **No Redux, no Zustand** — same philosophy as the original spec ("derive, don't duplicate server state"), just implemented with Server Components + Server Actions + TanStack Query instead of Convex subscriptions. Purely ephemeral UI state (a dialog being open, a multi-step upload wizard's current step) is local `useState`.

### 3.7 Performance Considerations
- **Static/ISR** for public, cacheable pages: Explore, Marketplace listing, public project pages, public artist profiles. Revalidate on relevant mutation (`revalidatePath`/`revalidateTag`) rather than time-based polling where possible.
- **Streaming + `loading.tsx`**: route-level Suspense boundaries give free, granular loading states without hand-managing a spinner per query — a genuine upgrade over manually checking `data === undefined` everywhere.
- **Connection pooling matters here in a way it didn't with Convex**: serverless Next.js functions open many short-lived Postgres connections. Use Supabase's pooler (port 6543, transaction mode) or Neon's serverless driver (`@neondatabase/serverless`) — skipping this is the single most common way a Postgres-backed serverless app hits "too many connections" in production.
- **Audio**: streamed from R2 via short-lived presigned or public CDN URLs (Cloudflare's CDN sits in front of R2 for free); waveform peaks pre-computed server-side so the player never has to decode a full file client-side.
- **Uploads**: client requests a presigned R2 URL from `/api/uploads/presign`, `PUT`s directly to R2, then calls the domain Server Action with the resulting object key.
- **Images**: `next/image` for covers/avatars (automatic optimization, lazy-loading).
- **Charts**: lazy-render below the fold; pre-aggregate in SQL, not in the client.
- **Bundle size**: `next/dynamic` for heavy client components (FileTreeView, StemSeparationDialog, the wavesurfer player, the Three.js landing scene).

### 3.8 Security Considerations
- Never trust the client for credit balance, role, or project membership — always re-check server-side, same as before.
- Webhook endpoints (Clerk, Replicate) verify signatures (`svix` for Clerk, Replicate's provided signing secret) before processing.
- R2 URLs are short-lived presigned URLs, generated per-request server-side — never long-lived public links to private files.
- GitHub `path` inputs validated to reject `..`, leading-slash misuse, and backslashes, same as the original.
- Rate-limit the GitHub-proxy and stem-separation-trigger endpoints via Upstash — cheap insurance against a client accidentally (or deliberately) hammering an external API you're paying for or rate-limited on.
- Secrets live in Vercel environment variables, never committed, never exposed to the client (only `NEXT_PUBLIC_*`-prefixed values are).

### 3.9 Scalability Expectations
- Design queries around the indexes in §3.3 and lean on ISR/caching for public pages so performance stays flat as data grows — avoid hardcoding assumptions about any specific host's exact limits into the app; check current provider docs if a concrete ceiling actually matters for a decision.
- Storage size caps: audio ≤ 50 MB per upload; ZIP/DAW bundles and marketplace assets ≤ 200 MB.
- Postgres read replicas (available on both Supabase and Neon) are a straightforward future lever for analytics-heavy queries if they ever start competing with transactional traffic — not needed for MVP, just noting the path exists without a rearchitecture.
- Inngest handles job concurrency and backpressure for stem separation natively; no separate queue to build.

---

## 4. User Experience

### 4.1 UI / UX Expectations
*(Unchanged from the original — this layer is framework-agnostic.)*

**Theme**: Dark, immersive, audio-creator focused. Mint/teal/cyan primary, violet/purple secondary accents. Dark/light toggle via `next-themes`. OKLCH tokens via Tailwind v4.

**Visual hierarchy**:
- **Landing** — hero with bold gradient headline, role pills, 4 feature cards, 4-step "How It Works," CTA, footer.
- **Dashboard** — "My Projects" / "Collaborating" tabs, cards with cover, title, genre, BPM, key, version count, collaborator count, status badge.
- **Explore** — public projects grid, filters (genre, needed role), server-rendered with ISR.
- **New Project** — form dialog: title, description, genre, BPM/Key, visibility, "Looking For" multi-select.
- **Project page** — sticky header; hero card with chips; tabbed body (Versions / Settings / Issues / Collaborators / Activity).
- **Marketplace** — featured carousel + filterable grid (type, genre, price, license, search); asset card with cover + preview play + price.
- **MarketplaceUpload** — multi-section form: file/preview/cover dropzones, metadata fields.
- **Profile** — avatar/name/role chips + credits + rating; bio, DAW, genres, "looking for," collections grid.
- **Integrations** — repo info, file tree, file viewer, commit composer, delete form.
- **Share page** — minimal, read-only, no chrome beyond a "made with TrackForge" footer link back.

### 4.2 Responsive Behavior
Mobile-first; verify at 360, 768, 1024, 1280, 1536 px. Tablet grids collapse to 2-col; mobile tabs become a `<Select>` or horizontally-scrollable `<TabsList>`. Touch targets ≥44px. Drag-and-drop upload has a tap-to-pick fallback. Tables collapse to cards on `<md`.

### 4.3 Accessibility Requirements
Full keyboard reachability, accessible names on icon-only buttons, color never the sole state signal, `<Label htmlFor>` always present, modals trap focus and close on Escape, WCAG AA contrast, skip-to-main-content link.

### 4.4 Loading States
`<Loader2 className="animate-spin" />` (Lucide) — no shadcn skeletons, same convention as before — now backed by route-level `loading.tsx` files for free streaming boundaries instead of manually checking `data === undefined`. Upload buttons show `Uploading…` with a spinner during the presigned-upload step.

### 4.5 Empty States
| Surface | Empty state |
|---|---|
| Dashboard / My Projects | "You haven't created any projects yet" + CTA |
| Dashboard / Collaborating | "You're not collaborating on anything yet" + link to Explore |
| Versions tab | "No versions yet" + Upload First Version CTA (collaborators only) |
| Project / Issues | "No issues yet" + New Issue CTA |
| Project / Collaborators | "No collaborators yet" + Invite CTA |
| Marketplace list | "No assets match your filters" |
| My assets | "You haven't listed anything yet" + Upload CTA |
| Notifications | "All caught up" |

### 4.6 Error States
Network/query errors → toast with retry. Auth errors → "Please sign in again" + login button. Permission errors → "You don't have permission to do that." 404 → full-page graceful message via `not-found.tsx`. Unhandled errors → `error.tsx` boundary per route segment (a Next.js-native upgrade over a single global error boundary). Form validation → inline `<FormMessage>` per field.

---

## 5. Code Quality Standards

### 5.1 Modular Architecture
```
app/
├── (marketing)/
│   ├── layout.tsx
│   └── page.tsx                          # Landing
├── auth/
│   ├── sign-in/[[...sign-in]]/page.tsx
│   └── sign-up/[[...sign-up]]/page.tsx
├── (app)/                                 # protected route group
│   ├── layout.tsx                         # nav, notifications dropdown
│   ├── dashboard/page.tsx
│   ├── explore/page.tsx
│   ├── projects/new/page.tsx
│   ├── projects/[projectId]/
│   │   ├── layout.tsx                     # tabs
│   │   ├── page.tsx                       # Versions tab
│   │   ├── issues/page.tsx
│   │   ├── collaborators/page.tsx
│   │   ├── settings/page.tsx
│   │   └── activity/page.tsx
│   ├── marketplace/
│   │   ├── page.tsx
│   │   ├── [assetId]/page.tsx
│   │   └── upload/page.tsx
│   ├── service-requests/
│   │   ├── page.tsx
│   │   └── [requestId]/page.tsx
│   ├── profile/[userId]/page.tsx
│   └── integrations/page.tsx
├── share/v/[versionId]/
│   ├── page.tsx
│   └── opengraph-image.tsx
├── api/
│   ├── webhooks/clerk/route.ts
│   ├── webhooks/replicate/route.ts
│   ├── uploads/presign/route.ts
│   └── inngest/route.ts                   # Inngest handler
├── not-found.tsx
├── error.tsx
└── layout.tsx                             # ClerkProvider, ThemeProvider, Toaster

lib/
├── db/
│   ├── schema.ts                          # Drizzle — single source of DB truth
│   └── index.ts                           # Drizzle client
├── actions/                                # Server Actions, one file per domain
├── queries/                                # Read-side query functions
├── jobs/                                   # Inngest functions
├── schemas/                                # Zod schemas, shared client + server
├── github.ts
├── storage.ts                              # R2 presign helpers
├── realtime.ts                             # Supabase Realtime helpers
├── auth.ts                                 # getCurrentUser()
└── utils.ts                                # cn()

components/
├── ui/                                     # shadcn primitives
└── project/                                # domain components

middleware.ts
```

- Route segments own page-level composition; `components/` owns reusable UI; `lib/` owns data contracts and side effects.
- One concern per file. No file over 500 LOC unless purely declarative (e.g. the Drizzle schema).

### 5.2 Reusable Components
Same component inventory as before — `VersionCard`, `VersionTreeView`, `AudioPlayerWithComments` (now wavesurfer-backed), `CollaboratorsManager`, `ProjectSettings`, `ProjectAnalytics`, `ProjectCoverArt`, `StemSeparationDialog`, `FileTreeView`, `LogoDropdown`, `NotificationsDropdown`, plus new: `PresenceAvatars`, `ShareLinkButton`. Each has an exported `<Name>Props` type. `cn()` from `@/lib/utils` for conditional classes.

### 5.3 Clean Code Principles
Strict TS (`noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess`). `"use client"` only on components that actually need interactivity/hooks — default to Server Components. Never shadow React hooks. Avoid `any`; cast at boundaries with a justifying comment. Derive, don't sync. File names match main export. `@/` import alias. ESLint (Next.js config) + Prettier.

### 5.4 Documentation Expectations
Header comment per non-trivial module describing purpose. JSDoc on non-obvious functions. README mirrors structure (TOC, quickstart, env vars, scripts, architecture overview, routing map). `docs/` holds design-rationale docs for major features.

### 5.5 Testing Requirements
Vitest for unit tests on `lib/` pure utilities and component renderers (`@testing-library/react`). Server Action tests can call the action function directly against a test database (Docker Postgres or a Supabase branch) rather than mocking a context object — a genuinely simpler testing story than mocking Convex's `ctx`. One Playwright e2e test for auth → new project → upload version. Smoke test before merge: `tsc --noEmit` + `next build` + `drizzle-kit migrate` against a clean test DB. Coverage target ≥70% in `lib/`.

### 5.6 Logging & Monitoring
`console.error` only for unexpected errors; never log PII. Server Actions throw descriptive errors, never fail silently. A root `error.tsx` reports unknown errors to whatever tracking tool you wire up (Sentry is the standard pairing with Next.js/Vercel). Inngest's own dashboard gives job-level observability for stem separation for free — no separate logging needed there. `view_landing` funnel event can be a minimal internal Postgres log table for MVP; no third-party analytics provider required unless asked.

### 5.7 Maintainability
ADRs in `docs/ADR-NNN-title.md` for non-trivial choices. Magic numbers as top-of-file `const`s. Side effects isolated in `lib/actions` and `lib/jobs` for testability. Public surfaces fully typed. Lean dependency list (Three.js on the landing page is the one deliberate exception, per §3.2).

---

## 6. Deliverables

### 6.1 Source Code
All code in `app/`, `lib/`, `components/`. Final structure mirrors §5.1.

### 6.2 Folder Structure (mandatory)
Directory tree at end-of-build matches §5.1. New files documented in the README.

### 6.3 Documentation
- **`README.md`**: app description, stack table, setup instructions, environment variables (full list below), scripts, routing map, architecture overview.
- **`docs/`**: design rationale docs.
- JSDoc in non-obvious functions.

**Environment variables**:
```
DATABASE_URL=                       # Supabase or Neon connection string (pooled)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
NEXT_PUBLIC_SUPABASE_URL=           # for the Realtime client
NEXT_PUBLIC_SUPABASE_ANON_KEY=
REPLICATE_API_TOKEN=
REPLICATE_WEBHOOK_SECRET=
GITHUB_TOKEN=
GH_OWNER=
GH_REPO=
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

### 6.4 Setup Instructions
1. Clone.
2. `pnpm install`
3. Copy `.env.example` → `.env.local`, fill in the variables above (nothing platform-specific to work around — a standard Next.js project runs the same locally as in CI).
4. `pnpm drizzle-kit push` (or `migrate` if you've already generated migration files) to sync the schema to your database.
5. `pnpm dev`.
6. In a second terminal, `npx inngest-cli dev` to run the local Inngest dev server for background jobs.

### 6.5 Configuration Files
`next.config.ts`, `tsconfig.json` (strict, `@/* → ./*` or `./src/*` depending on whether you use a `src/` dir), `components.json` (shadcn), `drizzle.config.ts`, `.gitignore` (`node_modules`, `.next`, `.env*`), ESLint + Prettier configs.

### 6.6 Tests
`*.test.ts(x)` co-located with source. One e2e test under `e2e/`. Coverage thresholds in `vitest.config.ts`.

### 6.7 Deployment
- **App**: Vercel (Next.js's native home — ISR, edge middleware, and Server Actions all just work without extra configuration).
- **Database**: Supabase or Neon, managed.
- **Storage**: Cloudflare R2.
- **Background jobs**: Inngest Cloud (free tier is plenty for MVP volume) or self-hosted.
- **Environment variables**: managed in Vercel's dashboard, not committed.

---

## 7. Development Plan (incremental phases)

Phase labels are a dependency-ordered sequence, not a calendar — a coding agent isn't bound by human working hours.

### Phase 0 — Skeleton
Init Next.js 15 (App Router) + TS + Tailwind v4. Install shadcn, Lucide, Framer Motion. Set up Clerk (`ClerkProvider`, middleware). Set up Drizzle + a Supabase/Neon project, run first migration (empty schema). **Deliverable**: Landing renders; sign-in flow reaches a placeholder dashboard; `next build` passes.

### Phase 1 — Database & Auth
Author `lib/db/schema.ts` per §3.3, generate and apply the first real migration. Clerk webhook syncing `users`. `getCurrentUser()` helper, protected route group. **Deliverable**: a user can sign in; their row exists in Postgres; a protected page reads it back.

### Phase 2 — Projects & Versions core
Projects + versions + project_files + comments actions/queries. Presigned R2 upload flow. `Dashboard`, `NewProject`, `Project` (Versions tab only). `VersionCard`, `VersionTreeView`, `AudioPlayerWithComments` (wavesurfer + waveform background job). **Deliverable**: create project, upload version, fork, real waveform playback, timestamped comments, tree renders.

### Phase 3 — Collaboration + Issues + Realtime
Collaborators, invites, issues, issue replies. Notifications table + Supabase Realtime wiring (this is also where presence and live chat get plugged in, since the channel infra is shared). **Deliverable**: full collaboration loop with live notifications; issues filed/replied/status-advanced.

### Phase 4 — Marketplace, Credits & Service Requests
Marketplace assets (+ full-text search, collections), credits ledger, service requests/applications/milestones with the full release→complete lifecycle. **Deliverable**: list/browse/purchase/review assets; post a gig, receive applications, accept one, release and complete a milestone.

### Phase 5 — Analytics + Stem Separation + Share Links
`getAudioAnalytics`/`getProjectAnalytics` as SQL aggregations. Inngest + Replicate webhook stem separation. Public share-link route with OG image generation. **Deliverable**: analytics tab is meaningful; stems generate asynchronously and appear live; a version link unfurls properly when pasted elsewhere.

### Phase 6 — Integrations & Profile polish
GitHub integration (Octokit), `/integrations` UI. Profile page. **Deliverable**: GitHub repo browse/commit works; profile is editorial-grade.

### Phase 7 — Hardening
Lighthouse pass (accessibility, contrast, mobile, performance). Vitest + one Playwright e2e. Rate limiting on GitHub/stem-trigger endpoints. RLS policies reviewed. README/docs finalized. Final `tsc --noEmit` + `next build` + fresh-DB migration check, all clean.

---

## 8. Assumptions

### 8.1 Safe Assumptions (do not ask, just proceed)
- App Router only; Server Components by default; `"use client"` only where interactivity/hooks are actually needed.
- Server Actions are the default mutation mechanism; Route Handlers are reserved for webhooks and the upload-presign endpoint.
- `lib/db/schema.ts` (Drizzle) is the single source of DB truth; migrations are generated, not hand-written SQL.
- The client never talks to Postgres directly — all access goes through server code (Server Components, Server Actions, Route Handlers, Inngest functions) using a trusted connection.
- Middleware protects the `(app)` route group; `(marketing)`, `/auth/*`, `/share/*`, and `/api/webhooks/*` are public.
- Zod schemas in `lib/schemas/` are imported by both the client form and the server action that writes the row — never duplicated.
- Icons: `lucide-react` only. Toasts: `sonner` only, with the same message/error/success conventions as before. Loading: `Loader2` + `animate-spin` + route-level `loading.tsx`; no skeletons. Shadows avoided, thin borders only. Cards never nested. Tailwind v4, no config file, OKLCH tokens. Framer Motion for animation.
- Package manager: pnpm, corepack-pinned.
- Self-critique posture: before introducing a hack, ask "would this survive a re-read in six months?"

### 8.2 Deferred / Ask Only If You Hit
- **Real-money payouts**: Stripe Connect is designed-for (append-only ledger, §2.9) but not built for MVP.
- **Transactional email**: notifications are in-app/realtime only.
- **Dedicated search infra**: Postgres FTS + trigram is sufficient at MVP scale; don't add Algolia/Meilisearch unless asked.
- **Multi-tenancy / org accounts**: not in scope.
- **Third-party analytics**: the landing funnel event is a minimal internal stub, not Mixpanel/PostHog/GA, unless asked.
- **Self-hosting Inngest**: start on Inngest Cloud's free tier; self-hosting is a later infra decision, not a build-time one.

### 8.3 Conventions
- Presigned-upload flow: client requests a URL from `/api/uploads/presign`, `PUT`s the file, then calls the domain Server Action with the resulting object key.
- `getCurrentUser()` never returns `email` to client components unless the caller is an admin.
- `cursor-pointer` on every interactive element that doesn't already have it.
- Titles/h1s: `tracking-tight font-bold`.
- Single typography scale (Tailwind defaults). Don't invent fractional sizes.
- `<Toaster />` rendered once, near the root layout.
- TanStack Query's `isPending`/`isError` states replace the old "check for `undefined`" Convex convention.

---

## 9. Optional Enhancements (Post-MVP Ideas)

Not required by §1.4. A menu for what to build next, roughly ordered by how directly they extend what the new stack already makes easy:

- **Stripe Connect payouts** — cash out credits to real money. The ledger (§2.9) is deliberately designed so this is a new transaction type and a reconciliation job, not a redesign.
- **Audio Diff Mode** — synced A/B playback + waveform-amplitude overlay between two versions. The single highest-identity feature left on the table (§2.3).
- **Stem-level merging** — assemble a new version from stems pulled off two different forks; needs an optional `merged_from_version_ids` array on `versions`.
- **Outgoing project webhooks** — let a project owner configure a Discord/Slack webhook URL that fires on `version_uploaded`/`milestone_released`/etc. Directly closes the loop on the "studios currently coordinate via Discord" problem in §1.2, and it's cheap given Inngest is already in the stack for reliable delivery with retries.
- **Searchable transcripts** — run vocal stems through a transcription model (e.g. Whisper via Replicate) once separated, store the transcript in a `tsvector` column, and make lyrics/vocal content searchable — and it's most of what's needed for accessibility captions on the player, which the original spec explicitly punted on.
- **Conventional version tags** — an optional `feat`/`mix`/`master`/`fix`/`experiment` chip on upload, shown as a colored badge on tree nodes.
- **Read replicas for analytics** — if `getAudioAnalytics`/`getProjectAnalytics` ever start competing with transactional load, point them at a Supabase/Neon read replica — no application rewrite needed, just a second connection string.
- **Edge-cached public artist profile pages** — same ISR pattern as Explore/Marketplace, extended to `/profile/[userId]` for a lightweight public "artist page" that can be linked outside TrackForge.

---

## Final Reminders

1. Keep the application **runnable at every commit**. Each phase yields a working preview.
2. When something is unclear, **look at `lib/db/schema.ts` and the existing `lib/actions/*.ts` files and reverse-engineer the contract** — they are the spec for this build.
3. When in doubt, **mirror the existing implementation rather than reinventing**.
4. Run `tsc --noEmit` + `next build` after any non-trivial change; run a fresh migration against a clean test database before merging schema changes.
5. Secrets live only in environment variables — never commit `.env*`, never hardcode a token.
6. The final preview must show: Landing → Auth → Dashboard → New Project → Project with a real waveform player and timestamped comments → Invite flow with live notifications → Marketplace browse/purchase → Service request through milestone completion → a working public share link → Integrations — all without console errors or type errors.

Build it.
