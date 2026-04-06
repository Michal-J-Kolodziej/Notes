# Change Log

## 2026-04-04

- Code paths changed: `docs/app-overview.md`, `docs/codebase-reference.md`, `docs/specs/notes-app-platform-contract.md`, `docs/change-log.md`, `web/convex/README.md`
- Docs updated: `docs/app-overview.md`, `docs/codebase-reference.md`, `docs/specs/notes-app-platform-contract.md`, `docs/change-log.md`, `web/convex/README.md`
- Impact: updated the live operational docs to use Bun and bunx as the active package-manager/runtime surface where the app actually runs, and left archived plans untouched.

- Code paths changed: `web/playwright.config.ts`, `web/tests/e2e/pwa-basics.spec.ts`, `docs/app-overview.md`, `docs/codebase-reference.md`, `docs/change-log.md`
- Docs updated: `docs/app-overview.md`, `docs/codebase-reference.md`, `docs/change-log.md`
- Impact: kept Playwright on Bun-driven `vite preview` for the stable browser lane, moved the build step into the Bun `test:e2e` script so the managed preview server only has to serve built assets, blocked service workers by default outside the dedicated PWA spec, made the offline PWA smoke wait for the actual cached shell rather than the server-rendered Home heading alone, and aligned the live Bun runbook to use `bun run test` instead of the incompatible `bun test` shorthand.

- Code paths changed: `web/convex/migrations.ts`, `web/src/features/settings/accountSnapshots.ts`, `web/src/features/settings/accountCopySnapshots.ts`, `web/src/routes/settings.tsx`, `web/src/features/settings/SettingsScreen.tsx`, `web/tests/unit/accountCopyRestore.test.ts`, `web/tests/unit/accountCopySnapshots.test.ts`, `web/tests/unit/accountSnapshots.test.ts`, `web/tests/unit/settingsScreen.test.tsx`
- Docs updated: `docs/codebase-reference.md`, `docs/specs/notes-app-core-mvp.md`, `docs/specs/notes-app-platform-contract.md`, `docs/change-log.md`
- Impact: completed the empty-device restore picker for copied account snapshots from other device sessions in the same signed-in account, exposed snapshot provenance and recent-note previews in Settings, and aligned the backend snapshot-list contract so restore gating stays explicit and type-safe.

- Code paths changed: `web/convex/migrations.ts`, `web/convex/myFunctions.ts`, `web/convex/schema.ts`, `web/src/features/settings/accountCopyRestore.ts`, `web/src/features/settings/accountCopyVerification.ts`, `web/src/features/settings/accountMigration.ts`, `web/src/features/settings/exportLocalEntries.ts`, `web/src/features/settings/restoreLocalEntries.ts`, `web/src/features/settings/SettingsScreen.tsx`, `web/src/routes/settings.tsx`, `web/tests/unit/accountCopyRestore.test.ts`, `web/tests/unit/accountCopyVerification.test.ts`, `web/tests/unit/restoreLocalEntries.test.ts`, `web/tests/unit/settingsScreen.test.tsx`
- Docs updated: `docs/codebase-reference.md`, `docs/specs/notes-app-core-mvp.md`, `docs/specs/notes-app-platform-contract.md`, `docs/change-log.md`
- Impact: added same-device restore from the verified account copy when local notes are empty, preserved stable local ids inside newly uploaded account copies, introduced a dedicated restore snapshot query for the active account plus device session, and made both recovery-file restore and account-copy restore roll back to the previous local snapshot if post-restore verification fails.

