# Notes App Platform Contract

Last updated: April 4, 2026

## Current Milestone 1 Implementation

The current `web/` implementation intentionally keeps note data local-first in the runtime path.

Current reality:

- `bun run dev` starts a local TanStack Start app without Convex dev services
- `src/router.tsx` is local-first for Milestone 1
- `src/start.ts` now supports env-gated Clerk middleware for future account auth without changing the default public local-first build
- note persistence is handled through IndexedDB with fail-closed gating when IndexedDB is unavailable
- `src/lib/auth/` now creates a durable guest session per browser profile and can optionally register that guest session with Convex when `VITE_CONVEX_URL` is configured
- `src/lib/auth/clerkConfig.ts` and `src/lib/auth/clerkRuntime.tsx` now define an env-gated Clerk foundation and only surface the Settings sign-in CTA when account preparation is fully configured for this build
- `src/lib/audio/voiceCaptureDisclosure.ts` remembers first-run voice-capture disclosure acceptance per browser profile when localStorage is available
- `convex/schema.ts`, `convex/identity.ts`, and `convex/migrations.ts` now define the backend ownership, migration, and manual account-copy foundation
- `src/features/settings/accountMigration.ts` and `src/routes/settings.tsx` now wire a Settings-only manual account-copy flow that uploads current local notes plus retained audio into the signed-in account
- `src/routes/settings.tsx` now also reads back verified account-copy metadata for the active device session, exposes retry for transient account-prep failures, lists copied snapshots from other device sessions in the same account, and can restore an empty device from an explicitly selected copied snapshot without implying live sync
- the route shell lives in `src/routes/`
- the local entry model and store live in `src/features/entries/`
- voice capture is browser-side and uses `getUserMedia` plus `MediaRecorder` when available

This is still a deliberate milestone cut, not an architectural reversal. Convex is now the live backend boundary for guest-session registration, explicit manual account copy, verified snapshot readback, and explicit empty-device snapshot recovery, but the runtime still does not provide live background sync/search or general cross-device note browsing.

## Purpose

This file defines the technical boundaries for implementation. Engineers should treat it as the source of truth for platform support, architecture boundaries, and escalation criteria.

## Support Matrix

### In scope for initial implementation

- iPhone Safari on current major iOS releases
- Chrome on current major Android releases
- Installed web app behavior where supported

### Best-effort only

- Desktop browsers
- Tablet-specific layouts
- Browser-native speech APIs with inconsistent support

### Explicitly not promised on the web

- Continuous background recording
- Guaranteed background transcription
- Native-equivalent audio session behavior

## Stack Decisions

- Frontend app: TanStack Start
- Backend and realtime data: Convex
- Deployment: Vercel
- Initial auth direction: stable hosted provider with Convex integration, preferably Clerk

For Milestone 1 only:

- Runtime backend dependency for note content: none
- Optional backend boundary: guest-session registration through Convex when `VITE_CONVEX_URL` exists
- Optional auth boundary: Clerk middleware/provider only when `VITE_ENABLE_OPTIONAL_AUTH=1` and Clerk keys are present
- Durable client persistence: IndexedDB
- Package manager and command runner: Bun
- Browser proof strategy: headless Chromium with fake media for automation plus later manual Safari validation

## Architecture Boundaries

- Capture is client-side.
- Draft safety is local-first.
- Transcription is a replaceable pipeline, not a hardcoded provider dependency.
- Search indexes transcript text, not raw audio.
- Raw audio is an optional attachment, not the primary source of truth for retrieval.
- Domain logic must not be spread across route files.

## Proposed Codebase Layout

The future application should live in `web/` so product docs can remain at the repository root.

### Frontend

- `web/src/routes/__root.tsx`
- `web/src/routes/index.tsx`
- `web/src/routes/drafts.tsx`
- `web/src/routes/recent.tsx`
- `web/src/routes/settings.tsx`
- `web/src/routes/note/$noteId.tsx`
- `web/src/features/capture/`
- `web/src/features/entries/`
- `web/src/features/recovery/`
- `web/src/features/settings/`
- `web/src/features/search/`
- `web/src/lib/audio/`
- `web/src/lib/transcription/`
- `web/src/lib/auth/`
- `web/src/lib/platform/`

### Backend

- `web/convex/schema.ts`
- `web/convex/entries.ts`
- `web/convex/search.ts`
- `web/convex/storage.ts`
- `web/convex/migrations.ts`

### Tests

- `web/tests/unit/`
- `web/tests/e2e/`

