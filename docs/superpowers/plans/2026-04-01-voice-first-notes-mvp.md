# Voice-First Notes MVP Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working Milestone 1 proof of concept in a new `web/` app: local-first guest voice and text notes with durable drafts, visible state transitions, manual fallback, and recovery after interruption.

**Architecture:** The app lives in `web/` using TanStack Start for the frontend. Milestone 1 is deliberately local-only: entries are safe on-device before any remote work exists. Voice capture, processing, review, save, retrieval, and recovery are implemented as explicit state transitions rather than optimistic UI assumptions. Remote sync, auth, search, privacy controls, and installability are deferred until the local proof of concept is proven.

**Tech Stack:** TanStack Start RC, React, TypeScript, IndexedDB, Vitest, Playwright

---

## PLAN_VERSION: v4

## Support Matrix For Milestone 1

### In scope

- iPhone Safari on current major iOS releases
- Chrome on current major Android releases
- Desktop browsers as best-effort only

### Out of scope for Milestone 1

- background recording guarantees
- remote sync
- account login
- search across remote notes
- installable PWA behavior

## Local Persistence Contract

- Use IndexedDB as the primary durable local store.
- If IndexedDB is unavailable, degrade cleanly to manual text-only operation with a visible warning that durable local storage is not available.
- Do not claim a draft is durable until it has been written to persistent browser storage.
- A refresh or reopen must restore drafts from persistent local storage.

## Planned File Structure

### Product docs

- Keep existing docs in `docs/specs/`
- Update docs only when behavior changes

### Application

- Create: `web/package.json`
- Create: `web/src/router.tsx`
- Create: `web/src/routes/__root.tsx`
- Create: `web/src/routes/index.tsx`
- Create: `web/src/routes/drafts.tsx`
- Create: `web/src/routes/recent.tsx`
- Create: `web/src/routes/settings.tsx`
- Create: `web/src/routes/note/$noteId.tsx`
- Create: `web/src/features/capture/`
- Create: `web/src/features/entries/`
- Create: `web/src/features/recovery/`
- Create: `web/src/features/search/`
- Create: `web/src/features/settings/`
- Create: `web/src/lib/audio/`
- Create: `web/src/lib/transcription/`
- Create: `web/src/lib/auth/`
- Create: `web/src/lib/platform/`

### Tests

- Create: `web/tests/unit/`
- Create: `web/tests/e2e/`

## Milestone 1 Definition Of Done

Milestone 1 is only complete when all of the following are true:

- guest user can create and save a manual text note locally
- guest user can create and save a voice note locally
- denied microphone permission routes the user into manual text entry without dead ends
- local drafts survive refresh and app reopen
- interrupted or failed processing does not destroy the note
- recent entries and drafts are clearly visible on mobile
- all user-facing states are explicit: draft, recording, processing, review-ready, saved locally, needs retry

## Risk Gates

- **Gate 1:** microphone capture and local draft persistence are stable on target mobile browsers
- **Gate 2:** the app works meaningfully even when transcription is delayed or unavailable
- **Gate 3:** public UI never lies about whether a note is only local or fully saved
- **Gate 4:** persistent local storage is proven before any later remote work begins

## Chunk 1: Foundation And Project Skeleton

### Task 0: Verify repository and workspace assumptions

**Files:**
- Modify: `docs/superpowers/plans/2026-04-01-voice-first-notes-mvp.md`

- [ ] **Step 1: Confirm repository state**

Run: `pwd && ls -la && git status --short --branch || true`
Expected: workspace state is clear, and the absence of git is treated as expected rather than a blocker.

- [ ] **Step 2: Defer commit steps until git exists**

If the workspace is still not a git repo, skip commit commands in later tasks and record completion without git actions.

- [ ] **Step 3: Proceed to scaffold only after the plan is accepted**

No code changes happen before this updated plan is the active execution path.

### Task 1: Scaffold the web app

**Files:**
- Create: `web/`
- Test: `web/package.json`

- [ ] **Step 1: Create the app workspace**

Run: `npm create convex@latest web -- -t tanstack-start`
Expected: `web/` contains a TanStack Start starter with working install and generated app files.

- [ ] **Step 2: Use a scaffold fallback if the template differs**

If the Convex starter path is unavailable or unsuitable, fall back to the closest official TanStack Start starter and keep the app local-only for Milestone 1.