- Code paths changed: `web/convex/migrations.ts`, `web/eslint.config.mjs`, `web/public/sw.js`, `web/src/features/entries/localStore.ts`, `web/src/features/pwa/AppPlatformEffects.tsx`, `web/src/features/pwa/ConnectionStatusBanner.tsx`, `web/src/features/pwa/useAppInstallPrompt.ts`, `web/src/features/settings/accountCopyVerification.ts`, `web/src/features/settings/SettingsScreen.tsx`, `web/src/features/settings/restoreLocalEntries.ts`, `web/src/routes/settings.tsx`, `web/tests/e2e/recording-timer.spec.ts`, `web/tests/e2e/replace-recording-failure.spec.ts`, `web/tests/e2e/voice-permission-disclosure.spec.ts`, `web/tests/unit/accountCopyVerification.test.ts`, `web/tests/unit/connectionStatusBanner.test.tsx`, `web/tests/unit/entryDraftController.test.ts`, `web/tests/unit/removeStoredAudioFromEntry.test.ts`, `web/tests/unit/storeContext.test.tsx`
- Docs updated: `docs/codebase-reference.md`, `docs/specs/notes-app-core-mvp.md`, `docs/change-log.md`
- Impact: completed the verified account-copy surface in Settings with preview/delete wiring, fixed the SSR offline-banner false positive, confirmed offline PWA reload now rehydrates back to the interactive Home route, and reduced the repo from a broken lint baseline to a fully green `bun run lint`.

- Code paths changed: `web/src/features/pwa/AppPlatformEffects.tsx`, `web/public/sw.js`, `web/playwright.config.ts`
- Docs updated: `docs/codebase-reference.md`, `docs/change-log.md`
- Impact: switched Playwright to a built preview server because the dev-server bootstrap was not stable under Playwright-managed startup, and hardened cache priming so same-origin app assets are cached individually instead of letting one failing URL abort the whole pass. Offline reload still only restores the cached shell plus offline banner, so fully interactive offline home recovery remains an explicit gap.

- Code paths changed: `web/convex/schema.ts`, `web/convex/migrations.ts`, `web/convex/myFunctions.ts`, `web/src/features/settings/accountMigration.ts`, `web/src/features/settings/accountCopyVerification.ts`, `web/src/features/settings/localDataSummary.ts`, `web/src/features/settings/SettingsScreen.tsx`, `web/src/routes/settings.tsx`, `web/src/lib/auth/clerkConfig.ts`, `web/src/lib/auth/clerkRuntime.tsx`, `web/src/lib/auth/remoteAccountPreparation.ts`, `web/src/lib/auth/sessionContext.tsx`, `web/tests/unit/accountCopyVerification.test.ts`, `web/tests/unit/accountMigration.test.ts`, `web/tests/unit/appSessionContext.test.tsx`, `web/tests/unit/clerkRuntime.test.tsx`, `web/tests/unit/localDataSummary.test.ts`, `web/tests/unit/remoteAccountPreparation.test.ts`, `web/tests/unit/settingsScreen.test.tsx`, `web/tests/e2e/settings-summary.spec.ts`, `web/tests/e2e/privacy-controls.spec.ts`
- Docs updated: `docs/codebase-reference.md`, `docs/specs/notes-app-core-mvp.md`, `docs/specs/notes-app-platform-contract.md`, `docs/change-log.md`
- Impact: added verified readback for manual account-copy metadata in Settings, exposed retry for transient account-prep failures, hid the sign-in CTA when optional auth is only partially configured, and tightened the backend verification query to use per-user plus per-device-session indexes instead of broad account scans.

- Code paths changed: `web/convex/schema.ts`, `web/convex/myFunctions.ts`, `web/convex/migrations.ts`, `web/src/features/settings/accountMigration.ts`, `web/src/features/settings/localDataSummary.ts`, `web/src/features/settings/SettingsScreen.tsx`, `web/src/lib/auth/clerkRuntime.tsx`, `web/src/lib/auth/entryOwnership.ts`, `web/src/lib/auth/index.ts`, `web/src/lib/auth/remoteAccountPreparation.ts`, `web/src/routes/settings.tsx`, `web/src/routes/note/$noteId.tsx`, `web/tests/unit/accountMigration.test.ts`, `web/tests/unit/entryOwnership.test.ts`, `web/tests/unit/localDataSummary.test.ts`, `web/tests/unit/remoteAccountPreparation.test.ts`, `web/tests/unit/settingsScreen.test.tsx`
- Docs updated: `docs/codebase-reference.md`, `docs/specs/notes-app-core-mvp.md`, `docs/specs/notes-app-platform-contract.md`, `docs/change-log.md`
- Impact: added a Settings-only manual account-copy flow that uploads the current local note set and retained audio into the signed-in account through Convex, kept that flow explicit about not being live background sync, defaulted new notes into `account_local` ownership when an account-ready session exists, and cleared shared Convex auth after failed account-prep attempts.

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

