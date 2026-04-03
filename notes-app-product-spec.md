# Voice-First Notes App Product Spec

Last updated: April 1, 2026

Detailed companion docs now live under `docs/specs/`. Start with `docs/specs/notes-app-overview.md`, then read the core, trust/recovery, and platform contracts before planning or implementation.

## Product Summary

This product should be a private, voice-first reflection and note-taking app designed primarily for phones. Its job is to make it extremely easy for someone to open the app, speak, review what was captured, and save it without friction. It should feel calm, lively, and memorable without becoming cute, childish, or overdesigned.

The product is not a generic productivity suite and it is not a therapy app. It is a lightweight personal space for thoughts, daily events, emotional release, quick memory capture, and self-recognition.

## Product Positioning

**Positioning statement**

For people who think faster than they type and want a private place to reflect, this app offers the fastest and clearest way to capture thoughts by voice on mobile. Unlike traditional notes apps, it is designed around emotional ease, low friction, and clear data control rather than folders, formatting, and complexity.

**What the product is**

- A mobile-first, voice-first reflection and notes app
- A private personal space with explicit data controls
- A lightweight memory tool built around fast capture and later retrieval

**What the product is not**

- Not a women-only product
- Not a work notes tool first
- Not a therapy, diagnosis, or crisis intervention product
- Not a browser dictation tool pretending to be fully native
- Not a feature-heavy knowledge base or document editor

## Target Audience

**Primary audience**

- People who prefer speaking over typing
- People who want a private reflection space on their phone
- People who need to capture thoughts quickly while moving through daily life

**Secondary audience**

- Users who already rely on voice notes and want searchable transcripts
- Users who want a gentler alternative to rigid journaling apps
- Users who want a calmer alternative to cluttered note-taking apps

## Product Principles

- `One obvious action`: the app should always make the next step clear
- `Voice-first, never voice-only`: speaking is the fastest path, but touch and typing are equal fallback paths throughout the product
- `Private by default, explicit by design`: storage, retention, and sync rules must be visible and understandable
- `Foreground-first`: the core experience should assume the app is open and visible, not running in the background
- `Mobile before desktop`: the phone experience drives every product decision
- `Warm, not kitschy`: lively color and softness without gender clichés or childish styling
- `Searchable memory over manual organization`: retrieval matters more than folders

## Core User Jobs

- “I need to get a thought out quickly before I lose it.”
- “I want to say what happened today without having to type it.”
- “I need a safe place to unload emotions without friction.”
- “I want to remember what I felt, what I did, or what mattered.”
- “I want to find what I said later without digging through clutter.”

## Core Experience

The core loop is:

`Open -> Speak -> Process -> Review -> Save`

This loop is the product. Everything else exists to support it.

### Core state model

The product must treat capture as a state machine, not a single happy path.

- `recording`: microphone is active and the note exists locally
- `processing`: recording has ended and the app is generating or retrying a transcript
- `review_ready`: the user can review the transcript and metadata
- `saved_local`: the entry is safe on-device but not yet synced
- `saved_remote`: the entry is synced and searchable
- `needs_retry`: transcription or upload failed and the note still needs user or system retry

The UI must make these states obvious.

### Home

- Large primary capture action above the fold
- Immediate access to `Drafts`, `Recent`, and `Search`
- No dashboard overload
- No grid of features competing with capture

### Capture

- One-tap start
- Clear pre-permission explanation before the browser microphone prompt
- Visible recording state
- Visible elapsed time
- Clear stop, cancel, and retry actions
- Touch-safe controls with large tap targets

### Review

- Transcript appears as quickly as possible, but the flow must also work when transcription is delayed
- User can fix transcription mistakes before saving when a transcript is available
- User can add a short title
- User can choose whether to keep raw audio
- Save state is explicit: `Local draft`, `Syncing`, `Saved`, `Transcription failed`, `Retry needed`
- If transcription is still processing, the user can still save the entry as audio-backed and return later to review the transcript

### Retrieval

- Timeline for recent entries
- Search over transcripts and titles
- Draft recovery if a session is interrupted

## MVP Scope

### Core MVP

