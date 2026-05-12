# artImg Pro Development Rules for Codex

This workspace is for building artImg Pro from 0 to 1. Codex must treat `backups/2026-04-25-chatgpt-redesign-pack/ARTIMG_PRO_VITE_REACT_WORKBENCH_PLAN.md` as the product and technical baseline.

## Product Direction

- Build a minimal AI image generation workbench, not a marketing-first website.
- The home page is the workbench. The first viewport must let users enter a prompt and start generating images.
- Keep the experience simple, fast, and calm. Avoid decorative complexity, generic SaaS hero layouts, and chat-framework UI patterns.
- The home page must still render real SEO HTML: `title`, `description`, `h1`, short intro text, public examples, use cases, FAQ, image `alt` text, canonical/OG metadata when appropriate.
- The current project is not a Next.js project. Do not infer Next.js, App Router, Server Components, `next/image`, Route Handlers, or `"use client"` boundaries from old planning notes.

## Current Stack

- Framework/build: Vite with React 19 and TypeScript.
- Rendering: custom Express SSR in `server.js`, with `src/entry-server.tsx` for server rendering and `src/entry-client.tsx` for hydration.
- Styling: Tailwind CSS 3.4 plus `src/index.css`.
- UI: small local business components in `src/components/`.
- Icons: `lucide-react`.
- State: `zustand` where shared state is needed.
- API client: typed plain functions in `src/lib/backendApi.ts` and related helpers.
- Tests: Vitest for focused unit/component-style tests.
- Build output: Vite client/server bundles under `dist/client` and `dist/server`.

Do not introduce `assistant-ui`, Ant Design, MUI, Mantine, HeroUI, large animation libraries, large date/utility libraries, generic component kits, or Next.js-only packages unless the user explicitly approves and the bundle impact is justified.

## Architecture

- Keep `index.html`, `server.js`, `vite.config.ts`, `src/entry-client.tsx`, `src/entry-server.tsx`, and `src/App.tsx` as the primary project entry points.
- Do not create Next.js folders or files such as `app/page.tsx`, `pages/`, `app/api/**/route.ts`, `next.config.*`, or middleware intended for Next.js.
- The app is SSR-rendered React plus client hydration. Components should work in SSR where possible and guard browser-only APIs with event handlers, effects, or runtime checks.
- Keep SEO metadata in `index.html` and SEO-visible content in SSR-rendered React components such as `src/components/HomeSeoContent.tsx`.
- Keep provider-specific image generation and backend details behind small typed helpers in `src/lib/`.
- Do not leak provider keys or storage credentials to client code.
- Prefer typed plain functions over class-heavy or framework-heavy abstractions.

Recommended project shape:

```text
index.html
server.js
vite.config.ts
src/entry-client.tsx
src/entry-server.tsx
src/App.tsx
src/components/
src/hooks/
src/lib/
src/store.ts
```

## Performance Budgets

- Home page initial JS target: 100-150KB gzip where feasible.
- Keep prompt typing responsive and avoid expensive rerenders in the input path.
- Lazy-load heavy features: image editor, cropper, upload transforms, advanced parameter sheets, analytics, and non-critical dialogs.
- Use CDN variants, optimized static assets, stable aspect ratios, explicit dimensions, and `loading="lazy"` for generated and showcase images.
- Avoid layout shift with predictable skeletons and stable dimensions.
- Run `npm run build` before considering a substantial feature done. If bundle size changes materially, inspect the Vite output before adding more dependencies.

## Dependency Policy

- Add a dependency only when it removes real implementation risk or significant code size.
- Before adding a package, check whether the platform, Vite, React, Tailwind, existing local helpers, or a small typed utility already solves it.
- Do not add duplicate libraries for the same job, such as two schema validators, two state managers, or two request clients.
- Do not assume `react-hook-form`, `zod`, `@tanstack/react-query`, Radix, Biome, or Playwright are available; add them only after explicit need and package review.
- Avoid local barrel files for hot paths and component folders. Import directly from the file that owns the code.
- Any new dependency must be reflected in the implementation reason or final summary.

## Code Quality