## 2026-04-03

- Code paths changed: `web/src/features/ui/ConfirmationSheet.tsx`, `web/src/features/entries/removeStoredAudio.ts`, `web/src/features/entries/index.ts`, `web/src/routes/settings.tsx`, `web/src/routes/note/$noteId.tsx`, `web/src/features/settings/SettingsScreen.tsx`, `web/tests/unit/confirmationSheet.test.tsx`, `web/tests/unit/removeStoredAudioFromEntry.test.ts`, `web/tests/unit/settingsScreen.test.tsx`, `web/tests/e2e/audio-only-delete.spec.ts`, `web/tests/e2e/privacy-controls.spec.ts`, `web/tests/e2e/import-recovery.spec.ts`
- Docs updated: `docs/codebase-reference.md`, `docs/specs/notes-app-core-mvp.md`, `docs/change-log.md`
- Impact: replaced browser-native destructive confirms with an accessible in-app confirmation sheet, added direct logic coverage for stored-audio removal after queued edits, and exposed official support resources in Settings with explicit crisis-care disclaimers.

## 2026-04-03

- Code paths changed: `web/src/features/ui/ConfirmationSheet.tsx`, `web/src/routes/note/$noteId.tsx`, `web/tests/unit/confirmationSheet.test.tsx`, `web/tests/e2e/replace-recording-failure.spec.ts`
- Docs updated: `docs/codebase-reference.md`, `docs/change-log.md`
- Impact: fixed rerecord failure so the previous retained audio stays attached until a replacement is durably saved, and tightened the confirmation sheet so keyboard focus stays inside the modal and returns to the triggering control on close.

## 2026-04-03

- Code paths changed: `web/src/features/entries/storeMutationEvents.ts`, `web/src/features/entries/localStore.ts`, `web/src/features/entries/index.ts`, `web/src/routes/drafts.tsx`, `web/src/routes/recent.tsx`, `web/src/routes/settings.tsx`, `web/src/routes/note/$noteId.tsx`, `web/tests/unit/storeMutationPublishing.test.ts`, `web/tests/e2e/cross-tab-refresh.spec.ts`, `web/tests/e2e/import-recovery.spec.ts`
- Docs updated: `docs/codebase-reference.md`, `docs/specs/notes-app-core-mvp.md`, `docs/change-log.md`
- Impact: narrowed cross-tab invalidation to destructive local changes so other tabs refresh after delete or restore without reloading on every draft save, replaced stale open-note editors with an explicit unavailable-note state after foreign delete or restore, and locked recovery import failures to fail closed without replacing current local notes.

## 2026-04-03

- Code paths changed: `web/public/site.webmanifest`, `web/public/sw.js`, `web/src/features/pwa/AppPlatformEffects.tsx`, `web/src/features/pwa/useAppInstallPrompt.ts`, `web/src/features/pwa/ConnectionStatusBanner.tsx`, `web/src/features/capture/HomeScreen.tsx`, `web/src/features/settings/SettingsScreen.tsx`, `web/src/routes/__root.tsx`, `web/src/routes/index.tsx`, `web/src/routes/settings.tsx`, `web/src/features/entries/EntryListCard.tsx`, `web/src/features/entries/index.ts`, `web/src/routes/drafts.tsx`, `web/src/routes/recent.tsx`, `web/tests/unit/entryListCard.test.tsx`, `web/tests/e2e/pwa-basics.spec.ts`, `web/tests/e2e/list-metadata.spec.ts`
- Docs updated: `docs/codebase-reference.md`, `docs/specs/notes-app-core-mvp.md`, `docs/change-log.md`
- Impact: added real installability basics with concrete manifest metadata, service-worker registration, cached offline shell reload, Home install CTA exposure, and manual iPhone/iPad install guidance, while also adding explicit relative-time metadata to Drafts and Recent so retrieval is faster to scan on mobile.