- Mobile-first web app
- Capture-first home screen
- Voice recording in the foreground
- Manual text note creation
- Transcript review and editing
- Simple title editing
- Recent entries list
- Drafts list
- Local autosave while recording and reviewing
- Sync retry queue for interrupted saves
- Guest-first local capture on first launch

### Public Launch Hardening

- Full-text search across saved transcripts and titles
- Explicit audio retention controls
- Export and delete for user content
- Installable PWA basics

### Should Have Shortly After MVP

- Gentle reminders
- Optional empty-state prompts
- Per-entry color or mood marker
- Simple tags
- “On this day” or memory resurfacing

### Not Now

- Collaboration
- Shared notebooks
- Rich text formatting
- Folder-heavy organization
- AI therapist or coaching behavior
- Mood diagnosis
- Background recording promises on the web
- Semantic memory graph
- End-to-end encryption claims before the architecture truly supports it

## Detailed Product Decisions

### Audience and tone

The product should feel warm, soft, and emotionally safe, but it should remain inclusive and not be defined as “for women.” The visual language can lean toward warmth and softness without using stereotypes or excluding other users.

### Prompt strategy

Prompts are not part of the first-release core loop. When introduced, they should come from only two sources:

- Empty-state suggestions when the user has no recent entry
- Optional reminder-based prompts at chosen times

Prompts should be short, gentle, and non-prescriptive. They should never feel like homework.

### Editing model

This is not a document editor. The minimum viable editing model is:

- Fix transcript mistakes
- Add or change a short title
- Split one captured entry into multiple smaller entries later if needed

Anything beyond that should be deferred.

## Privacy, Trust, and Retention Model

This category lives or dies on trust. The app must be precise.

### MVP trust rules

- Do not claim end-to-end encryption in MVP
- Explain exactly what is stored and when
- Make data controls visible at capture time and in settings
- Never hide whether content is still local, syncing, stored, or failed

### Storage defaults

- Unsaved recordings are stored locally first
- Saved transcripts are stored in the backend so they can sync and be searched
- Raw audio retention is `off by default`
- If raw audio retention is off, audio may be temporarily processed for transcription, but it should be removed after transcription succeeds and the saved note is stable
- If the user enables raw audio retention, the audio is stored as an attachment and can be deleted later per entry

### Transcription provider rules

- If a server-side transcription provider is used, the provider must support no-training handling for user content
- Temporary uploaded audio must be deleted after processing completes unless the user explicitly chose to keep raw audio
- The product must not depend on a provider that forces indefinite audio retention
- The privacy copy must match the actual provider behavior exactly

### User controls

- Export note data
- Delete notes
- Delete attached audio independently
- View whether an entry has transcript only or transcript plus audio

### Deletion and export semantics

- Export must include transcript, title, timestamps, and retained audio when present
- Deleting a note must delete its transcript, attached audio, search index entry, and queued sync state
- Account deletion must delete server-side notes, attachments, and related search indexes, and clear signed-in local cache on next app open
- If a transcription provider is used, any temporary provider-side artifacts must also be deleted according to the product's stated retention policy

### Consent requirements

Before requesting microphone access, the app must explain:

- That the microphone is needed for voice capture
- Whether transcription happens on-device or via a server/provider
- Whether audio is kept after transcription
- What happens if the user denies permission

### Safety boundaries

- The app must not present itself as therapy
- The app must not use diagnostic or clinical language
- The app must not imply it can detect or resolve crises
- The app should provide a simple help/resources path in settings for users in distress
- The app should also expose the same help/resources path from review screens and any failure or distress-sensitive surfaces

## Accessibility and Inclusion

- Voice capture must never be the only input path
- All capture and save actions must be usable by touch and keyboard
- Screen reader labels must be explicit
- Tap targets must be large enough for one-handed phone use
- Motion should be restrained and optional
- Color must support contrast requirements
- Recording state must be communicated visually and textually, not by color alone

## Offline and Failure Model

The web MVP should be defined as `draft-safe` and `queue-safe`, not `background-safe`.

### What the app should guarantee

