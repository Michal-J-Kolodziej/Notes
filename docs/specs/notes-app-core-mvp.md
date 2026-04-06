# Notes App Core MVP Contract

Last updated: April 4, 2026

## Current Implementation Status

Milestone 1 now has a working local proof of concept in `web/`.

Implemented:

- Local-only guest runtime
- Durable guest-session identity with explicit local-only ownership copy and optional backend registration for future migration prep
- Env-gated Clerk runtime foundation in TanStack Start plus a real Settings sign-in CTA only when account preparation is honestly available in the current build
- Guest-session hardening that replaces malformed or empty stored session ids instead of silently downgrading the user into temporary mode
- Manual text note creation, save, and retrieval
- Voice-note capture flow with visible recording timer, pre-permission microphone disclosure, processing, review, and saved-local states
- Retained local audio playback for voice notes during review and when reopening saved local notes
- Microphone-denied fallback into manual text entry
- Unsupported-browser voice capture fallback into manual text entry with an explicit notice
- IndexedDB-backed draft persistence with fail-closed storage gating when IndexedDB is unavailable
- Drafts and Recent screens backed by local persisted entries
- Saved notes can be deleted individually from the note workspace with retained-audio cleanup
- Local export and full-device delete controls in Settings
- Device-local data summary in Settings so export/delete actions are grounded in visible counts and app-owned storage size
- Recovery-file restore that replaces local notes from a validated exported snapshot
- Support-resources path in Settings with clear crisis-care disclaimer
- Audio-only delete semantics for stored voice-note audio while preserving the note transcript
- Cross-tab refresh for local delete or restore so stale Recent, Drafts, Settings, and note views do not keep pretending old device data still exists
- Same-note multi-tab warning so local editors do not silently imply safe simultaneous editing on one device
- Basic installability: concrete manifest, service-worker registration, cached shell reload, Home install prompt when supported, manual iPhone/iPad install guidance, and explicit offline-state messaging
- Relative last-updated metadata in Drafts and Recent for faster mobile retrieval
- Local on-device search over titles and note text with explicit scope chips and copy that retained audio is not searched
- Settings-only manual account copy that uploads the current local note set and retained audio into the signed-in account without claiming live sync
- Verified readback of manual account-copy metadata in Settings for the current device session, including preview rows for the latest copied notes, retry for transient account-prep failures, confirmation-gated deletion of the copied account snapshot without touching local notes on the device, same-device empty-device restore, and explicit restore from other copied account snapshots in the same signed-in account with rollback if verification fails
- New notes created while the app is in an account-ready session now default to `account_local` ownership on-device

Still intentionally deferred beyond the current local search:

- Continuous remote sync
- Remote search
- General remote note-content browsing and live cross-device retrieval surfaces
- Automatic or background cross-device recovery from the verified account copy

Current Milestone 1 constraint:

- Retained playback, export, restore, and deletion remain local-first. The app now supports explicit empty-device restore from copied account snapshots, but it still does not provide live account backup or background sync.
- When `VITE_CONVEX_URL` and optional Clerk auth are both configured, Settings can now manually copy the current local note set plus retained audio into the signed-in account through Convex.
- Settings can now read back verified snapshot metadata and a short note preview for that manual account copy, and can repopulate an empty local device from the copied snapshot for the same device session, but the web app still does not auto-upload later edits or expose general cross-device retrieval in the runtime.
- Settings can also restore an empty device from another copied device-session snapshot in the same signed-in account, but this is still an explicit one-shot recovery action with provenance, not a live synced library.
- The shipped UI still must not imply automatic backup before the user explicitly runs the Settings account-copy action.

## Purpose

This file defines the smallest shippable product behavior. If a feature or requirement is not in this file, it is not part of the Core MVP unless another contract explicitly makes it launch-critical.

## Core Loop

The product revolves around this loop:

`Open -> Capture -> Process -> Review -> Save -> Retrieve`

The loop must work for both voice and manual text entry.

## Core States

Every entry must be in one of these states:

- `draft_local`
- `recording`
- `processing`
- `review_ready`
- `saved_local`
- `syncing`
- `saved_remote`
- `needs_retry`

These states are product-facing, not just engineering internals. The UI must reveal them clearly.

## Core MVP Scope

### Included

- Guest-first local use on first open
- Voice capture in the foreground
- Manual text note capture
- Transcript review when transcription is available
- Simple title editing
- Save to local draft and local history
- Recent entries list
- Drafts list
- Local export and full-device delete controls
- Explicit Settings-only account copy into the signed-in account
- Explicit empty-device restore from copied account snapshots listed in Settings
- Recovery-file restore from a previously exported snapshot
- Support-resources path in Settings
- Audio-only delete for retained voice-note audio
- Single-note delete from the note workspace
- Clear retry for failed processing or sync