- [ ] **Step 3: Install test tooling**

Run: `cd web && npm install -D vitest @playwright/test`
Expected: `package.json` includes unit and e2e test dependencies.

- [ ] **Step 4: Verify initial build**

Run: `cd web && npm run build`
Expected: build completes successfully with generated route tree and no TypeScript errors.

### Task 2: Establish feature-oriented frontend structure

**Files:**
- Create: `web/src/features/capture/index.ts`
- Create: `web/src/features/entries/index.ts`
- Create: `web/src/features/recovery/index.ts`
- Create: `web/src/features/search/index.ts`
- Create: `web/src/features/settings/index.ts`
- Create: `web/src/lib/audio/index.ts`
- Create: `web/src/lib/transcription/index.ts`
- Create: `web/src/lib/auth/index.ts`
- Create: `web/src/lib/platform/index.ts`
- Test: `web/src/routes/index.tsx`

- [ ] **Step 1: Create feature directories and barrel files**

Add minimal exports so route files can depend on stable feature boundaries instead of ad-hoc relative imports.

- [ ] **Step 2: Update the home route to import from feature boundaries**

Expected result:

```ts
import { HomeScreen } from '@/features/entries'
```

- [ ] **Step 3: Verify the app still builds**

Run: `cd web && npm run build`
Expected: build succeeds after directory reorganization.

### Task 3: Add mobile design tokens and app shell

**Files:**
- Create: `web/src/styles/tokens.css`
- Modify: `web/src/routes/__root.tsx`
- Modify: `web/src/routes/index.tsx`
- Test: `web/tests/unit/app-shell.test.tsx`

- [ ] **Step 1: Add a design token file for spacing, color, type, and motion**

Include tokens for:

- warm neutral background
- vivid accent
- large touch targets
- restrained motion durations

- [ ] **Step 2: Apply tokens in the root route**

Expected result:

```tsx
export const Route = createRootRoute({
  component: RootLayout,
})
```

The layout should provide a mobile-first frame and avoid desktop-style chrome.

- [ ] **Step 3: Add a unit test that verifies home shell renders primary actions**

Run: `cd web && npm run test -- app-shell`
Expected: test passes and confirms home renders capture, text entry, drafts, and recent links.

## Chunk 2: Local-First Capture And Recovery

### Task 4: Implement the entry domain model and local draft store

**Files:**
- Create: `web/src/features/entries/types.ts`
- Create: `web/src/features/entries/localStore.ts`
- Create: `web/src/features/entries/selectors.ts`
- Test: `web/tests/unit/local-store.test.ts`

- [ ] **Step 1: Define the entry types**

Use a shape similar to:

```ts
export type EntryStatus =
  | 'draft_local'
  | 'recording'
  | 'processing'
  | 'review_ready'
  | 'saved_local'
  | 'syncing'
  | 'saved_remote'
  | 'needs_retry'
```

- [ ] **Step 2: Implement local persistence**

Store draft entries in IndexedDB or a similarly durable browser store. Do not use only in-memory state.

- [ ] **Step 3: Write tests for create, update, recover, delete, and unavailable-storage fallback**

Run: `cd web && npm run test -- local-store`
Expected: all local persistence scenarios pass.

### Task 5: Implement manual text capture

**Files:**
- Create: `web/src/features/entries/TextComposer.tsx`
- Modify: `web/src/routes/index.tsx`
- Modify: `web/src/routes/note/$noteId.tsx`
- Test: `web/tests/e2e/manual-note-flow.spec.ts`
- Test: `web/tests/e2e/permission-denied-flow.spec.ts`

- [ ] **Step 1: Add a text composer reachable from home**

The composer must autosave locally as the user types.

- [ ] **Step 2: Add review/save behavior for manual notes**

The user must be able to title and save a note without microphone access.

- [ ] **Step 3: Add an e2e test for first-run guest text capture**

Run: `cd web && npx playwright test web/tests/e2e/manual-note-flow.spec.ts`
Expected: guest user can create, save, and revisit a text note.

- [ ] **Step 4: Add an e2e test for microphone-denied fallback**

Run: `cd web && npx playwright test web/tests/e2e/permission-denied-flow.spec.ts`
Expected: denied microphone permission immediately routes the user into manual text capture with no dead end.

### Task 6: Implement client-side audio capture and state machine

