# Codebase Reference

Last updated: April 4, 2026

## Purpose

This file documents the current implemented behavior of the codebase, not the full product ambition.

## Current App Location

- Frontend application: `web/`
- Product and architecture docs: `docs/specs/`

## Runtime Shape

The current implementation is a Milestone 1 local-first proof of concept.

- `web/src/router.tsx`: local-first TanStack router
- `web/src/start.ts`: TanStack Start request middleware with env-gated Clerk activation
- `web/src/routes/__root.tsx`: root document, optional Clerk provider shell, guest-session provider, and local entry-store provider
- `web/src/routes/index.tsx`: home route
- `web/src/routes/note/$noteId.tsx`: note creation, review, voice/text capture, and local save flow
- `web/src/routes/drafts.tsx`: local draft list
- `web/src/routes/recent.tsx`: locally saved note list
- `web/src/routes/search.tsx`: device-local note search across titles and transcripts
- `web/src/routes/settings.tsx`: local privacy, export, restore, and delete controls
- `web/src/lib/auth/guestSession.ts`: device-local guest-session creation and storage fallback
- `web/src/lib/auth/clerkConfig.ts`: shared client/server env gate for optional Clerk wiring
- `web/src/lib/auth/clerkRuntime.tsx`: optional Clerk provider wrapper for public builds that explicitly enable auth
- `web/src/lib/auth/entryOwnership.ts`: new-note ownership defaults for guest versus account-ready sessions
- `web/src/lib/auth/sessionContext.tsx`: guest-session runtime state and summary copy
- `web/src/lib/auth/remoteGuestRegistration.ts`: optional Convex-backed guest-session registration
- `web/src/features/settings/accountMigration.ts`: explicit manual account-copy orchestration from local storage into Convex
- `web/src/features/settings/accountSnapshots.ts`: remote snapshot summary loader for copied account snapshots
- `web/src/features/settings/accountCopySnapshots.ts`: account-snapshot provenance shaping for current versus other device sessions
- `web/src/features/settings/accountCopyVerification.ts`: verified account-copy readback state for the current device session
- `web/src/lib/audio/voiceCaptureDisclosure.ts`: one-time voice-capture disclosure persistence
- `web/src/features/ui/ConfirmationSheet.tsx`: shared in-app destructive confirmation sheet
- `web/src/features/pwa/AppPlatformEffects.tsx`: service-worker registration
- `web/src/features/pwa/useAppInstallPrompt.ts`: install-prompt detection and install-state routing
- `web/src/features/pwa/ConnectionStatusBanner.tsx`: offline visibility banner
- `web/src/features/entries/EntryListCard.tsx`: shared draft/recent list presentation
- `web/convex/schema.ts`: backend ownership, migration, and entry schema foundation
- `web/convex/identity.ts`: backend identity query and guest-session registration mutation
- `web/convex/migrations.ts`: authenticated manual account-copy mutations and Convex upload-url issuance

## Identity And Backend Foundation

Implemented in:

- `web/src/lib/auth/guestSession.ts`
- `web/src/lib/auth/clerkConfig.ts`
- `web/src/lib/auth/clerkRuntime.tsx`
- `web/src/lib/auth/sessionContext.tsx`
- `web/src/lib/auth/remoteGuestRegistration.ts`
- `web/convex/schema.ts`
- `web/convex/identity.ts`

Current behavior:

- The app creates one guest session per browser profile and stores it in `localStorage` when durable browser storage is available
- If the stored guest-session payload is syntactically invalid, structurally invalid, or carries an empty session id, the app replaces it with a fresh durable guest session instead of getting stuck in temporary mode
- If browser storage is blocked, the session layer falls back to an in-memory guest session for the current tab lifecycle only
- Home and Settings surface explicit guest-mode copy so the user is not misled about backup or account ownership
- Home and Settings also surface a glanceable identity-status chip such as `Local only`, `Migration ready`, or `Cloud prep unavailable`
- `sessionContext.tsx` now also supports an account-ready summary shape for future authenticated runtime wiring, but the current app still defaults to guest-first local use unless later auth work is enabled and connected
- If `VITE_CONVEX_URL` is configured and the guest session is durable, the session provider registers that guest session with Convex through `registerGuestSession`
- Guest backend registration is explicitly guarded to durable guest sessions only; account-shaped session state cannot be routed through the guest-registration effect
- Backend registration is timeout-bounded and fails closed into `Cloud prep unavailable` instead of leaving the session in an indeterminate syncing state
- Successful backend registration only prepares future ownership migration metadata; it does not upload notes, audio, or transcripts
- If backend registration is unavailable, the app keeps the session local-only and explains that future migration is not prepared yet
- `viewerIdentity` now returns `account_pending` until an authenticated identity also has a real `users` row, so backend callers are not told they have account ownership without a valid owner id
- The runtime boot path now includes an env-gated Clerk foundation: `src/start.ts` only mounts `clerkMiddleware()` when `VITE_ENABLE_OPTIONAL_AUTH=1`, a publishable key exists, and `CLERK_SECRET_KEY` exists; `__root.tsx` only mounts `<ClerkProvider>` when the public flag and publishable key exist
- When optional auth is enabled, Settings only exposes the sign-in CTA when account preparation is honestly possible in this build; otherwise it shows that account copy is not configured yet instead of inviting a misleading sign-in flow
- `remoteAccountPreparation.ts` now clears shared Convex auth on backend failure or timeout so account-prep errors do not leave a stale authenticated client attached to later guest-session work
- Settings now exposes an explicit manual account-copy flow for account-ready sessions: local notes and retained audio can be uploaded into the signed-in account through Convex mutations plus file storage upload URLs
- That account copy is intentionally explicit and manual. The live UI does not promise live background sync, account-backed search, or cross-device retrieval yet
- The current runtime still does not query remote note content from Convex, but Settings can now read back verified account-copy metadata for the current device session so the user can see whether the last manual upload is confirmed, stale, or unavailable
- Settings now also reads back a small preview of the latest copied note titles for the current device session and exposes a destructive action to remove that copied account snapshot without touching the local notes on the device
- Settings can now also list copied snapshots from other device sessions in the same signed-in account, including copy time, note counts, retained-audio counts, and preview titles
- When this device is empty, Settings can restore from one of those other copied account snapshots through an explicit confirmation step; this remains a manual recovery path, not live sync or full remote browsing
- `sessionContext.tsx` exposes a retry control for transient `account_pending` failures so Settings can restart account preparation without forcing reload or sign-out
- `convex/migrations.ts` now scopes account-copy verification reads through per-user plus per-guest-session indexes instead of collecting all account rows and filtering in memory

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
- Local entry ownership can now be `guest_local` or `account_local`, and new notes created while the app has an account-ready session default into `account_local` ownership on-device
- The local entry store supports atomic full-snapshot replacement for recovery-file restore and cleans up stale retained-audio rows by stored file id, not only by healthy metadata
- Destructive local store mutations publish a best-effort cross-tab invalidation signal through `BroadcastChannel` with a `storage`-event fallback so other open tabs can refresh device data without reacting to every draft keystroke
- The IndexedDB database and store names are centralized in `indexedDb.ts` so runtime and browser smoke tests share one storage contract
- Core entry states include `draft_local`, `recording`, `processing`, `review_ready`, `saved_local`, and `needs_retry`
- Draft and recent list cards surface compact relative-time metadata plus an absolute timestamp title for quick mobile scanning
- `search.tsx` filters titles and transcripts on-device with `all`, `saved`, and `drafts` scopes while keeping the same card format as Recent and Drafts

## Voice Capture

Implemented in:

- `web/src/features/capture/CaptureScreen.tsx`
- `web/src/routes/note/$noteId.tsx`

Current behavior:

- Voice mode requests `getUserMedia`
- The capture workspace shows a live `mm:ss` timer while recording is active
- Before the first microphone request, the voice flow explains microphone use, local retention, and the lack of cloud backup from the live note workspace
- That disclosure is remembered per browser profile with `localStorage` when available, so later fresh voice-note starts on the same device profile do not re-show it
- The runtime chooses a preferred recording format with `MediaRecorder.isTypeSupported()` when the browser exposes support probing, and falls back to the browser default recorder only when support probing is unavailable
- On stop, the proof of concept saves a locally reviewable voice-note record
- Retained audio is persisted through the store's atomic `saveEntryWithAudio(...)` path and surfaced through native playback controls during review and on reopened saved notes
- If entry metadata says audio exists but the blob cannot be opened, the review UI shows an explicit playback-unavailable message instead of a permanent loading state
- Stored audio can be removed from a voice note while keeping the transcript note intact; the route waits for queued edits first, persists the metadata change non-optimistically, and only then flips the UI into transcript-only state
- Browser-native destructive confirms are replaced with an in-app confirmation sheet for stored-audio removal and rerecord replacement
- Saved notes can be deleted from the note workspace through the same in-app confirmation sheet, and entry deletion clears any retained audio owned by that note
- If rerecord setup or save fails, the existing retained audio stays attached to the note instead of being silently discarded
- If microphone access is denied or unavailable, the flow falls back to text mode
- If the browser cannot start voice capture safely, the route also falls back to text mode with an explicit unsupported-browser notice instead of leaving the user in a broken voice state
- Once a voice recording exists, the note workspace keeps the flow in voice mode instead of offering a switch back to text for that draft
- While stored-audio deletion is pending, editing, recording, save, and discard controls are disabled so conflicting local actions cannot race the storage-class change
- Unsaved drafts can be discarded from the note workspace, including after a voice-record flow
- If the same note is opened in two tabs on the same device, each workspace surfaces an explicit warning so the user knows local draft writes can conflict
- If another tab deletes or replaces the current note, the note route exits stale editing state and renders an explicit unavailable-note recovery state instead of leaving the old editor on screen

## Settings And Privacy

Implemented in:

- `web/src/features/settings/exportLocalEntries.ts`
- `web/src/features/settings/SettingsScreen.tsx`
- `web/src/routes/settings.tsx`

Current behavior:

