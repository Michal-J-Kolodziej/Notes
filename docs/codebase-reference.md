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
- `web/src/features/ui/ConfirmationSheet.tsx`: shared in-app destructive confirmation sheet
- `web/src/features/pwa/AppPlatformEffects.tsx`: service-worker registration
- `web/src/features/pwa/useAppInstallPrompt.ts`: install-prompt detection and install-state routing
- `web/src/features/pwa/ConnectionStatusBanner.tsx`: offline visibility banner
- `web/src/features/entries/EntryListCard.tsx`: shared draft/recent list presentation

## Local Entry System

Implemented in:

- `web/src/features/entries/types.ts`
- `web/src/features/entries/selectors.ts`
- `web/src/features/entries/localStore.ts`
- `web/src/features/entries/storeMutationEvents.ts`
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
- Destructive local store mutations publish a best-effort cross-tab invalidation signal through `BroadcastChannel` with a `storage`-event fallback so other open tabs can refresh device data without reacting to every draft keystroke
- The IndexedDB database and store names are centralized in `indexedDb.ts` so runtime and browser smoke tests share one storage contract
- Core entry states include `draft_local`, `recording`, `processing`, `review_ready`, `saved_local`, and `needs_retry`
- Draft and recent list cards surface compact relative-time metadata plus an absolute timestamp title for quick mobile scanning

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
- Browser-native destructive confirms are replaced with an in-app confirmation sheet for stored-audio removal and rerecord replacement
- If rerecord setup or save fails, the existing retained audio stays attached to the note instead of being silently discarded
- If microphone access is denied or unavailable, the flow falls back to text mode
- Once a voice recording exists, the note workspace keeps the flow in voice mode instead of offering a switch back to text for that draft
- While stored-audio deletion is pending, editing, recording, save, and discard controls are disabled so conflicting local actions cannot race the storage-class change
- Unsaved drafts can be discarded from the note workspace, including after a voice-record flow
- If another tab deletes or replaces the current note, the note route exits stale editing state and renders an explicit unavailable-note recovery state instead of leaving the old editor on screen

## Settings And Privacy

Implemented in:

- `web/src/features/settings/exportLocalEntries.ts`
- `web/src/features/settings/SettingsScreen.tsx`
- `web/src/routes/settings.tsx`

Current behavior:

- The settings route exposes local export and full-device delete actions with explicit success or error notices
- The settings route also exposes recovery-file restore, which validates the full JSON export before replacing local notes and retained audio
- The settings route uses the shared in-app confirmation sheet for full-device delete and replacement restore actions instead of browser dialogs
- `exportLocalEntries.ts` builds a schema-versioned local export payload from the entry store
- `restoreLocalEntries.ts` preflights schema version, note shape, retained-audio integrity, duplicate ids, and base64 decoding before issuing one store-level replace operation
- Export payloads include retained audio as base64 plus MIME type and size metadata
- Export generation fails loudly if note metadata claims retained audio exists but the local blob is missing
- Restore succeeds only after the store swap completes and the route re-verifies restored entry/audio counts
- Full local delete clears drafts, saved notes, and retained audio from browser storage after confirmation
- Saved voice notes can remove retained audio without deleting the note itself
- Settings includes a support-resources section with official U.S. crisis and treatment links plus explicit copy that the app does not provide crisis care
- Invalid recovery files fail closed: the route surfaces the validation error and leaves existing local notes untouched
- Settings listens for foreign-tab storage mutations, closes pending destructive dialogs, and surfaces that the screen is now showing the latest local device state
- Settings includes install guidance for direct browser install prompts and manual iPhone/iPad Add to Home Screen flows

## Installability And Offline Shell

Implemented in:

- `web/public/site.webmanifest`
- `web/public/sw.js`
- `web/src/features/pwa/AppPlatformEffects.tsx`
- `web/src/features/pwa/useAppInstallPrompt.ts`
- `web/src/features/pwa/ConnectionStatusBanner.tsx`
- `web/src/features/capture/HomeScreen.tsx`

Current behavior:

- The root route registers a service worker that caches the app shell and same-origin static assets
- `AppPlatformEffects.tsx` also primes the current app assets into Cache Storage after service-worker readiness so the first offline reload has the shell JS and CSS it needs
- The manifest now exposes a concrete app name, start URL, scope, theme colors, and install metadata instead of placeholder values
- Home surfaces a restrained install card only when the browser fires a real `beforeinstallprompt` event
- Settings explains both prompt-driven install and manual Safari Add to Home Screen paths
- The app shows a sticky offline banner so local-first behavior stays explicit when the network drops

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
- `cd web && npm test -- tests/unit/storeMutationPublishing.test.ts`
- `cd web && ./node_modules/.bin/playwright test tests/e2e/audio-only-delete.spec.ts --project=chromium`
- `cd web && ./node_modules/.bin/playwright test tests/e2e/cross-tab-refresh.spec.ts --project=chromium`
- `cd web && ./node_modules/.bin/playwright test tests/e2e/import-recovery.spec.ts --project=chromium`
- `cd web && ./node_modules/.bin/playwright test tests/e2e/list-metadata.spec.ts --project=chromium`
- `cd web && ./node_modules/.bin/playwright test tests/e2e/pwa-basics.spec.ts --project=chromium`
- `cd web && ./node_modules/.bin/playwright test tests/e2e/replace-recording-failure.spec.ts --project=chromium`
- `cd web && ./node_modules/.bin/playwright test tests/e2e/voice-discard.spec.ts --project=chromium`
- `cd web && ./node_modules/.bin/playwright test tests/e2e/privacy-controls.spec.ts --project=chromium`
- `cd web && ./node_modules/.bin/playwright test --project=chromium --workers=1`

Current browser proof steps passed through Playwright automation:

- seed saved voice note -> edit note -> remove stored audio -> reload -> confirm transcript edits remain while retained audio row is cleared and metadata becomes transcript-only
- seed retained voice note -> attempt rerecord with microphone failure -> confirm the old retained audio and note content stay intact
- seed saved note -> delete all local notes from Settings in a second tab -> confirm Recent refreshes without manual reload
- open a note -> delete all local notes from Settings in a second tab -> confirm the editor is replaced by an explicit unavailable-note state
- seed draft and saved notes -> open Drafts and Recent -> confirm each card shows explicit relative-time metadata
- open Home -> confirm manifest metadata is concrete, service worker registers, and a synthetic browser install prompt reveals the install CTA
- open Home online -> go offline -> reload -> confirm the cached app shell still renders and the offline banner explains local notes still work
- seed notes -> export JSON recovery file -> add stale local note -> restore snapshot with in-app replacement confirm -> confirm retained audio plus Recent/Drafts content return while stale local data is removed
- seed saved note -> try restoring malformed JSON -> confirm Settings shows the validation error and the existing note still appears in Recent
- seed retained voice note -> open review -> confirm local playback control -> discard -> reload -> confirm no draft remains in Drafts or Recent
- seed saved and draft local notes -> export JSON recovery file -> delete all local notes -> confirm retained audio, Drafts, and Recent are cleared