- A user can start a note while online and avoid losing it if the app is interrupted
- Draft text and capture state are autosaved locally
- Saves and uploads retry when connectivity returns
- The UI clearly shows when an entry is still local versus synced
- The note remains recoverable even if transcript generation is delayed or fails

### What the app should not promise

- Continuous background dictation
- Guaranteed background transcription
- Native-equivalent audio behavior on iOS web apps

### Failure handling requirements

- If microphone permission is denied, the app must immediately offer typed entry
- If recording stops unexpectedly, the app must preserve the current draft and show a clear recovery path
- If transcription fails, the app must keep the note recoverable and allow retry
- If network upload fails, the app must keep the note queued locally until sync succeeds or the user deletes it
- If only audio is available, the user must still be able to save and revisit the entry later

## Information Architecture

### Primary screens

**1. Home**

- Primary capture button
- Quick access to drafts
- Recent notes preview
- Search access

**2. Capture**

- Recording state
- Stop / cancel / pause if supported cleanly
- Mic permission and storage explanation

**3. Review**

- Transcript editor
- Manual text editing path even when no transcript is available yet
- Title field
- Keep-audio toggle
- Save status

**4. Timeline**

- Reverse chronological list of entries
- Clear entry states
- Filters later, not in MVP

**5. Search**

- Fast text search over titles and transcripts
- Empty-state guidance

**6. Settings**

- Privacy controls
- Export / delete
- Reminder preferences
- Help/resources

## Visual Direction

The app should be visually simple, alive, and distinctive without looking childish or trendy-for-its-own-sake.

### Visual rules

- Use a soft but confident palette, not pastel overload
- Prefer warm neutrals plus one vivid accent per screen
- Use rounded shapes carefully, without toy-like styling
- Keep layout airy and calm
- Let motion support clarity, not decoration
- Avoid generic productivity chrome like sidebars, nested folders, and crowded toolbars

### Intended emotional effect

- Safe
- Fresh
- Human
- Light
- Encouraging

### Unacceptable visual outcomes

- “Cute” in a childish way
- Overly feminine stereotype design
- Flat enterprise notes-app aesthetics
- Busy dashboards that bury the main action

## Technical Product Direction

### Core stack

- Frontend: TanStack Start
- Backend: Convex
- Deployment: Vercel

### Architecture decisions

- Treat the app as a web-first product, not a pseudo-native product
- Keep voice capture client-side
- Use runtime codec negotiation for recording formats
- Make transcription a pluggable pipeline, not a UI dependency
- Store transcripts, titles, metadata, and search indexes in Convex
- Treat raw audio as an optional attachment, not the default permanent record
- Keep domain logic decoupled from framework specifics because TanStack Start and some related integrations are still evolving

### Auth recommendation

For a production MVP, prefer a stable hosted auth provider with documented TanStack Start and Convex integration rather than building around Convex Auth immediately, because Convex Auth is still in beta. A guest-first local capture path is still recommended so users can create their first note before being forced into sign-up.

### Guest mode rules

- In MVP, guest notes are device-local only until the user creates an account on that device
- Guest notes are searchable and exportable only on that device until migration
- Cross-device sync starts only after account creation
- After sign-up on the same device, the app offers one-time migration of local notes into the new account
- After migration, local guest notes receive backend ownership and sync status
- The product must not imply that guest notes are backed up or portable before account creation

### Native future

Plan the future mobile path by capability, not by branding.

- `Phase 1`: web app + installable PWA
- `Phase 2`: Capacitor packaging only if store distribution is needed quickly
- `Phase 3`: separate native client only if uninterrupted recording, deeper OS integration, or stronger native speech workflows become core requirements

## Suggested Data Model

### Entry

- `id`
- `userId` (optional before account migration)
- `deviceLocalId`
- `ownerMode` (`guest_local`, `account_local`, `account_synced`)
- `createdAt`
- `updatedAt`
- `status` (`draft`, `syncing`, `saved`, `transcription_failed`)
- `sourceType` (`voice`, `text`)
- `title`
- `transcript`
- `hasAudio`
- `audioFileId` (optional)
- `storageMode` (`transcript_only`, `transcript_plus_audio`)