### Excluded

- Prompts
- Reminders
- Tags
- Mood tracking
- Rich text
- Attachments other than optional retained audio
- Collaboration
- Background account sync
- Cross-device note retrieval UI
- Live cross-device note library or ongoing sync UI

## Detailed Flow Contracts

### Flow A: First-run guest voice capture

1. User lands on home.
2. Home immediately shows a dominant capture action.
3. Before microphone permission is requested, the app explains:
   - why the mic is needed
   - whether audio may be sent to a provider
   - whether audio is stored after processing
   - whether that disclosure will be remembered on the current browser profile
4. User starts recording.
5. Recording state is obvious and cancelable.
6. User stops recording.
7. The entry is safe locally before any processing starts.
8. If transcription succeeds quickly, the user sees review-ready transcript text.
9. If transcription is delayed, the user sees a processing state, local audio review remains available, and the user can still save the entry.
10. The user can edit title and available transcript, then save.

### Flow B: Guest text fallback

1. User taps into manual text mode from home or after permission denial.
2. User creates a note without mic access.
3. Draft text autosaves locally while typing.
4. User can title and save the note.
5. Note appears in Recent immediately.

### Flow C: Permission denied

1. User attempts voice capture.
2. Browser denies or blocks microphone access.
3. App explains the failure in plain language.
4. App immediately offers manual text entry.
5. App does not trap the user in a dead end.

### Flow D: Delayed or failed transcription

1. User completes recording.
2. Processing begins.
3. If transcript is pending, the app keeps the entry safe locally.
4. User may save the entry before a transcript exists.
5. If transcription fails, the app preserves the entry and marks it `needs_retry`.
6. User can retry later without losing the note.

### Flow E: Retrieval

1. User returns later.
2. Recent entries are visible without heavy navigation.
3. Drafts are clearly separated from completed entries.
4. Search is not required for Core MVP completion, but recent retrieval must be easy.

## Screen Contracts

### Home

Must include:

- Primary capture action
- Manual text entry action
- Access to drafts
- Access to recent entries

Must not include:

- Dashboard cards competing with capture
- Complex filters
- Feature marketing copy

### Capture

Must include:

- Recording timer
- Recording state
- Stop and cancel controls
- Permission and storage explanation before first mic request
- A direct text fallback from the permission disclosure if the user decides not to continue with microphone access

Must not include:

- Tiny controls
- Hidden recording state
- Auto-start recording without consent

### Review

Must include:

- Editable title
- Editable transcript when available
- Save action
- Visible state for processing, saved local, syncing, and retry
- Option to keep audio only if retention is enabled in the flow

Must not include:

- Complex editor features
- Advanced formatting controls

### Recent / Drafts

Must include:

- Clear separation between drafts and completed entries
- Entry title or fallback label
- Save/sync state indicator
- Last updated time

## Acceptance Criteria

Core MVP is only complete when all of the following are true:

- A first-time guest user can create and save a manual text note without signing up.
- A first-time guest user can create and save a voice note without signing up.
- If transcription is unavailable or delayed, the note is still recoverable.
- If mic permission is denied, the user can continue immediately with text.
- If the tab reloads during review, the draft can be recovered locally.
- If the same note is open in another tab, the app makes that conflict risk visible before the user keeps editing.
- Recent entries and drafts are distinguishable and navigable on mobile.
- Every core state has visible UI feedback.

## Exit Criteria For Core MVP

Do not move into public launch hardening until:

- The voice flow works on the chosen supported mobile browsers.
- Local draft recovery works across reload and app close/reopen.
- Processing failures are recoverable without data loss.
- The UI does not depend on a transcript arriving instantly.

## Required Test Scenarios

- Guest voice note happy path
- Guest text note happy path
- Microphone disclosure appears before the first voice permission prompt
- Permission denied fallback
- Interrupted capture recovery
- Delayed transcription save
- Processing failure retry
- Draft survives refresh
- Recent list updates after save
- Saved note can be deleted individually without leaving stale local retrieval state behind
- Recent, Drafts, and open note views exit stale state after local delete or restore from another tab
- Manifest and service-worker registration are present for installable browsers
- Offline reload keeps the cached shell usable and explains that local notes still work on this device
- Draft and recent cards expose visible last-updated metadata on mobile

## Public Launch Additions That Build On Core MVP

These depend on Core MVP but are not part of Core MVP completion:

- Authenticated sync
- Search over saved entries
- Export and delete controls
- Deeper offline installability hardening
- Formal privacy controls in settings