## Identity Model

### Guest mode

- First-run use is local-only.
- The current implementation creates a device-local guest-session id before any account exists.
- Durable guest sessions may be registered with Convex to support later explicit migration, but this does not imply cloud note backup.
- Guest notes do not sync across devices.
- Guest notes are currently searchable locally by title and transcript text on the same device.
- Guest notes are not represented as remotely owned account data.

### Account mode

- After sign-up on the same device, the app can explicitly copy the current local note set into the user account from Settings.
- That account copy is manual and retryable. It is not background sync.
- If that same signed-in device session later becomes empty, Settings can explicitly restore the device from the last copied snapshot for the same `guestSessionId`.
- If the signed-in account contains copied snapshots from other device sessions, Settings can list them with provenance and allow restore only when the current device is empty and the user explicitly selects one.
- The UI must never imply pre-sign-up cloud backup.
- Backend identity responses must not report full account ownership until there is an actual account row to own migrated data; unaffiliated authenticated viewers should remain in a pending-account state.
- The current implementation now has an env-gated Clerk boot path plus a Settings sign-in CTA, but the live UI must still stay explicit that background sync, account-backed search, merge restore, and general cross-device browsing are not shipped yet.

## Entry Model

Every entry should support at least these fields:

- `id`
- `deviceLocalId`
- `userId` (optional before migration)
- `ownerMode`
- `sourceType`
- `status`
- `title`
- `transcript`
- `hasAudio`
- `audioFileId`
- `storageMode`
- `createdAt`
- `updatedAt`

## Sync Contract

- Local persistence happens before remote sync.
- Remote sync is retryable and explicit.
- A remotely synced note must remain locally readable.
- Sync must not overwrite a newer local draft with stale remote data.
- Migration from guest to account must be one-time, visible, and resumable.
- The current implementation only ships explicit manual account copy from Settings. Automatic follow-up sync after later edits is not live yet.
- Account-copy restore from the same or another selected device-session snapshot must download retained audio before local replacement and roll back to the prior local snapshot if post-restore verification fails.
- Cross-session account-snapshot restore must stay confirmation-gated, must require an empty local device, and must not claim merged or live-synced state after restore.

## Search Contract

- Search is full-text over titles and transcripts.
- Search only covers data that actually exists and is retained.
- Search must not claim to search audio directly.
- The current runtime search is local-only and must say so explicitly until account-backed remote search exists.

## Audio And Transcription Contract

### Capture

- Use `getUserMedia` for microphone capture.
- Gate the first `getUserMedia` request behind an in-app disclosure that explains microphone use, retained local audio behavior, and whether audio leaves the device in the current milestone.
- The gate may be remembered per browser profile for later fresh voice-note starts, but if browser storage is unavailable it must fail closed and re-show the disclosure instead of assuming prior acknowledgment.
- Use `MediaRecorder.isTypeSupported()` to choose a supported recording format at runtime.
- Save a local artifact before starting remote-dependent work.
- If the browser cannot start voice capture safely, the UI must fall back to text capture with an explicit explanation instead of leaving the user in a broken voice state.

### Transcription

- The app must define a provider interface rather than baking provider-specific behavior into routes or UI.
- The provider must support deletion of temporary audio artifacts or no-retention handling.
- The UI must work even when the provider is slow or unavailable.

### Retained audio

- Audio retention is optional per note.
- Audio storage is implemented through Convex file storage or an equivalent explicit attachment layer.
- Audio retention status must be queryable in the UI.

## Auth Recommendation

Use a stable hosted provider with well-documented TanStack Start and Convex integration for the first implementation cycle. Convex Auth should not be the default choice for the first production MVP because it remains beta.

## Native Escalation Rule

Do not move to native packaging or native clients just because the web app exists.

Escalate only if one of these becomes a firm product requirement:

- uninterrupted long-form recording
- deeper background behavior
- richer OS media session integration
- store-only distribution requirements that materially affect growth

## Engineering Risk Gates

Implementation should stop and re-evaluate if any of these fail:

- target mobile browsers cannot keep draft-safe local capture stable
- the chosen transcription path cannot satisfy the retention contract
- guest-to-account migration creates ambiguous ownership
- local/remote merge behavior risks data loss
- search performance or correctness fails on realistic transcript lengths

## Deployment Boundary

- Web frontend deploys on Vercel
- Backend data and functions run on Convex
- Secrets for any transcription provider must never leak into client bundles
- Provider choice must be swappable without changing the product-facing state model
