# Notes App Overview

Last updated: April 1, 2026

## Purpose

This is the canonical overview for the product. It is intentionally short enough to orient a new agent quickly and strict enough to prevent the product from drifting into a generic journaling app or a generic productivity app.

Read this file first. Then read the companion contracts in this order:

1. `notes-app-core-mvp.md`
2. `notes-app-trust-recovery-contract.md`
3. `notes-app-platform-contract.md`
4. `notes-app-post-mvp-backlog.md`

## North Star

Build a mobile-first app that makes it dramatically easier to capture a thought by speaking than by typing, while staying honest about privacy, platform limits, and recovery behavior.

The first version must win on:

- Fast capture
- Calm and memorable interaction design
- Clear recovery when things go wrong
- Explicit user control over stored data

The first version must not try to win on:

- Rich formatting
- Collaboration
- AI companionship
- Background recording on the web
- Deep knowledge-management workflows

## Product Positioning

For people who think faster than they type and want a private place to reflect, this app offers the clearest and lowest-friction way to capture thoughts by voice on mobile. Unlike typical notes apps, it is designed around emotional ease, visible system state, and clear data controls instead of hierarchy, formatting, and feature density.

## Primary Audience

- People who naturally record voice notes instead of typing
- People who want a private reflection space that does not feel clinical
- People who want quick capture during normal daily movement, not long writing sessions

## Core Promise

The user should be able to:

- Open the app
- Capture a thought immediately by voice or text
- Understand what the app is doing at each step
- Recover the note if capture, transcription, or sync is interrupted
- Find the note later without manual filing

## Non-Negotiable Product Rules

- Voice-first, never voice-only
- Mobile-first, desktop best-effort
- Foreground-first on the web
- Private by default, explicit by design
- Searchable retrieval matters more than manual organization
- Warm visual tone without gender stereotypes or childish styling

## Release Framing

This product now uses three execution buckets. They are not interchangeable.

### Ship Now: Core MVP

This is the smallest version that proves the product is real:

- Guest-first local capture
- Voice recording in the foreground
- Manual text capture
- Local draft safety
- Review and save
- Recent entries and drafts

### Required For Public Launch

These items are not optional for a real public release:

- Explicit privacy and retention controls
- Export and delete behavior
- Search across saved entries
- Account creation and local-to-account migration
- Offline-safe retry and visible sync state
- Accessibility and recovery behavior that matches the product promise

### Later, Not Launch Blocking

These are backlog items, not launch requirements:

- Prompts
- Reminders
- Mood markers
- Tags
- Memory resurfacing
- Native packaging

## Hard Product Decisions

- The app is a reflection and note product, not a therapy product.
- Raw audio retention is off by default.
- Transcription is a product capability, not a guaranteed immediate state.
- Guest notes exist locally first and do not sync across devices before sign-up.
- The web product does not promise native-equivalent background behavior.
- Search is text-based retrieval, not semantic memory or AI recall.

## Success Metrics

- Median time from open to saved note under 60 seconds
- Very high draft recovery rate after interruption
- Low abandonment after microphone permission prompt
- Meaningful repeat capture from returning users
- Search success on saved notes
- Low confusion around privacy, sync, and save state

## Design Direction

The emotional tone should be:

- Calm
- Light
- Human
- Fresh
- Encouraging

The UI should not feel:

- Clinical
- Corporate
- Toy-like
- Overly feminine in a stereotyped way
- Busy

## Document Ownership

Use the companion docs as hard contracts:

- `notes-app-core-mvp.md` defines the experience that must ship
- `notes-app-trust-recovery-contract.md` defines what cannot be broken
- `notes-app-platform-contract.md` defines what engineers may and may not assume
- `notes-app-post-mvp-backlog.md` keeps future ideas out of MVP execution

## Research Anchors

This overview inherits the evidence base captured in [notes-app-product-spec.md](/Users/michal/Documents/MyApps/Notes/notes-app-product-spec.md), especially the official documentation and market references in the `Research Basis` section.
