# Change Log

## 2026-04-01

- Code paths changed: `web/package.json`, `web/src/router.tsx`, `web/src/routes/**`, `web/src/features/capture/**`, `web/src/features/entries/**`, `web/src/lib/platform/**`, `web/tests/**`
- Docs updated: `docs/specs/notes-app-core-mvp.md`, `docs/specs/notes-app-platform-contract.md`, `docs/codebase-reference.md`, `docs/change-log.md`
- Impact: implemented a working Milestone 1 local-only proof of concept with IndexedDB-backed drafts, text and voice note flows, microphone-denied fallback, and local Recent/Drafts retrieval.

## 2026-04-02

- Code paths changed: `web/src/routes/note/$noteId.tsx`, `web/src/features/capture/CaptureScreen.tsx`, `web/src/features/entries/entryDraftController.ts`, `web/src/features/entries/localStore.ts`, `web/src/features/entries/storeContext.tsx`, `web/src/features/entries/index.ts`, `web/vitest.config.ts`, `web/playwright.config.ts`, `web/tests/unit/**`, `web/tests/e2e/**`
- Docs updated: `docs/codebase-reference.md`, `docs/change-log.md`
- Impact: fixed stale local-write races in the note route, made durable browser storage mandatory instead of silently volatile, added draft discard behavior, and committed regression coverage plus a Playwright discard smoke test.

## 2026-04-02

- Code paths changed: `web/src/features/entries/types.ts`, `web/src/features/entries/localStore.ts`, `web/src/lib/platform/indexedDb.ts`, `web/tests/unit/entryStore.test.ts`
- Docs updated: `docs/codebase-reference.md`, `docs/change-log.md`
- Impact: added durable local audio blob storage to the entry store, including cleanup of replaced or deleted retained audio attachments.

## 2026-04-02

- Code paths changed: `web/src/features/capture/CaptureScreen.tsx`, `web/tests/unit/captureScreen.test.tsx`, `web/tests/e2e/voice-discard.spec.ts`
- Docs updated: `docs/codebase-reference.md`, `docs/specs/notes-app-core-mvp.md`, `docs/change-log.md`
- Impact: aligned the retained-audio browser smoke with the live IndexedDB schema contract and replaced the misleading audio review loading copy with an explicit playback-unavailable state.

## 2026-04-02

- Code paths changed: `web/src/features/settings/exportLocalEntries.ts`, `web/src/features/entries/localStore.ts`, `web/src/features/capture/CaptureScreen.tsx`, `web/src/routes/note/$noteId.tsx`, `web/tests/unit/exportLocalEntries.test.ts`, `web/tests/unit/captureScreen.test.tsx`, `web/tests/e2e/voice-discard.spec.ts`
- Docs updated: `docs/codebase-reference.md`, `docs/change-log.md`
- Impact: added a schema-versioned local export serializer with retained-audio integrity checks, fixed memory-store blob cloning for export/test fidelity, and hardened retained-audio review so normal loads, missing-audio failures, and discard cleanup are all verified explicitly.

## 2026-04-02

- Code paths changed: `web/src/routes/settings.tsx`, `web/src/features/settings/SettingsScreen.tsx`, `web/tests/unit/settingsScreen.test.tsx`, `web/tests/e2e/privacy-controls.spec.ts`
- Docs updated: `docs/codebase-reference.md`, `docs/specs/notes-app-core-mvp.md`, `docs/change-log.md`
- Impact: turned Settings into a working local privacy surface with JSON export and full-device delete actions, plus browser coverage that proves exported notes include retained audio and delete clears local note data.

## 2026-04-03

- Code paths changed: `web/src/routes/note/$noteId.tsx`, `web/src/features/capture/CaptureScreen.tsx`, `web/tests/unit/captureScreen.test.tsx`, `web/tests/e2e/audio-only-delete.spec.ts`
- Docs updated: `docs/codebase-reference.md`, `docs/specs/notes-app-core-mvp.md`, `docs/change-log.md`
- Impact: added audio-only delete semantics for saved voice notes so retained raw audio can be removed without deleting the note transcript, and verified both UI state and IndexedDB cleanup in browser coverage.

## 2026-04-03

- Code paths changed: `web/src/features/entries/types.ts`, `web/src/features/entries/localStore.ts`, `web/src/features/settings/restoreLocalEntries.ts`, `web/src/features/settings/SettingsScreen.tsx`, `web/src/routes/settings.tsx`, `web/src/routes/note/$noteId.tsx`, `web/tests/unit/restoreLocalEntries.test.ts`, `web/tests/unit/settingsScreen.test.tsx`, `web/tests/unit/entryStore.test.ts`, `web/tests/e2e/import-recovery.spec.ts`, `web/tests/e2e/helpers/localEntryDb.ts`, `web/tests/e2e/audio-only-delete.spec.ts`, `web/tests/e2e/privacy-controls.spec.ts`, `web/tests/e2e/voice-discard.spec.ts`
- Docs updated: `docs/codebase-reference.md`, `docs/specs/notes-app-core-mvp.md`, `docs/change-log.md`
- Impact: added validated recovery-file restore with atomic local snapshot replacement, moved recorded-audio persistence onto the store's atomic save path, and consolidated browser storage seeding behind a shared Playwright harness while strengthening route-level audio-delete verification.
