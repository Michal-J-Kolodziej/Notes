# Notes App Core MVP Contract

Last updated: April 3, 2026

## Current Implementation Status

Milestone 1 now has a working local proof of concept in `web/`.

Implemented:

- Local-only guest runtime
- Manual text note creation, save, and retrieval
- Voice-note capture flow with visible recording, processing, review, and saved-local states
- Retained local audio playback for voice notes during review and when reopening saved local notes
- Microphone-denied fallback into manual text entry
- IndexedDB-backed draft persistence with fail-closed storage gating when IndexedDB is unavailable
- Drafts and Recent screens backed by local persisted entries
- Local export and full-device delete controls in Settings
- Recovery-file restore that replaces local notes from a validated exported snapshot
- Support-resources path in Settings with clear crisis-care disclaimer
- Audio-only delete semantics for stored voice-note audio while preserving the note transcript
- Cross-tab refresh for local delete or restore so stale Recent, Drafts, Settings, and note views do not keep pretending old device data still exists
- Basic installability: concrete manifest, service-worker registration, cached shell reload, Home install prompt when supported, manual iPhone/iPad install guidance, and explicit offline-state messaging
- Relative last-updated metadata in Drafts and Recent for faster mobile retrieval

Still intentionally deferred:

- Remote sync
- Search
- Full offline-first launch hardening beyond the current cached app shell

Current Milestone 1 constraint:

- Retained playback, export, restore, and deletion are local-only. There is no account backup or cross-device restore beyond manually moving the exported recovery file.

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
- Recovery-file restore from a previously exported snapshot
- Support-resources path in Settings
- Audio-only delete for retained voice-note audio
- Clear retry for failed processing or sync

### Excluded

- Prompts
- Reminders
- Tags
- Mood tracking
- Rich text
- Attachments other than optional retained audio
- Collaboration

## Detailed Flow Contracts

### Flow A: First-run guest voice capture

1. User lands on home.
2. Home immediately shows a dominant capture action.
3. Before microphone permission is requested, the app explains:
   - why the mic is needed
   - whether audio may be sent to a provider
   - whether audio is stored after processing
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
- Permission denied fallback
- Interrupted capture recovery
- Delayed transcription save
- Processing failure retry
- Draft survives refresh
- Recent list updates after save
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
