# Notes App Platform Contract

Last updated: April 1, 2026

## Current Milestone 1 Implementation

The current `web/` implementation intentionally runs without live Convex usage in the runtime path.

Current reality:

- `npm run dev` starts a local TanStack Start app without Convex dev services
- `src/router.tsx` is local-only for Milestone 1
- note persistence is handled through IndexedDB with an in-memory fallback when IndexedDB is unavailable
- the route shell lives in `src/routes/`
- the local entry model and store live in `src/features/entries/`
- voice capture is browser-side and uses `getUserMedia` plus `MediaRecorder` when available

This is a deliberate milestone cut, not an architectural reversal. Convex remains the planned backend for the later sync/search phase, but it is not part of the current proof path.

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

- Runtime backend dependency: none
- Durable client persistence: IndexedDB
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
- Guest notes do not sync across devices.
- Guest notes may be searched locally if local search exists.
- Guest notes are not represented as remotely owned account data.

### Account mode

- After sign-up on the same device, the app offers migration of local notes into the user account.
- Only after migration do notes enter remote sync and remote search.
- The UI must never imply pre-sign-up cloud backup.

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

## Search Contract

- Search is full-text over titles and transcripts.
- Search only covers data that actually exists and is retained.
- Search must not claim to search audio directly.
- If local-only guest search is not implemented in the first pass, the UI must avoid implying universal search coverage before sign-up.

## Audio And Transcription Contract

### Capture

- Use `getUserMedia` for microphone capture.
- Use `MediaRecorder.isTypeSupported()` to choose a supported recording format at runtime.
- Save a local artifact before starting remote-dependent work.

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
