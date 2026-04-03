# Notes App Trust And Recovery Contract

Last updated: April 1, 2026

## Purpose

This document defines the non-negotiable trust, privacy, accessibility, safety, and recovery rules. If implementation conflicts with this document, implementation is wrong.

## Trust Model

The app may be emotionally important to users. That means hidden failure and vague privacy claims are unacceptable.

The product must always make clear:

- what is stored locally
- what is stored remotely
- what is still processing
- what failed
- what can be deleted

## Data Classes

Treat each of these as a separate class of user data:

- Local draft text
- Local draft metadata
- Temporary local audio capture
- Synced transcript text
- Stored raw audio attachment
- Search index data derived from transcript text

Each class needs independent retention and deletion behavior.

## User-Visible Status Labels

At minimum, the product must support these user-visible states:

- `Draft only on this device`
- `Processing transcript`
- `Saved on this device`
- `Syncing to account`
- `Saved to account`
- `Needs retry`

These labels should map directly to real application state, not vague marketing language.

## Privacy Claims: Allowed vs Forbidden

### Allowed claims

- “Private by default”
- “Raw audio is off by default”
- “Guest notes stay on this device until you create an account”
- “You can export or delete your notes”
- “You can see whether a note includes stored audio”

### Forbidden claims unless technically true

- “End-to-end encrypted”
- “No one can ever access your notes”
- “Safest journaling app”
- “Stored only on-device” when server-side processing occurs
- “Offline voice recognition” unless the real chosen path supports it on the target platform

## Consent Contract

Before the first microphone permission request, the UI must explain:

- why microphone access is needed
- whether transcription may be local or server-side
- whether raw audio is stored by default
- whether the user can save the note without keeping raw audio
- what fallback exists if permission is denied

This explanation must happen before the browser prompt, not after failure.

## Retention Defaults

- Local drafts are kept until saved, deleted, or explicitly discarded.
- Synced transcript text is retained until the user deletes it.
- Raw audio retention is off by default.
- Temporary uploaded audio must be deleted after processing unless the user chose to retain audio.
- Search index data must be deleted when the parent note is deleted.

## Deletion Semantics

Deleting a note must remove:

- transcript text
- note metadata tied to that note
- retained raw audio
- search index material
- queued sync work for that note

Deleting stored audio only must:

- remove the audio file
- preserve the note and transcript
- update storage status immediately

Deleting an account must:

- remove server-side notes and retained attachments
- remove related search index data
- invalidate signed-in local cache on next open

## Export Semantics

Export must include:

- title
- transcript
- timestamps
- sync state where relevant
- retained raw audio when present

Export must not quietly omit audio if the UI suggested it was retained.

## Accessibility Contract

- Voice capture must never be the only way to create or edit a note.
- Manual text entry must be reachable from the home screen and from permission failure paths.
- All primary actions must be operable by touch and keyboard.
- Focus order must remain sensible during capture and review.
- Recording, processing, and retry states must be announced textually, not only by color or animation.
- Tap targets must support one-handed mobile use.
- Motion must be optional and not required to understand state.

## Safety And Support Contract

- The product must never present itself as therapy, diagnosis, treatment, or crisis resolution.
- Prompts, labels, and empty states must avoid clinical language.
- The product must not claim to detect emotional state unless a separate, validated feature exists and is explicitly in scope.
- A help/resources path must exist in settings and be reachable from distress-sensitive states such as failed review or emotionally heavy entry surfaces.

## Recovery Contract

The product is `draft-safe` and `queue-safe`. It is not `background-safe`.

### Required recovery behaviors

- A recording that stops unexpectedly must leave behind a recoverable draft or partial capture artifact.
- A review screen interrupted by refresh or close must restore the local draft.
- A failed transcript job must not destroy the note.
- A failed sync must preserve the note locally and allow retry later.
- If only audio exists, the note must still be recoverable and user-visible.

### Forbidden failure behaviors

- Silent loss of an unsaved note
- Silent replacement of user text with a bad transcript
- Hidden sync failure
- UI claiming “saved” when the note is only local and unsynced

## Failure Matrix

### Microphone denied

Required behavior:

- show plain-language explanation
- offer text note path immediately

### Transcription delayed

Required behavior:

- keep note safe locally
- show processing state
- allow return later

### Transcription failed

Required behavior:

- preserve note
- mark `Needs retry`
- allow manual editing if available

### Network unavailable during sync

Required behavior:

- preserve note locally
- queue retry
- reflect unsynced state visibly

### User deletes audio only

Required behavior:

- remove retained audio
- preserve transcript note
- update status immediately

## Launch Gates

Do not ship publicly until these are true:

- privacy copy matches real data behavior exactly
- all deletion semantics are implemented and verified
- all primary failure modes are recoverable without data loss
- voice and text paths both work without hidden traps