**Files:**
- Create: `web/src/lib/audio/recorder.ts`
- Create: `web/src/features/capture/useCaptureMachine.ts`
- Create: `web/src/features/capture/CaptureScreen.tsx`
- Modify: `web/src/routes/index.tsx`
- Test: `web/tests/unit/capture-machine.test.ts`
- Test: `web/tests/e2e/voice-note-flow.spec.ts`

- [ ] **Step 1: Implement recording format negotiation**

Use `MediaRecorder.isTypeSupported()` to select a supported format instead of hardcoding one mime type.

- [ ] **Step 2: Implement the capture machine**

The state machine must support:

- `recording`
- `processing`
- `review_ready`
- `needs_retry`

- [ ] **Step 3: Persist a local artifact before processing**

Stop recording, save the draft locally, then begin transcription or queued processing.

- [ ] **Step 4: Add unit tests for transition correctness**

Run: `cd web && npm run test -- capture-machine`
Expected: tests prove no happy-path-only assumptions.

- [ ] **Step 5: Add e2e coverage for voice-note happy path**

Run: `cd web && npx playwright test web/tests/e2e/voice-note-flow.spec.ts`
Expected: with browser microphone permission granted and test media configured, a guest user can complete the voice-note flow, save it locally, and reopen it from Recent.

### Task 7: Implement recovery and retry UX

**Files:**
- Create: `web/src/features/recovery/RecoveryBanner.tsx`
- Create: `web/src/features/recovery/retryQueue.ts`
- Modify: `web/src/routes/note/$noteId.tsx`
- Test: `web/tests/e2e/recovery-flow.spec.ts`

- [ ] **Step 1: Add visible state labels for local, syncing, saved, and retry**

- [ ] **Step 2: Queue failed processing or sync work locally**

- [ ] **Step 3: Add recovery UI for interrupted or failed entries**

- [ ] **Step 4: Add e2e coverage for reload recovery and retry**

Run: `cd web && npx playwright test web/tests/e2e/recovery-flow.spec.ts`
Expected: interrupted drafts are recoverable and failed work can be retried.
## Chunk 3: Post-POC Expansion Only

Do not start this chunk until Milestone 1 has been proven against the support matrix and risk gates above.

### Task 8: Implement transcript provider abstraction

**Files:**
- Create: `web/src/lib/transcription/types.ts`
- Create: `web/src/lib/transcription/provider.ts`
- Create: `web/src/lib/transcription/queue.ts`
- Modify: `web/src/features/capture/useCaptureMachine.ts`
- Test: `web/tests/unit/transcription-queue.test.ts`

- [ ] **Step 1: Define a provider interface**

Example:

```ts
export interface TranscriptionProvider {
  transcribe(input: TranscriptionJob): Promise<TranscriptionResult>
  deleteTemporaryArtifacts(jobId: string): Promise<void>
}
```

- [ ] **Step 2: Implement queue-aware processing**

The UI must continue to function while processing is delayed.

- [ ] **Step 3: Add tests for delayed, failed, and retried jobs**

Run: `cd web && npm run test -- transcription-queue`
Expected: failed jobs move to retry without destroying the note.

### Task 9: Integrate account auth and guest migration

**Files:**
- Create: `web/src/lib/auth/clerk.ts`
- Create: `web/src/lib/auth/guestSession.ts`
- Modify: `web/src/routes/__root.tsx`
- Modify: `web/src/routes/settings.tsx`
- Test: `web/tests/e2e/guest-migration.spec.ts`

- [ ] **Step 1: Add hosted auth integration**

Prefer Clerk with documented Convex and TanStack Start integration.

- [ ] **Step 2: Implement device-local guest session tracking**

- [ ] **Step 3: Implement one-time guest-to-account migration**

The migration must be resumable and must not create duplicate entries.

- [ ] **Step 4: Add e2e coverage for migration**

Run: `cd web && npx playwright test web/tests/e2e/guest-migration.spec.ts`
Expected: guest notes appear in account scope after migration with correct state labels.

### Task 10: Implement Convex schema and remote note persistence

**Files:**
- Create: `web/convex/schema.ts`
- Create: `web/convex/entries.ts`
- Create: `web/convex/storage.ts`
- Modify: `web/src/features/entries/`
- Test: `web/tests/unit/entry-sync.test.ts`

- [ ] **Step 1: Define tables for entries and optional audio attachments**

