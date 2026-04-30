---
name: artimg-pro-guardrails
description: Guardrails for developing artImg Pro as a minimal, fast AI image generation workbench. Use when Codex writes, reviews, refactors, tests, or plans artImg Pro code; when adding dependencies; when changing Next.js App Router, React, Tailwind, API routes, image task flows, SEO content, or UI; and when the user asks to keep development aligned, lean, performant, non-redundant, or not drifting from the product plan.
---

# artImg Pro Guardrails

Apply this skill before doing artImg Pro implementation, review, refactor, dependency, UI, API, or testing work.

## Required Context

Read these first:

1. `AGENTS.md`
2. `backups/2026-04-25-chatgpt-redesign-pack/ARTIMG_PRO_NEXT_WORKBENCH_PLAN.md`

If either file is missing, stop and tell the user which guardrail file is unavailable.

## Non-Negotiables

- Build the home page as the usable AI image workbench, not a marketing landing page.
- Keep the app minimal, fast, and quiet. Avoid decorative layouts, generic SaaS sections, and chat-framework UI.
- Use Next.js App Router, TypeScript, Tailwind CSS v4, small local components, and Radix primitives only when interaction complexity justifies them.
- Do not introduce `assistant-ui`, Ant Design, MUI, Mantine, HeroUI, large animation libraries, or broad UI kits without explicit user approval.
- Use Server Components by default. Do not put `"use client"` on `app/page.tsx`, root layouts, or broad page shells.
- Keep hydration limited to prompt input, parameters, upload controls, task status, result interactions, and necessary dialogs/sheets.
- Preserve SEO HTML on the home page: metadata, `h1`, concise intro, public examples, use cases, FAQ, image alt text, and canonical/OG metadata when appropriate.
- Keep initial home JS within the 100-150KB gzip target where feasible.

## Work Loop

1. State the slice being changed and why it belongs in the workbench plan.
2. Check whether the change affects bundle size, hydration, SEO, API boundaries, mobile layout, or dependency count.
3. Implement the smallest complete slice.
4. Remove dead code, speculative abstraction, unused props, unused variants, and placeholder logic.
5. Verify with the most relevant commands or browser checks.
6. In the final response, report changed files, verification, and any dependency added.

## Dependency Gate

Before adding a dependency, answer:

- Does the platform, Next.js, React, Tailwind, Radix, or a small local helper already solve this?
- Is the package loaded on the home page or only behind a user action?
- Is it replacing real complexity, or just convenience?
- Does it duplicate an existing library?
- Can it be imported per primitive or dynamically?

If the answer is unclear, ask the user before installing.

## Code Shape

- Prefer typed plain functions and small components.
- Prefer direct imports over local barrel files.
- Add shared constants, schemas, or helpers only after real reuse exists.
- Validate API input with `zod`.
- Keep provider-specific image generation code behind a small server-side boundary.
- Use discriminated unions for task state: `idle`, `submitting`, `queued`, `generating`, `success`, `failed`.
- Put user-triggered logic in event handlers, not effects.
- Derive render state during render where possible.
- Avoid `useMemo` for trivial primitive expressions.
- Do not define components inside components.

## UI Checks

- First viewport must contain the prompt workflow.
- Fixed or bottom input areas must not cover important content.
- Mobile must not horizontally overflow.
- Image tiles, tool buttons, prompt composer, sidebars, and parameter controls need stable dimensions.
- Loading, empty, failed, retry, disabled, success, keyboard, focus, and mobile states must exist when relevant.
- Do not nest cards inside cards.

## Verification

For substantial changes, prefer:

```text
npm run lint
npm run test
npm run build
```

For workbench UI changes, also run or recommend Playwright/browser verification for:

- home page opens
- `h1` and SEO text exist
- prompt can submit
- success result displays an image
- API failure shows a useful error and retry path
- mobile layout has no horizontal overflow

If a script does not exist yet, add it during project setup or state that it is not available.
