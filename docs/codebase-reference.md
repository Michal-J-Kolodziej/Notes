# Codebase Reference

Last updated: April 3, 2026

## Purpose

This file documents the current implemented behavior of the codebase, not the full product ambition.

## Current App Location

- Frontend application: `web/`
- Product and architecture docs: `docs/specs/`

## Runtime Shape

The current implementation is a Milestone 1 local-only proof of concept.

- `web/src/router.tsx`: local TanStack router without live Convex runtime wiring
- `web/src/routes/__root.tsx`: root document and local entry-store provider
- `web/src/routes/index.tsx`: home route
- `web/src/routes/note/$noteId.tsx`: note creation, review, voice/text capture, and local save flow
- `web/src/routes/drafts.tsx`: local draft list
- `web/src/routes/recent.tsx`: locally saved note list
- `web/src/routes/settings.tsx`: local privacy, export, restore, and delete controls

## Local Entry System

Implemented in:

- `web/src/features/entries/types.ts`
- `web/src/features/entries/selectors.ts`
- `web/src/features/entries/localStore.ts`
- `web/src/features/entries/entryDraftController.ts`
- `web/src/features/entries/storeContext.tsx`
- `web/src/lib/platform/indexedDb.ts`

Behavior:

- Durable local storage is required; the app does not silently fall back to a volatile in-memory store
- If IndexedDB is unavailable or cannot be opened, the root provider blocks note editing with an explicit storage-unavailable state
- `entryDraftController.ts` serializes local draft writes so overlapping note mutations do not overwrite newer content
- Draft deletion is queued behind pending local writes so an unsaved draft is not resurrected by earlier saves
- `entryDraftController.ts` exposes a queue flush primitive so trust-sensitive route actions can wait for prior draft writes before changing storage class
- The local entry store persists retained audio blobs alongside entry metadata in the same IndexedDB database
- The local entry store supports atomic full-snapshot replacement for recovery-file restore and cleans up stale retained-audio rows by stored file id, not only by healthy metadata
- The IndexedDB database and store names are centralized in `indexedDb.ts` so runtime and browser smoke tests share one storage contract
- Core entry states include `draft_local`, `recording`, `processing`, `review_ready`, `saved_local`, and `needs_retry`

## Voice Capture

Implemented in:

- `web/src/features/capture/CaptureScreen.tsx`
- `web/src/routes/note/$noteId.tsx`

Current behavior:

- Voice mode requests `getUserMedia`
- `MediaRecorder` is used when available
- On stop, the proof of concept saves a locally reviewable voice-note record
- Retained audio is persisted through the store's atomic `saveEntryWithAudio(...)` path and surfaced through native playback controls during review and on reopened saved notes
- If entry metadata says audio exists but the blob cannot be opened, the review UI shows an explicit playback-unavailable message instead of a permanent loading state
- Stored audio can be removed from a voice note while keeping the transcript note intact; the route waits for queued edits first, persists the metadata change non-optimistically, and only then flips the UI into transcript-only state
- If microphone access is denied or unavailable, the flow falls back to text mode
- Once a voice recording exists, the note workspace keeps the flow in voice mode instead of offering a switch back to text for that draft
- While stored-audio deletion is pending, editing, recording, save, and discard controls are disabled so conflicting local actions cannot race the storage-class change
- Unsaved drafts can be discarded from the note workspace, including after a voice-record flow

## Settings And Privacy

Implemented in:

- `web/src/features/settings/exportLocalEntries.ts`
- `web/src/features/settings/SettingsScreen.tsx`
- `web/src/routes/settings.tsx`

Current behavior:

- The settings route exposes local export and full-device delete actions with explicit success or error notices
- The settings route also exposes recovery-file restore, which validates the full JSON export before replacing local notes and retained audio
- `exportLocalEntries.ts` builds a schema-versioned local export payload from the entry store
- `restoreLocalEntries.ts` preflights schema version, note shape, retained-audio integrity, duplicate ids, and base64 decoding before issuing one store-level replace operation
- Export payloads include retained audio as base64 plus MIME type and size metadata
- Export generation fails loudly if note metadata claims retained audio exists but the local blob is missing
- Restore succeeds only after the store swap completes and the route re-verifies restored entry/audio counts
- Full local delete clears drafts, saved notes, and retained audio from browser storage after confirmation
- Saved voice notes can remove retained audio without deleting the note itself

## Styling

Implemented in:

- `web/src/styles/app.css`

Behavior:

- mobile-first single-column shell
- warm serif-driven visual system
- capture-first home screen with minimal chrome

## Verification Commands

Current verified commands:

- `cd web && npm run build`
- `cd web && npm test`
- `cd web && ./node_modules/.bin/playwright test tests/e2e/audio-only-delete.spec.ts --project=chromium`
- `cd web && ./node_modules/.bin/playwright test tests/e2e/import-recovery.spec.ts --project=chromium`
- `cd web && ./node_modules/.bin/playwright test tests/e2e/voice-discard.spec.ts --project=chromium`
- `cd web && ./node_modules/.bin/playwright test tests/e2e/privacy-controls.spec.ts --project=chromium`

Current browser proof steps passed through Playwright automation:

- seed saved voice note -> edit note -> remove stored audio -> reload -> confirm transcript edits remain while retained audio row is cleared and metadata becomes transcript-only
- seed notes -> export JSON recovery file -> delete all local notes -> restore that file -> confirm retained audio plus Recent/Drafts content return
- seed retained voice note -> open review -> confirm local playback control -> discard -> reload -> confirm no draft remains in Drafts or Recent
- seed saved and draft local notes -> export JSON recovery file -> delete all local notes -> confirm retained audio, Drafts, and Recent are cleared