### Optional later fields

- `mood`
- `tags`
- `promptId`
- `resurfacedAt`

## Success Metrics

- First note saved successfully
- Median time from app open to saved note under 60 seconds
- High draft recovery success rate after interruption
- Search success rate on returning users
- Low abandonment after microphone permission prompt
- Retention driven by repeat capture, not by forced reminders

## Key Risks and Mitigations

### Risk: web speech support is inconsistent

Mitigation:

- Do not depend on browser speech recognition alone
- Make audio capture primary and transcription resilient
- Always provide typed fallback

### Risk: users misunderstand privacy guarantees

Mitigation:

- Use precise storage language
- Show retention settings during capture and in settings
- Never imply E2EE before it exists

### Risk: iOS and PWA behavior feel less native than expected

Mitigation:

- Set product expectations around foreground use
- Build the web experience to be resilient first
- Move to native only if native-only capabilities become important enough

### Risk: the app becomes another generic journal

Mitigation:

- Protect the core loop
- Keep the home screen capture-first
- Avoid feature creep in v1

## Research Basis

This spec is based on current documentation and market signals reviewed on April 1, 2026.

- [TanStack Start React docs](https://tanstack.com/start/latest/docs/framework/react): TanStack Start is currently labeled `Start RC`, so version pinning and abstraction boundaries are prudent.
- [Vercel TanStack Start docs](https://vercel.com/docs/frameworks/full-stack/tanstack-start): Vercel documents TanStack Start deployment via Nitro and says apps use Vercel Functions with Fluid Compute by default.
- [Convex + TanStack Start](https://docs.convex.dev/client/react/tanstack-start/): official integration path for TanStack Start and Convex.
- [Convex File Storage](https://docs.convex.dev/file-storage): supports file storage for attachments such as audio.
- [Convex Text Search](https://docs.convex.dev/search/text-search): supports full-text search for note retrieval, but it is not semantic memory search.
- [Convex Auth](https://docs.convex.dev/auth/convex-auth): currently in beta, which makes it a weaker default for a production-first MVP auth decision.
- [Convex & Clerk](https://docs.convex.dev/auth/clerk): documented path for TanStack Start-compatible auth integration.
- [MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia): microphone capture requires secure context, explicit permission, and browser support.
- [MDN Web Speech API guide](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API): browser speech recognition may be server-based by default and is not reliable enough to be the only transcription path.
- [MDN MediaRecorder.isTypeSupported()](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported_static): recording format support must be negotiated at runtime.
- [MDN Offline and background operation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation): service workers can help with queueing and recovery, but not with unlimited background processing.
- [MDN Making PWAs installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable): installability is useful but platform-specific.
- [Apple Configuring Web Applications](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html): iOS web app behavior still has platform-specific setup and limits.
- [WebKit Safari 18.4 features](https://webkit.org/blog/16574/webkit-features-in-safari-18-4/): Safari continues to improve web app and media capabilities, but not enough to treat web as equal to native for all audio scenarios.
- [Apple Journal launch announcement](https://www.apple.com/newsroom/2023/12/apple-launches-journal-app-a-new-app-for-reflecting-on-everyday-moments/): strong market signal for privacy, gentle prompting, and reflection-focused product framing.
- [Day One features](https://dayoneapp.com/features/): strong signal that the category values voice capture, reminders, search, and memory resurfacing.
- [Day One end-to-end encryption](https://dayoneapp.com/features/end-to-end-encryption/): users in this category expect privacy to be part of the product promise.
- [Daylio](https://daylio.net/) and [DailyBean](https://dailybean.app/en): show that low-friction logging and immediate visual feedback help retention.
- [Using voice note-taking to promote learners' conceptual understanding](https://arxiv.org/abs/2012.02927): voice can be a valid primary note-taking modality rather than just an accessibility add-on.

## Final Product Call

Build the first version as a mobile-first, voice-first reflection app whose defining strengths are speed, clarity, and trust. Keep the product centered on `capture, review, save, retrieve`. Avoid pretending the web can do everything native can do. Win on the emotional quality of the experience and the honesty of the privacy model.
