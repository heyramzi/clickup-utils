# AGENTS.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" -> "Write tests for invalid inputs, then make them pass"
- "Fix the bug" -> "Write a test that reproduces it, then make it pass"
- "Refactor X" -> "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
1. [Step] -> verify: [check]
2. [Step] -> verify: [check]
3. [Step] -> verify: [check]

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## Project Overview
**clickup-utils** is a pure TypeScript library for ClickUp API integration, distributed as a **git submodule** across 6+ projects. It has zero runtime dependencies for core functionality and provides:

- Hand-written types for ClickUp API v2 & v3
- Auto-generated SDK from OpenAPI specs (types + API client for every endpoint)
- Framework-agnostic OAuth, hierarchy API, and transformers
- Framework-specific integrations (SvelteKit + Supabase, Next.js placeholder)

## Architecture
The codebase follows a layered architecture where each layer depends only on the layers below it:

```
┌─────────────────────────────────────────┐
│  Framework Integrations (sveltekit/, nextjs/)  │  ← Framework-specific, import from core
├─────────────────────────────────────────┤
│  Transformers (transformers/)           │  ← Pure functions, API → storage format
├─────────────────────────────────────────┤
│  API Functions (api/)                   │  ← Pure fetch, uses types
├─────────────────────────────────────────┤
│  Core (core/)                           │  ← Framework-agnostic (OAuth protocol)
├─────────────────────────────────────────┤
│  Types (types/)                         │  ← Zero-dependency type definitions
├─────────────────────────────────────────┤
│  Generated SDK (generated/)             │  ← Auto-generated, gitignored
└─────────────────────────────────────────┘
```

**Key design decisions:**

- **No package.json** — this is not an npm package, it's consumed as a submodule
- **No build step** — consuming projects import TypeScript directly
- **`generated/` is gitignored** — re-generate with `node scripts/generate-sdk/index.mjs`
- **Hand-written types coexist with generated types** — hand-written are battle-tested and richer; generated provide full API coverage

## Commands
```bash

# Re-generate SDK from ClickUp OpenAPI specs (downloads specs, generates types + API client)
node scripts/generate-sdk/index.mjs

# Type-check (run from consuming project, since this has no tsconfig)

# This project has no package.json or tsconfig — type checking happens in consumer projects
```

## Directory Map
| Directory               | Purpose                                                        | Edit?                         |
| ----------------------- | -------------------------------------------------------------- | ----------------------------- |
| `types/`                | Hand-written ClickUp API types (11 files)                      | Yes — primary source of truth |
| `core/`                 | OAuth protocol (pure functions, zero deps)                     | Yes                           |
| `api/`                  | Hierarchy fetch functions (workspaces, spaces, folders, lists) | Yes                           |
| `transformers/`         | API response → StoredWorkspace/List/etc.                       | Yes                           |
| `sveltekit/`            | OAuth callback handler + Supabase token storage                | Yes                           |
| `nextjs/`               | OAuth callback handler (token storage TBD)                     | Yes                           |
| `generated/`            | Auto-generated from OpenAPI specs                              | **No** — re-run generator     |
| `scripts/generate-sdk/` | OpenAPI → TypeScript generator pipeline                        | Yes                           |
| `index.ts`              | Barrel export (types, core, transformers, API)                 | Yes                           |

## Consuming Projects
This submodule is used in:

- **save-to-clickup** → `src/types/clickup-utils`
- **clickup-to-blog** → `src/types/clickup-utils`
- **client-glance** → `src/lib/types/clickup-utils`
- **upsys-app** → `src/types/clickup-utils`
- **upsys-consulting** → `types/clickup-utils`
- **clickup-to-sheets** → `src/types/clickup-utils`

Changes here affect all of them — test accordingly.

## Conventions
- Pure functions, zero side effects in core/api/transformers
- Types reflect actual ClickUp API responses (no invented abstractions)
- Framework-specific code stays in its framework folder
- `Stored*` types (StoredWorkspace, StoredList, etc.) are the simplified format for UI/storage
- OAuth functions accept explicit params (no global state or singletons)

## SDK Generator Pipeline
`scripts/generate-sdk/` runs as a Node.js pipeline (zero npm deps):

1. **download-specs.mjs** — Fetches v2 + v3 OpenAPI specs, caches in `.claude/specs/`
2. **parse-schemas.mjs** — Resolves `$ref`s, groups endpoints by tag, normalizes
3. **generate-types.mjs** — Emits `generated/types/{group}.ts` (interfaces + type aliases)
4. **generate-api-client.mjs** — Emits `generated/api/{group}.api.ts` (typed fetch functions)
5. **generate-barrel.mjs** — Emits barrel `index.ts` files

The generator detects dynamic maps, handles circular refs, unifies response types across status codes, and supports multipart uploads.

## Workflow
- Read `AGENTS.md` first (it links to this file).
- Keep changes focused and minimal.
- Run relevant checks before finishing.
- Stage only intended files.