- The settings route exposes local export and full-device delete actions with explicit success or error notices
- Settings now shows a live summary of app-owned local data on this device, including saved notes, drafts, retained audio count, and approximate app data size
- That live summary now also tracks total local entry count plus guest-owned versus account-owned local notes so the manual account-copy flow can explain what still needs to be uploaded
- The settings route also exposes recovery-file restore, which validates the full JSON export before replacing local notes and retained audio
- The settings route uses the shared in-app confirmation sheet for full-device delete and replacement restore actions instead of browser dialogs
- For account-ready sessions, Settings also exposes a confirmation-gated manual account-copy card that uploads the current local note set and retained audio into the signed-in account without implying background sync
- A successful manual account copy rewrites the local snapshot to `account_local` ownership, keeps retained audio on-device, and leaves future edits local-first until the user uploads again
- Settings now reads back a verified account-copy summary for the active device session and compares it against the current local snapshot so the UI can say `Verified`, `Needs upload`, `Recovery ready`, or `Verification unavailable` without pretending live sync exists
- When a verified account copy exists, Settings also shows a short preview of the latest copied note titles plus their latest copied timestamps
- When local notes are empty on this device and the signed-in account still has a copied snapshot for the same device session, Settings now exposes a confirmation-gated `Restore from account copy` action that repopulates the device from that verified snapshot without implying cross-device sync
- Settings also exposes a separate `Other account snapshots` section for copied snapshots from other device sessions in the same account, with provenance chips and recent-note previews before the user restores one onto an empty device
- Settings now exposes a confirmation-gated `Delete account copy` action that removes the current device snapshot from the signed-in account while leaving local notes and retained audio untouched on the device
- Transient account-prep failures now expose an explicit retry action in Settings, while partially configured optional auth hides the sign-in CTA instead of suggesting account copy is ready when it is not
- `exportLocalEntries.ts` builds a schema-versioned local export payload from the entry store
- `restoreLocalEntries.ts` preflights schema version, note shape, retained-audio integrity, duplicate ids, and base64 decoding before issuing one store-level replace operation
- `accountCopyRestore.ts` fetches a dedicated restore snapshot for `user + guestSessionId`, downloads retained audio first, then reuses the validated local recovery path instead of inventing a weaker restore path
- The Convex account-copy path now persists original local entry ids plus retained-audio ids alongside the copied snapshot so same-device recovery can round-trip stable local identifiers when that metadata exists
- Export payloads include retained audio as base64 plus MIME type and size metadata
- Export generation fails loudly if note metadata claims retained audio exists but the local blob is missing
- Restore succeeds only after the store swap completes and the route re-verifies restored entry/audio counts
- If post-restore verification fails, the restore helper now rolls the device back to the pre-restore local snapshot instead of leaving half-trusted local state behind
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
- `AppPlatformEffects.tsx` also primes DOM-linked and performance-observed same-origin assets into Cache Storage after service-worker readiness, and now caches those URLs one-by-one so a single bad asset URL cannot abort the entire priming pass
- The manifest now exposes a concrete app name, start URL, scope, theme colors, and install metadata instead of placeholder values
- Home surfaces a restrained install card only when the browser fires a real `beforeinstallprompt` event
- Settings explains both prompt-driven install and manual Safari Add to Home Screen paths
- The app shows a sticky offline banner so local-first behavior stays explicit when the network drops
- Offline reload now restores the cached shell, rehydrates the app, and returns to the interactive Home screen while the offline banner keeps local-first behavior explicit

## Styling

Implemented in:

- `web/src/styles/app.css`

Behavior:

- mobile-first single-column shell
- warm serif-driven visual system
- capture-first home screen with minimal chrome

## Verification Commands

Current verified commands:

- Recent workspace status: `cd web && bun run test`, `cd web && bun run build`, `cd web && bun run lint`, and the full Chromium E2E suite all pass.

- `cd web && bun run build`
- `cd web && bun run lint`
- `cd web && bun run test`
- `cd web && bunx eslint convex/auth.config.ts convex/identity.ts convex/migrations.ts convex/myFunctions.ts convex/schema.ts src/features/settings/accountMigration.ts src/features/settings/accountCopyVerification.ts src/features/settings/localDataSummary.ts src/features/settings/SettingsScreen.tsx src/lib/auth/clerkConfig.ts src/lib/auth/clerkRuntime.tsx src/lib/auth/entryOwnership.ts src/lib/auth/remoteAccountPreparation.ts src/lib/auth/sessionContext.tsx src/routes/note/$noteId.tsx src/routes/settings.tsx tests/unit/accountCopyVerification.test.ts tests/unit/accountMigration.test.ts tests/unit/appSessionContext.test.tsx tests/unit/clerkRuntime.test.tsx tests/unit/entryOwnership.test.ts tests/unit/localDataSummary.test.ts tests/unit/remoteAccountPreparation.test.ts tests/unit/settingsScreen.test.tsx`
- `cd web && bun run test -- tests/unit/guestSession.test.ts tests/unit/remoteGuestRegistration.test.ts tests/unit/appSessionContext.test.tsx`
- `cd web && bun run test -- tests/unit/accountCopyVerification.test.ts tests/unit/accountMigration.test.ts tests/unit/appSessionContext.test.tsx tests/unit/clerkRuntime.test.tsx tests/unit/settingsScreen.test.tsx`
- `cd web && bun run test -- tests/unit/recordingSupport.test.ts`
- `cd web && bun run test -- tests/unit/voiceCaptureDisclosure.test.ts`
- `cd web && bun run test -- tests/unit/localDataSummary.test.ts`
- `cd web && bun run test -- tests/unit/appSessionContext.test.tsx tests/unit/remoteGuestRegistration.test.ts`
- `cd web && bun run test -- tests/unit/storeMutationPublishing.test.ts`
- `cd web && bunx playwright test tests/e2e/audio-only-delete.spec.ts --project=chromium`
- `cd web && bunx playwright test tests/e2e/cross-tab-refresh.spec.ts --project=chromium`
- `cd web && bunx playwright test tests/e2e/import-recovery.spec.ts --project=chromium`
- `cd web && bunx playwright test tests/e2e/list-metadata.spec.ts --project=chromium`
- `cd web && bunx playwright test tests/e2e/local-search.spec.ts --project=chromium`
- `cd web && bunx playwright test tests/e2e/pwa-basics.spec.ts --project=chromium`
- `cd web && bunx playwright test tests/e2e/replace-recording-failure.spec.ts --project=chromium`
- `cd web && bunx playwright test tests/e2e/recording-timer.spec.ts --project=chromium`
- `cd web && bunx playwright test tests/e2e/settings-summary.spec.ts --project=chromium`
- `cd web && bunx playwright test tests/e2e/delete-saved-note.spec.ts --project=chromium`
- `cd web && bunx playwright test tests/e2e/voice-permission-disclosure.spec.ts --project=chromium`
- `cd web && bunx playwright test tests/e2e/voice-unsupported-fallback.spec.ts --project=chromium`
- `cd web && bunx playwright test tests/e2e/voice-discard.spec.ts --project=chromium`
- `cd web && bunx playwright test tests/e2e/privacy-controls.spec.ts --project=chromium`
- `cd web && bun run test:e2e -- --project=chromium --workers=1 --reporter=dot`
- `cd web && bunx playwright test --project=chromium --workers=1`

