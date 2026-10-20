# Ticko: rules for Claude Code

Ticko is an open-source (AGPL-3.0), self-hosted issue tracker. The code is public and reviewed by strangers: every line must be something we would be proud to show. Read `ARCHITECTURE.md` for the why; this file is the how.

## Commands

| Command                      | What it does                                                            |
| ---------------------------- | ----------------------------------------------------------------------- |
| `npm run setup`              | Once after cloning: enables the git hooks in `.githooks/`               |
| `npm run dev`                | Dev PostgreSQL (Docker) + server on :3000 + Vite on :5173               |
| `npm run check`              | **Everything CI runs** except e2e. Must pass before calling a task done |
| `npm test`                   | Unit, integration (real PostgreSQL) and browser component tests         |
| `npm run test:e2e`           | Builds, then runs Playwright (desktop + phone) against the built server |
| `npm run lint` / `lint:fix`  | Biome (code) + Prettier (Markdown, YAML)                                |
| `npm run typecheck`          | TypeScript 7 (`tsc`) in every workspace                                 |
| `npm run check:conventions`  | Project rules the linter cannot express (`scripts/src/conventions`)     |
| `npm run check:dependencies` | Package boundaries, exact versions, lockfile, licenses                  |
| `npm run db:up` / `db:down`  | Start or stop the dev database (`docker/compose.dev.yml`)               |

Run one workspace: `npm test --workspace=@ticko/core`, or `npx vitest run src/foo.test.ts` inside it. Node 24 (`.nvmrc`) and Docker are required.

## Workflow

1. One roadmap step per session, split into small tasks. **Propose a plan before writing code** and wait for approval when the task touches the schema, the permission model, the plugin SDK or the public API.
2. Write the test first or alongside the code. A task is done only when `npm run check` passes and, for UI or HTTP changes, `npm run test:e2e` too. Run them yourself; never claim a result you did not see.
3. Keep changes focused. No drive-by refactors, no speculative abstractions, no code for a later step.
4. When a decision changes, update `ARCHITECTURE.md` in the same change.
5. If something is ambiguous (product behavior, naming visible to users, a new dependency), ask.

## Architecture rules

```
apps/server  → core, shared, db          apps/web → core, shared, ui
packages/core → shared only (pure: no I/O, no framework, no Date.now() without injection)
packages/db   → shared, core             packages/ui → shared
plugins/*     → plugin-sdk only          packages/testing → devDependency only
```

Enforced by `check:dependencies` (allowed graph in `scripts/src/dependencies/rules.ts`) and Biome `noUndeclaredDependencies`. Import other workspaces by package name (`@ticko/core`), never by relative path.

- **Business rules live in `core`** as pure functions, unit-tested without a database. The server orchestrates: validate → authorize → call core → persist → respond.
- **Every issue change writes an `activities` row in the same transaction.** History, notifications, webhooks and plugins all read from it. Side effects (email, webhooks) go through the PostgreSQL job queue, never inline in a request.
- **No new service to host.** PostgreSQL is the only infrastructure (search, jobs, sessions). No Redis, no Elasticsearch, no external queue without an `ARCHITECTURE.md` decision.
- **Configuration follows "global default, project override"** (workflows, custom fields, labels): projects reference the global set and can copy it into their own. Reuse the shared mechanism; do not invent a per-feature variant.
- **No integration hard-coded in core.** GitHub, Slack, webhooks… are plugins.

## Security rules (non-negotiable)

- **Authorization checks a permission, never a role name.** `authorize(user, 'issue.update', { projectId })` and `config.access` on routes. `role === 'admin'` is rejected by `check:conventions`. The server is the only judge; the UI hides what the user cannot do, nothing more.
- **Every route declares `config.access`** (and later its permission) and every `/api/` route a Zod response schema: the app refuses to boot otherwise (`http/route-contracts.ts`). Response schemas strip unknown fields, so never return a raw database row "because the schema filters it": select the columns you mean.
- **Validate every input with Zod** (body, params, query, headers), on the server, even if the front already did.
- **SQL only through Drizzle or tagged `sql` templates.** `sql.raw()` and `.unsafe()` are banned (an `// allow(no-raw-sql): reason` comment is reviewed like a security change).
- **No HTML injection sinks**: no `dangerouslySetInnerHTML`, `innerHTML`, `document.write`, `new Function`, `eval`. User Markdown is rendered with a sanitizer that drops raw HTML.
- **CSP stays strict**: same-origin only, no inline script, no `unsafe-inline`, no `unsafe-eval`, no CDN. Runtime `<style>` tags get the per-request nonce. Fonts and assets are bundled.
- **Secrets never leave the server**: not in logs, errors, responses or the front bundle. 5xx answers are generic (`INTERNAL_ERROR`); details go to the log with the request id.
- **Configuration only through `apps/server/src/config.ts`**: `process.env` is read nowhere else (Biome `noProcessEnv`). New variables are `TICKO_*`, validated, defaulted safely and documented in `.env.example`.
- **Randomness for tokens and ids comes from `node:crypto`**, never `Math.random()`.
- **Uploads** (when they come): size limits, content type sniffed server-side, random storage keys, served with `Content-Disposition: attachment` and `nosniff`.
- **Rate-limit authentication and any endpoint that sends email.**
- New dependency = new attack surface: see "Dependencies".

