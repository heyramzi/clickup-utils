# CLI Technical Log

---

## v0.6.0 — 2026-04-20

View management commands.

- `views list --list <id>` shows custom views on a list
- `view create (--list|--folder|--space) --name --type` creates a view with optional `--group-by`, `--filters-json`, `--grouping-json`, `--sorting-json`, `--columns-json`, `--settings-json`
- `view delete <viewId>` removes a view
- Ergonomic shortcut for `--group-by status`; JSON passthrough for advanced config
- Driver: Seraph Immo needs 6 views on the Opérations list (ramzi)

---

## v0.5.0 — 2026-04-20

Write commands for workspace structure.

- `folder create/update/delete`
- `list create/update/delete`
- `fields list`
- `task field set`
- `task create` gains `--parent` (subtask), `--custom-item` (task type), `--description-file` (SOP templates from file)
- ClickUp API does not expose creation of custom fields or custom task types; both still require one-time UI setup (documented in README)
- Driver: Seraph Immo workspace build (ramzi)

---

## v0.4.0 — 2026-04-20

Comment write commands.

- `comments update <commentId> --text <text> [--resolved]`
- `comments delete <commentId>`
- `comments list` now prints `[commentId]` alongside author so IDs are accessible without leaving the CLI
- Driver: needed to retract a stale comment from the terminal (ramzi)

---

## v0.3.0 — 2026-04-20

Custom field rendering in `task get`.

- `task get --fields` renders custom fields with dropdown option resolution
- Handles: `drop_down`, `labels`, `date`, `users`, `tasks`, JSON fallback for unknown types
- Driver: post-Make-push QC on downstream task custom fields (ramzi)

---

## v0.2.1 — 2026-04-20

Distribute via GitHub Packages.

- Replace broken `file:` dep at `../../vibe-kit/CLIs/climaker` with published `@heyramzi/cli@^0.1.0` from `npm.pkg.github.com/heyramzi`
- Add `cli/.npmrc` so npm resolves `@heyramzi` scope to GitHub Packages when run standalone
- Add shebang on `cli/bin/clickup.ts` so `npm link` installs a runnable binary without a build step

---

## v0.2.0 — 2026-04-17

Smarter env tokens and doc types.

- Point `@heyramzi/cli` at `CLIs/climaker` (previous `modules/cli` path was a broken symlink)
- Use `getEnvVarOptional` from climaker for `CU_API_TOKEN` / `CU_TEAM_ID` instead of raw `process.env` reads
- Fix `isAccessError` to handle ClickUp 404/`ACCESS_999`: ClickUp returns 404 with `ECODE ACCESS_999` for permission-denied responses, not 401/403
- Types: add `ClickUpPageAvatar` with `color`, `value`, `source` fields from v3 spec
- Types: add `ClickUpTaskDocRelationship` + response type (embed/linked/attached etc.)
- Types: use `ClickUpPageAvatar` in `ClickUpPage` instead of inline object

---

## v0.1.4 — 2026-04-16

Path fix after vibe-kit rename.

- Points `@heyramzi/cli` at `vibe-kit/CLIs/cli-maker` instead of the stale `vibe-kit/modules/cli` path

---

## v0.1.3 — 2026-04-13

SDK migration: commander to `@heyramzi/cli`.

- Replace commander with `createCLI` SDK
- Consolidate 15 separate command files into a single `src/index.ts` entry point
- Delete `output.ts` and `tsup.config.ts`
- Multi-token auth with priority-ordered fallback via `requestWithFallback`
- Config stored at `~/.config/clickup/config.json`; supports `CU_API_TOKEN` / `CU_TEAM_ID` env overrides

---

## v0.1.2 — 2026-04-03

Workspace-wide call page discovery.

- Add type 3 (`Meeting`/`SyncUp`) to `ClickUpDocType` union
- `getDocs()` now supports pagination and `parent_type` filter
- New `getAllDocs()` fetches all doc types via `parent_type=12` query
- `docs list` shows `"Meeting"` for type 3 and gains `--type` filter
- New `docs scan` command discovers call pages across the entire workspace

---

## v0.1.1 — 2026-03-26

Cleanup pass.

- README formatting and table alignment fixes
- Minor CLI and type refinements; no behavioral changes

---

## v0.1.0 — 2026-03-05

Initial CLI.

Built with Commander.js and TypeScript (`clickup` / `cu` binary):

- Auth: `init` wizard with token validation and workspace selection, `status` command
- Hierarchy: workspaces, spaces, folders, lists, full tree view
- Tasks: list (with filters), get, create, update
- Collaboration: comments (list/add), team members
- Time tracking and tags
- Dual output: human-friendly tables (TTY) or JSON (piped / `--json` flag)
- Agent-friendly: structured JSON, stderr progress, `NO_COLOR` support
- Config at `~/.config/clickup/config.json` with env var overrides (`CU_API_TOKEN`, `CU_TEAM_ID`)
