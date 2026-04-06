# Bun Migration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `web/` use Bun as the authoritative package manager, lockfile source, command runner, and default production runtime surface, remove NPM lockfile usage, and leave the app runnable and verifiable with Bun-only project commands.

**Architecture:** Keep the existing TanStack Start/Vite/Vitest/Playwright stack intact and change only the package-manager/runtime boundary: dependency installation, scripts, preview/start commands, and live operational docs. Preserve the existing app behavior while swapping NPM-specific wiring for Bun-compatible equivalents. Only touch active user-facing and executable surfaces, not historical/archive plans, unless they affect real usage.

**Tech Stack:** Bun, TanStack Start, Vite, Nitro, Vitest, Playwright, Clerk, Convex

---

## Chunk 1: Package Manager Cutover

### Task 1: Normalize package metadata and scripts for Bun

**Files:**
- Modify: `web/package.json`

- [ ] **Step 1: Keep the current package metadata as the failing baseline**

Observed baseline:
- no `packageManager` field
- scripts and docs still assume `npm` / `npx`

- [ ] **Step 2: Update package metadata for Bun**

Required changes:
- add `packageManager` pinned to the installed Bun version
- keep existing script names, but make sure they are Bun-safe
- make Bun the default production runtime surface unless verification proves a concrete incompatibility
- remove any script text that assumes npm-specific behavior if a Bun-native equivalent is better

- [ ] **Step 3: Verify script metadata is syntactically valid**

Run: `cd /Users/michal/Documents/MyApps/Notes/web && bun pm bin >/dev/null`
Expected: command exits successfully

### Task 2: Regenerate lock state with Bun and remove npm lock artifacts

**Files:**
- Modify: `web/bun.lock`
- Delete: `web/package-lock.json`

- [ ] **Step 1: Use Bun as the source of truth for dependency resolution**

Run: `cd /Users/michal/Documents/MyApps/Notes/web && bun install`
Expected: `bun.lock` is updated and dependencies resolve cleanly

- [ ] **Step 2: Remove the npm lockfile**

Delete: `web/package-lock.json`

- [ ] **Step 3: Verify Bun can install from the Bun lockfile**

Run: `cd /Users/michal/Documents/MyApps/Notes/web && bun install --frozen-lockfile`
Expected: exits successfully with no lockfile changes

## Chunk 2: Runtime and Tooling Compatibility

### Task 3: Move automation and preview commands off npm-specific invocation

**Files:**
- Modify: `web/playwright.config.ts`

- [ ] **Step 1: Replace npm/npx preview bootstrap with Bun equivalents**

Required behavior:
- preview server command uses `bun run build`
- preview server command uses `bunx vite preview`

- [ ] **Step 2: Verify Playwright config still parses**

Run: `cd /Users/michal/Documents/MyApps/Notes/web && bunx playwright test --list --project=chromium`
Expected: test listing succeeds

### Task 4: Verify Bun can run the app in dev and production style

**Files:**
- Modify only if required by failed verification

- [ ] **Step 1: Verify dev command path**

Run: `cd /Users/michal/Documents/MyApps/Notes/web && timeout 10 bun run dev`
Expected: server starts on the configured port before timeout

- [ ] **Step 2: Verify production build path**

Run: `cd /Users/michal/Documents/MyApps/Notes/web && bun run build`
Expected: `.output/server/index.mjs` exists

- [ ] **Step 3: Verify production start path**

Run: `cd /Users/michal/Documents/MyApps/Notes/web && bun run start`
Expected: server listens successfully

## Chunk 3: Documentation and Verification

### Task 5: Replace npm-facing repo instructions with Bun-facing instructions

**Files:**
- Modify: `docs/app-overview.md`
- Modify: `docs/codebase-reference.md`
- Modify: `docs/specs/notes-app-platform-contract.md`
- Modify: `web/convex/README.md`
- Modify: `docs/change-log.md`

- [ ] **Step 1: Update human-facing run/install commands**

Required changes:
- `npm install` -> `bun install`
- `npm run <script>` -> `bun run <script>`
- `npx vite preview` -> `bunx vite preview`
- direct `./node_modules/.bin/...` examples -> `bunx ...` where appropriate
- limit the rewrite to active operational docs and executable config, not historical archived plans

- [ ] **Step 2: Record the Bun migration in the change log**

Required content:
- changed files
- docs touched
- user-visible impact

### Task 6: Remove live npm residue from the active repo surface

**Files:**
- Modify only where live usage remains under `web/` and active docs

- [ ] **Step 1: Run a residue sweep**

Run: `cd /Users/michal/Documents/MyApps/Notes/web && rg -n "npm |npm run|npx|package-lock|./node_modules/.bin" . ../docs -g '!dist/**' -g '!.output/**'`
Expected: locate remaining live npm-oriented usage

- [ ] **Step 2: Replace or remove active npm-oriented usage**

Required behavior:
- keep `web/bun.lock` as the single committed lockfile
- remove `web/package-lock.json`
- replace live `npm`, `npx`, and direct `node_modules/.bin` instructions where they affect real usage
- preserve historical/archive files unless they are part of the current runbook

### Task 7: Run the full Bun verification pass

**Files:**
- No code changes unless verification fails

- [ ] **Step 1: Unit and component tests**

Run: `cd /Users/michal/Documents/MyApps/Notes/web && bun run test`
Expected: all tests pass

- [ ] **Step 2: Build**

Run: `cd /Users/michal/Documents/MyApps/Notes/web && bun run build`
Expected: exits successfully

- [ ] **Step 3: Lint**

Run: `cd /Users/michal/Documents/MyApps/Notes/web && bun run lint`
Expected: exits successfully

- [ ] **Step 4: Browser suite**

Run: `cd /Users/michal/Documents/MyApps/Notes/web && bun run test:e2e -- --project=chromium --workers=1 --reporter=dot`
Expected: passes

- [ ] **Step 5: Production smoke**

Run:
- `cd /Users/michal/Documents/MyApps/Notes/web && bun run start`
- `curl -I http://127.0.0.1:3000`

Expected:
- server listens
- root returns `HTTP/1.1 200`

- [ ] **Step 6: Artifact completion checklist**

Confirm:
- `web/package.json` has `packageManager`
- `web/bun.lock` is present
- `web/package-lock.json` is removed
- Playwright preview boot is Bun-based
- `bun install --frozen-lockfile` succeeds
- the primary runbook uses `bun install`, `bun run dev`, `bun run build`, `bun run start`, `bun run test`, `bun run lint`, and `bun run test:e2e`