## 2026-04-03

- Code paths changed: `web/src/lib/auth/remoteGuestRegistration.ts`, `web/src/lib/auth/sessionContext.tsx`, `web/src/lib/auth/index.ts`, `web/tests/unit/appSessionContext.test.tsx`, `web/tests/unit/remoteGuestRegistration.test.ts`
- Docs updated: `docs/codebase-reference.md`, `docs/specs/notes-app-core-mvp.md`, `docs/specs/notes-app-platform-contract.md`, `docs/change-log.md`
- Impact: added an optional live Convex boundary for durable guest-session registration, kept note data local-only, and made identity copy explicit about migration readiness versus actual cloud backup.

## 2026-04-03

- Code paths changed: `web/src/lib/auth/guestSession.ts`, `web/src/lib/auth/remoteGuestRegistration.ts`, `web/src/lib/auth/sessionContext.tsx`, `web/convex/identity.ts`, `web/tests/unit/guestSession.test.ts`, `web/tests/unit/remoteGuestRegistration.test.ts`, `web/tests/unit/appSessionContext.test.tsx`, `web/tests/unit/app-shell.test.tsx`, `web/tests/unit/settingsScreen.test.tsx`
- Docs updated: `docs/codebase-reference.md`, `docs/specs/notes-app-core-mvp.md`, `docs/specs/notes-app-platform-contract.md`, `docs/change-log.md`
- Impact: hardened guest identity against malformed or empty stored session payloads, bounded backend guest-session registration with an explicit timeout failure state, and prevented backend identity from claiming account ownership before a real user record exists.

## 2026-04-03

- Code paths changed: `web/src/routes/search.tsx`, `web/src/features/entries/selectors.ts`, `web/src/features/entries/index.ts`, `web/src/routes/recent.tsx`, `web/src/routes/drafts.tsx`, `web/src/features/capture/HomeScreen.tsx`, `web/tests/unit/entrySearch.test.ts`, `web/tests/e2e/local-search.spec.ts`
- Docs updated: `docs/codebase-reference.md`, `docs/specs/notes-app-core-mvp.md`, `docs/specs/notes-app-platform-contract.md`, `docs/change-log.md`
- Impact: added an explicit local-only search surface for retrieval, including text-only search over note titles and transcripts, search scopes for all/saved/drafts, and browser coverage that locks the route to honest on-device search behavior.

## 2026-04-04

- Code paths changed: `web/src/lib/auth/sessionContext.tsx`, `web/src/features/capture/HomeScreen.tsx`, `web/src/features/settings/SettingsScreen.tsx`, `web/src/lib/auth/clerkConfig.ts`, `web/src/lib/auth/clerkRuntime.tsx`, `web/src/lib/auth/index.ts`, `web/src/routes/__root.tsx`, `web/src/start.ts`, `web/tests/unit/appSessionContext.test.tsx`, `web/tests/unit/app-shell.test.tsx`, `web/tests/unit/settingsScreen.test.tsx`, `web/tests/unit/clerkRuntime.test.tsx`
- Docs updated: `docs/codebase-reference.md`, `docs/specs/notes-app-core-mvp.md`, `docs/specs/notes-app-platform-contract.md`, `docs/change-log.md`
- Impact: broadened session summaries for future account-ready state, added passive account-control slots in Home and Settings, and introduced an env-gated Clerk middleware/provider foundation for TanStack Start without changing the current local-first product promise.

