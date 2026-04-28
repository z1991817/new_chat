# artImg Pro Development Rules for Codex

This workspace is for building the new artImg Pro from 0 to 1. Codex must treat `backups/2026-04-25-chatgpt-redesign-pack/ARTIMG_PRO_NEXT_WORKBENCH_PLAN.md` as the product and technical baseline.

## Product Direction

- Build a minimal AI image generation workbench, not a marketing-first website.
- The home page is the workbench. The first viewport must let users enter a prompt and start generating images.
- Keep the experience simple, fast, and calm. Avoid decorative complexity, generic SaaS hero layouts, and chat-framework UI patterns.
- The home page must still render real SEO HTML: `title`, `description`, `h1`, short intro text, public examples, use cases, FAQ, image `alt` text, canonical/OG metadata when appropriate.

## Default Stack

- Framework: Next.js App Router.
- Language: TypeScript with strict types.
- Styling: Tailwind CSS v4.
- UI primitives: small local business components plus Radix UI primitives only when the interaction needs mature focus, keyboard, or accessibility behavior.
- Icons: `lucide-react`, with Next `optimizePackageImports` when available.
- Forms: `react-hook-form` and `zod`.
- Client task polling: `@tanstack/react-query`.
- Minimal client state: `zustand`, only for state shared across distant client islands.
- Tests: Vitest + React Testing Library for focused components, Playwright for core flows.
- Lint/format: Biome.

Do not introduce `assistant-ui`, Ant Design, MUI, Mantine, HeroUI, large animation libraries, large date/utility libraries, or generic component kits unless the user explicitly approves and the bundle impact is justified.

## Architecture

- Use Server Components by default.
- Do not put `"use client"` on `app/page.tsx`, root layouts, or large page shells.
- Isolate hydration to necessary islands: prompt composer, parameter controls, upload control, task status, result grid interactions, dialogs/sheets.
- Keep SEO and static content server-rendered.
- Keep API code under route handlers and shared server utilities. Never leak provider keys or storage credentials to client code.
- Prefer typed plain functions in `lib/` over class-heavy or framework-heavy abstractions.
- Use mock task flow first when wiring UI, then replace the provider boundary with the real image generation API.

Recommended initial shape:

```text
app/page.tsx
app/api/generate/route.ts
app/api/tasks/[id]/route.ts
app/api/uploads/route.ts
components/workbench/
components/seo/
lib/
```

## Performance Budgets

- Home page initial JS target: 100-150KB gzip.
- Static prerender the home page whenever possible.
- Avoid page-wide client hydration.
- Lazy-load heavy features: image editor, cropper, upload transforms, advanced parameter sheets, analytics, and non-critical dialogs.
- Keep the first interaction responsive. Prompt typing must never depend on expensive render work.
- Use `next/image` or CDN variants for generated and showcase images.
- Mark only the first truly important visual as priority. Lazy-load result/history images.
- Avoid layout shift with stable aspect ratios, explicit dimensions, and predictable skeletons.
- Run `next build` before considering a substantial feature done. If bundle size changes materially, inspect it before adding more dependencies.

## Dependency Policy

- Add a dependency only when it removes real implementation risk or significant code size.
- Before adding a package, check whether the platform, Next.js, React, Tailwind, Radix, or a small local helper already solves it.
- Prefer per-primitive Radix packages instead of aggregate UI packages.
- Avoid local barrel files for hot paths and component folders. Import directly from the file that owns the code.
- Do not add duplicate libraries for the same job, such as two schema validators, two state managers, or two request clients.
- Any new dependency must be reflected in the implementation reason or final summary.

## Code Quality

- Keep code narrow and boring: one component/function should do one product job.
- Do not add speculative abstractions, generic factories, unused variants, placeholder APIs, or future-only config.
- Delete dead code instead of leaving commented blocks.
- Avoid TODO comments unless they name a concrete follow-up that cannot be done in the current task.
- Put constants and schemas in shared files only after at least two real call sites need them.
- Prefer discriminated unions for task state: `idle`, `submitting`, `queued`, `generating`, `success`, `failed`.
- Validate all external input with `zod` at API boundaries.
- Use typed response shapes for API routes and client polling.
- Keep error messages user-actionable, especially generation failure and retry states.

## React and Next Rules

- Follow the local `vercel-react-best-practices` skill for React/Next performance work.
- Start independent async operations early and await late. Use `Promise.all` for independent work.
- Keep RSC props small and serializable. Do not pass large duplicated objects into client components.
- Derive render state during render where possible; do not mirror derived values into effects.
- Put interaction logic in event handlers instead of effects.
- Use memoization only for real expensive work or stable child props. Do not wrap trivial expressions in `useMemo`.
- Do not define React components inside other components.
- Use `useTransition` or deferred rendering for non-urgent UI updates that can otherwise block input.
- Cache repeated server reads with appropriate request-level or bounded cross-request caching. Never store request-specific mutable state at module scope.

## UI Constraints

- First screen is the usable workbench, not a landing page.
- Build local lightweight components for Button, Input, Textarea, parameter controls, result cards, top bar, history/sidebar, and empty/error states.
- Use Radix for Dialog, Popover, Tooltip, DropdownMenu, Select, Switch, Slider, Tabs, and mobile sheets when needed.
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
-> POST /api/generate
-> create upstream task
-> return taskId
-> poll /api/tasks/[id]
-> show success/failure
-> persist image to object storage
-> write task record to database
```

- Route handlers must validate input, handle upstream failures, and return predictable typed errors.
- Do not block the user-facing request on non-critical logging or analytics.
- Keep provider-specific code behind a small server-side boundary so models/providers can change later.

## Testing and Verification

- Add tests in proportion to risk. For UI workbench changes, cover:
  - prompt validation
  - parameter changes
  - submit/loading/disabled states
  - success and failure task states
  - retry behavior
  - mobile parameter panel open/close
- Add Playwright coverage for:
  - home page opens
  - `h1` and SEO text exist
  - prompt can submit
  - successful task shows image
  - API failure shows actionable error
  - mobile layout has no horizontal overflow
- Before finalizing substantial code changes, run:

```text
npm run lint
npm run test
npm run build
```

If a script does not exist yet, add it during project setup or clearly state why it could not be run.

## Codex Working Rules

- Before coding, read this file and the product plan.
- Keep edits scoped to the current task. Do not refactor unrelated files.
- Prefer implementing the smallest complete slice that can be verified.
- When creating the initial project, include Biome, Tailwind, basic test setup, and the core scripts from the plan.
- After frontend changes, run or start the dev server and verify the page visually when feasible.
- Final responses must mention changed files, verification commands, and any dependency added.