- [ ] **Step 2: Add mutations and queries for create, update, list, and delete**

- [ ] **Step 3: Wire local notes into explicit sync states**

- [ ] **Step 4: Add unit tests for local-to-remote sync rules**

Run: `cd web && npm run test -- entry-sync`
Expected: sync never destroys newer local state.

### Task 11: Implement search over saved notes

**Files:**
- Create: `web/convex/search.ts`
- Create: `web/src/features/search/SearchScreen.tsx`
- Modify: `web/src/routes/recent.tsx`
- Test: `web/tests/e2e/search.spec.ts`

- [ ] **Step 1: Add full-text search index over title and transcript**

- [ ] **Step 2: Build a simple search screen with clear empty states**

- [ ] **Step 3: Ensure search scope matches actual retained data**

- [ ] **Step 4: Add e2e coverage for post-save retrieval**

Run: `cd web && npx playwright test web/tests/e2e/search.spec.ts`
Expected: saved remote notes are searchable by title and transcript content.

### Task 12: Implement trust controls, export, and delete

**Files:**
- Create: `web/src/features/settings/PrivacySettings.tsx`
- Create: `web/src/features/settings/ExportActions.tsx`
- Modify: `web/src/routes/settings.tsx`
- Modify: `web/convex/entries.ts`
- Test: `web/tests/e2e/privacy-controls.spec.ts`

- [ ] **Step 1: Add settings UI for retention and account actions**

- [ ] **Step 2: Implement note delete and audio-only delete semantics**

- [ ] **Step 3: Implement export behavior**

- [ ] **Step 4: Add e2e coverage for delete/export correctness**

Run: `cd web && npx playwright test web/tests/e2e/privacy-controls.spec.ts`
Expected: deleted notes disappear from retrieval and exported notes include retained data correctly.

### Task 13: Implement accessibility and support affordances

**Files:**
- Modify: `web/src/routes/index.tsx`
- Modify: `web/src/features/capture/CaptureScreen.tsx`
- Modify: `web/src/routes/note/$noteId.tsx`
- Test: `web/tests/e2e/accessibility.spec.ts`

- [ ] **Step 1: Add keyboard and screen reader affordances to all primary actions**

- [ ] **Step 2: Ensure every recording and sync state has textual feedback**

- [ ] **Step 3: Add support/help entry points on settings and distress-sensitive surfaces**

- [ ] **Step 4: Add e2e checks for accessible primary flows**

Run: `cd web && npx playwright test web/tests/e2e/accessibility.spec.ts`
Expected: primary flows remain usable without relying on voice or color alone.

### Task 14: Add installable PWA basics

**Files:**
- Create: `web/public/manifest.webmanifest`
- Create: `web/public/icons/`
- Modify: `web/src/routes/__root.tsx`
- Test: `web/tests/e2e/pwa-basics.spec.ts`

- [ ] **Step 1: Add manifest and icons**

- [ ] **Step 2: Wire root metadata for installability**

- [ ] **Step 3: Verify install prompt prerequisites on supported platforms**

- [ ] **Step 4: Add a smoke test for manifest availability**

Run: `cd web && npx playwright test web/tests/e2e/pwa-basics.spec.ts`
Expected: manifest is served correctly and install prerequisites are present.

## Final Verification For Milestone 1

### Task 15: Run the proof-of-concept verification suite

**Files:**
- Test: `web/tests/unit/`
- Test: `web/tests/e2e/`

- [ ] **Step 1: Run unit tests**

Run: `cd web && npm run test`
Expected: all unit tests pass.

- [ ] **Step 2: Run Milestone 1 e2e tests**

Run: `cd web && npx playwright test web/tests/e2e/manual-note-flow.spec.ts web/tests/e2e/permission-denied-flow.spec.ts web/tests/e2e/voice-note-flow.spec.ts web/tests/e2e/recovery-flow.spec.ts`
Expected: guest text, permission denial fallback, guest voice, and recovery flows all pass.

- [ ] **Step 3: Run production build**

Run: `cd web && npm run build`
Expected: production build succeeds.

- [ ] **Step 4: Manual gate check against docs**

Verify implementation against:

- `docs/specs/notes-app-core-mvp.md`
- `docs/specs/notes-app-trust-recovery-contract.md`
- `docs/specs/notes-app-platform-contract.md`

Only after these checks pass is the Milestone 1 proof of concept complete.