- Code paths changed: `web/src/lib/audio/recordingSupport.ts`, `web/src/routes/note/$noteId.tsx`, `web/tests/unit/recordingSupport.test.ts`, `web/tests/e2e/voice-unsupported-fallback.spec.ts`
- Docs updated: `docs/codebase-reference.md`, `docs/specs/notes-app-core-mvp.md`, `docs/specs/notes-app-platform-contract.md`, `docs/change-log.md`
- Impact: hardened voice capture by choosing a supported recording format when possible and falling back to manual text capture with explicit notice when the browser cannot start voice recording safely.

## 2026-04-04

- Code paths changed: `web/src/features/settings/localDataSummary.ts`, `web/src/features/settings/SettingsScreen.tsx`, `web/src/routes/settings.tsx`, `web/tests/unit/localDataSummary.test.ts`, `web/tests/unit/settingsScreen.test.tsx`, `web/tests/e2e/settings-summary.spec.ts`
- Docs updated: `docs/codebase-reference.md`, `docs/specs/notes-app-core-mvp.md`, `docs/change-log.md`
- Impact: added a live device summary in Settings so users can see local note counts, retained-audio count, and app-owned storage size before exporting, restoring, or deleting on-device data.

## 2026-04-04

- Code paths changed: `web/src/lib/audio/voiceCaptureDisclosure.ts`, `web/src/routes/note/$noteId.tsx`, `web/src/features/capture/CaptureScreen.tsx`, `web/src/features/ui/ConfirmationSheet.tsx`, `web/tests/unit/voiceCaptureDisclosure.test.ts`, `web/tests/unit/captureScreen.test.tsx`, `web/tests/e2e/voice-permission-disclosure.spec.ts`, `web/tests/e2e/recording-timer.spec.ts`, `web/tests/e2e/voice-unsupported-fallback.spec.ts`, `web/tests/e2e/replace-recording-failure.spec.ts`
- Docs updated: `docs/codebase-reference.md`, `docs/specs/notes-app-core-mvp.md`, `docs/specs/notes-app-platform-contract.md`, `docs/change-log.md`
- Impact: added a first-run microphone disclosure before browser permission is requested, remembered that disclosure per browser profile when possible, and made live recording duration visible in the voice-note workspace.

## 2026-04-04

- Code paths changed: `web/src/routes/note/$noteId.tsx`, `web/src/features/capture/CaptureScreen.tsx`, `web/tests/unit/captureScreen.test.tsx`, `web/tests/e2e/recording-timer.spec.ts`, `web/tests/e2e/voice-permission-disclosure.spec.ts`
- Docs updated: `docs/codebase-reference.md`, `docs/specs/notes-app-core-mvp.md`, `docs/change-log.md`
- Impact: added a live recording timer plus explicit pre-permission microphone disclosure to the voice note workspace so the recording state and local-retention boundary are visible before capture starts.

## 2026-04-04

- Code paths changed: `web/src/routes/note/$noteId.tsx`, `web/src/features/capture/CaptureScreen.tsx`, `web/src/routes/recent.tsx`, `web/tests/unit/captureScreen.test.tsx`, `web/tests/e2e/delete-saved-note.spec.ts`
- Docs updated: `docs/codebase-reference.md`, `docs/specs/notes-app-core-mvp.md`, `docs/change-log.md`
- Impact: added single-note delete for saved notes from the note workspace, kept retained-audio cleanup on the existing store delete path, and removed remaining prototype-style UI copy from the live retrieval and capture surfaces.

## 2026-04-04

- Code paths changed: `web/src/features/entries/noteEditorPresence.ts`, `web/src/features/entries/index.ts`, `web/src/routes/note/$noteId.tsx`, `web/src/features/capture/CaptureScreen.tsx`, `web/tests/unit/captureScreen.test.tsx`, `web/tests/e2e/same-note-presence.spec.ts`
- Docs updated: `docs/codebase-reference.md`, `docs/specs/notes-app-core-mvp.md`, `docs/change-log.md`
- Impact: added a same-note multi-tab warning based on per-note editor presence heartbeats so the app no longer silently implies that simultaneous local editing in two tabs is safe.