Current browser proof steps passed through Playwright automation:

- seed saved voice note -> edit note -> remove stored audio -> reload -> confirm transcript edits remain while retained audio row is cleared and metadata becomes transcript-only
- seed retained voice note -> attempt rerecord with microphone failure -> confirm the old retained audio and note content stay intact
- open a new voice note with `MediaRecorder` unavailable -> attempt to record -> confirm the route falls back to text mode with an explicit unsupported-browser notice
- seed saved, draft, and retained-audio notes -> open Settings -> confirm the device summary shows current saved, draft, retained-audio counts and local app data size
- seed saved note -> delete all local notes from Settings in a second tab -> confirm Recent refreshes without manual reload
- open a note -> delete all local notes from Settings in a second tab -> confirm the editor is replaced by an explicit unavailable-note state
- open the same note in two tabs -> confirm both workspaces warn that the note is already open elsewhere, then close one tab and confirm the warning clears
- seed draft and saved notes -> open Drafts and Recent -> confirm each card shows explicit relative-time metadata
- seed draft and saved notes -> open Search -> confirm the route only searches local title/transcript text, narrows results by scope, and does not imply retained audio search
- open a new voice note -> start recording -> confirm the note workspace shows a live elapsed timer while capture stays active
- open a new voice note -> confirm microphone-use and local-retention disclosure is visible before recording starts
- open Home -> confirm manifest metadata is concrete, service worker registers, and a synthetic browser install prompt reveals the install CTA
- open Home online -> go offline -> reload -> confirm the cached app shell rehydrates back to the interactive Home screen while the offline banner stays visible
- seed notes -> export JSON recovery file -> add stale local note -> restore snapshot with in-app replacement confirm -> confirm retained audio plus Recent/Drafts content return while stale local data is removed
- seed saved note -> try restoring malformed JSON -> confirm Settings shows the validation error and the existing note still appears in Recent
- seed retained voice note -> open review -> confirm local playback control -> discard -> reload -> confirm no draft remains in Drafts or Recent
- seed saved and draft local notes -> export JSON recovery file -> delete all local notes -> confirm retained audio, Drafts, and Recent are cleared
- create a saved note -> confirm note-level delete removes it from Recent and clears the current note workspace