## Code style

- TypeScript strict to the maximum (`tsconfig.base.json`): no `any`, no non-null `!`, no `@ts-ignore`, no enums or namespaces (Node runs our TypeScript by stripping types). Prefer `unknown` + narrowing, discriminated unions and `as const` objects.
- ESM everywhere; relative imports end with `.ts`/`.tsx`. Named exports only (config files excepted). Files in `kebab-case`.
- Small functions with intention-revealing names. Comments explain **why**, never what. No commented-out code. `TODO(#123)` must reference an issue.
- Errors: throw `Error` subclasses with a clear message; never swallow an error silently; never `catch` just to log and rethrow.
- Dates are stored and transmitted in UTC ISO 8601; formatting happens in the browser with `Intl`.
- Identifiers are UUID v7. Every table has `id`, `created_at`, `updated_at`.
- Code, comments, commits, issues and docs are in **English**. User-facing text is translated (English and French).

## Testing rules

| Level       | Where                          | Tool                                      | Covers                                            |
| ----------- | ------------------------------ | ----------------------------------------- | ------------------------------------------------- |
| Unit        | `packages/*/src/*.test.ts`     | Vitest (+ fast-check for parsers)         | Every branch of core logic                        |
| Integration | `apps/server/src/**/*.test.ts` | Vitest + `app.inject()` + real PostgreSQL | Each route: success, 400, 401, 403, 404           |
| Permissions | generated from the catalog     | Vitest                                    | Each route refuses without its permission         |
| Component   | `apps/web`, `packages/ui`      | Vitest browser mode (real Chromium)       | Behavior and accessibility of components          |
| End-to-end  | `e2e/tests`                    | Playwright, desktop + Pixel 7, axe        | Critical journeys, a11y, responsive, headers, CSP |

- Coverage thresholds are enforced (core 90 %, server 85 %). Do not lower a threshold to make CI pass.
- Test behavior through public APIs, not implementation details. Query the UI by role and accessible name, like a user.
- A fixed bug comes with the test that reproduces it.
- No `.only`, no `.skip` committed (Biome rejects them). No sleeps: wait for a condition.
- Integration tests use the real database: `@ticko/testing` starts it if needed. Never mock the database in server tests.
- E2E tests fail on any console error, which includes CSP violations.

## Front-end rules

- **Light theme only.** No `dark:` variants (checked).
- **Design tokens only**, from `packages/ui/src/theme.css` (the default Tailwind palette is disabled). No hex colors or arbitrary color values in components (checked). Data-driven colors (a status color chosen by an admin) are the only inline colors.
- **No hard-coded user-facing text** (checked): `t('section.key')`. Add the key to `en.ts` first, then `fr.ts`; the types fail on a missing key or parameter.
- **Responsive by default, mobile first.** Every screen works from 320 px; no horizontal scroll; touch targets ≥ 44 px on coarse pointers (`pointer-coarse:`); respect safe-area insets. Check 375 px and desktop before calling UI done.
- **Accessible by default**: semantic HTML, one `h1` per page, labelled controls, visible focus, full keyboard use, Radix primitives for dialogs/menus/popovers. axe must stay at zero violations.
- Server state with TanStack Query and optimistic updates; routing with TanStack Router; no global state library.
- Components are added to `packages/ui` only when reused; keep them dumb (props in, events out, no data fetching, no i18n lookups: labels come in as props).

## Database rules (from the next step on)

- Schema in `packages/db` with Drizzle; migrations generated, reviewed by a human, never edited once released, applied at startup in a transaction.
- Every foreign key indexed; constraints in the database (NOT NULL, CHECK, UNIQUE), not only in code.
- Every query on project data is scoped by project and filtered by the user's permissions in the query itself, not after loading.

## Dependencies

- Prefer the platform and what we already have. A new dependency needs a reason in the PR: maintained, small, MIT/Apache/BSD/ISC-compatible (`check:dependencies` enforces licenses), and not replaceable by ~50 lines of our own.
- Versions are exact (`.npmrc save-exact`), one version per package across the monorepo, lockfile from `registry.npmjs.org` only. Install scripts are disabled (`ignore-scripts`).
- GitHub Actions are pinned by commit SHA; Docker base images by digest.

## Git and pull requests

- Conventional Commits (`feat(issues): …`, `fix(auth): …`); the PR title is the squash commit and feeds the changelog.
- Never commit secrets, `.env`, generated files or `dist/`.
- Do not commit, push or open a PR unless asked.