- Keep code narrow and boring: one component/function should do one product job.
- Do not add speculative abstractions, generic factories, unused variants, placeholder APIs, or future-only config.
- Delete dead code instead of leaving commented blocks.
- Avoid TODO comments unless they name a concrete follow-up that cannot be done in the current task.
- Put constants and schemas in shared files only after at least two real call sites need them.
- Prefer discriminated unions for task state: `idle`, `submitting`, `queued`, `generating`, `success`, `failed`.
- Validate external input at API boundaries with the lightest suitable local helper or an approved schema library.
- Use typed response shapes for backend calls and client polling.
- Keep error messages user-actionable, especially generation failure and retry states.

## React and Vite Rules

- Do not use Next.js-specific APIs, imports, config, metadata helpers, route handlers, Server Components, Server Actions, or `next/image`.
- Do not use the local `next-best-practices` skill for this repository unless the user explicitly asks about a Next.js migration.
- If using React performance guidance from `vercel-react-best-practices`, apply only the framework-neutral React parts and ignore Next.js-only rules.
- Start independent async operations early and await late. Use `Promise.all` for independent work.
- Keep SSR props small and serializable when passing server-rendered data into hydrated components.
- Derive render state during render where possible; do not mirror derived values into effects.
- Put interaction logic in event handlers instead of effects.
- Use memoization only for real expensive work or stable child props. Do not wrap trivial expressions in `useMemo`.
- Do not define React components inside other components.
- Use `useTransition` or deferred rendering for non-urgent UI updates that can otherwise block input.
- Never store request-specific mutable state at module scope in code used by `server.js` SSR.

## UI Constraints

- UI freeze rule: do not modify the existing UI layout, visual style, interaction flow, or component structure unless the user explicitly requests a UI change. Keep the current UI as-is.
- First screen is the usable workbench, not a landing page.
- Build local lightweight components for Button, Input, Textarea, parameter controls, result cards, top bar, history/sidebar, and empty/error states.
- Use mature primitives only when the interaction needs focus management, keyboard support, or accessibility behavior.
- Controls must be complete: loading, disabled, error, empty, success, retry, mobile, and keyboard/focus states.
- Use icons for compact tool buttons where the meaning is familiar, with accessible labels/tooltips.
- Do not nest cards inside cards.
- Use stable dimensions for fixed-format UI: image tiles, toolbar buttons, sidebars, prompt composer, and bottom input area.
- Ensure mobile layouts do not overflow and fixed/bottom inputs do not cover key content.

## API and Data Flow

- Generation flow:

```text
prompt input
-> client validation
-> typed backend helper in src/lib/
-> configured backend endpoint or dev proxy
-> upstream image task
-> task query path or stream path
-> show success/failure
-> persist image/task data in the backend service
```

- API helpers must normalize backend failures and return predictable typed errors.
- Do not block the user-facing request on non-critical logging or analytics.
- Keep provider-specific code behind a small boundary so models/providers can change later.

## Testing and Verification

- Add tests in proportion to risk. For workbench changes, cover:
  - prompt validation
  - parameter changes
  - submit/loading/disabled states
  - success and failure task states
  - retry behavior
  - mobile parameter panel open/close
- For substantial code changes, run:

```text
npm run test
npm run build
```

- Do not report `npm run lint` unless a lint script exists or you add one as part of the task.

## Browser Verification Workflow

- Keep browser verification token-cheap. Prefer `npm run test`, `npm run build`, targeted `Invoke-WebRequest` checks, and concise DOM/HTML assertions before opening the in-app browser.
- After frontend changes, use the in-app browser only when visual interaction materially reduces risk, such as modal behavior, layout overflow, responsive drawers, or canvas/image rendering.
- If the in-app browser connection fails, times out, or cannot attach, make at most one short recovery attempt. Do not repeatedly reload the browser skill, retry long setup cells, or print large browser snapshots.
- After one failed browser recovery, switch to an alternate verification path: HTTP response checks, SSR HTML checks, build output review, unit/component tests, or a short manual-verification note with the local URL.
- When the browser is unavailable, state that once in the final response and report the fallback checks that were completed. Do not spend extra tokens narrating browser internals.

## Codex Working Rules

- Before coding, read this file and the Vite React product plan.
- Keep edits scoped to the current task. Do not refactor unrelated files.
- Prefer implementing the smallest complete slice that can be verified.
- When changing project setup, keep it aligned with Vite, React, TypeScript, Express SSR, Tailwind, Vitest, and the existing package scripts.
- After frontend changes, run or start the dev server and verify the page visually when feasible.
- Final responses must mention changed files, verification commands, and any dependency added.
