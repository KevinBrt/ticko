# Toppo architecture

> Modern issue tracking. Self-hosted. Free forever, no strings attached.

Toppo is a modern, self-hosted, forever-free issue tracker in the spirit of YouTrack, Mantis or Taiga. This document records the vision, the technical choices and every decision that shapes the code. Keep it current: the next contributor (human or Claude Code) starts from it.

## Principles

Read these before any decision.

1. **One edition, everything included.** No user or guest limit, no paid SSO, no feature reserved for a closed version.
2. **One-command install.** `docker compose up` starts Toppo and its PostgreSQL.
3. **Plugin-first.** The core stays small; integrations (GitHub, Slack, webhooks…) are plugins, official ones included. The plugin system lands right after v0.1.
4. **Fast and beautiful.** Fluid UI, keyboard shortcuts, command palette, responsive down to phones.
5. **Maintainable by one person.** Few dependencies, strict conventions, tests at every step.
6. **Secure by default.** Strict CSP, least privilege everywhere, every input validated, every route authorized.
7. **Configurable, not hard-coded.** Workflows, fields, labels and roles are data an admin edits, with sensible defaults.

## v0.1 scope

v0.1 lets a team replace Mantis day to day, nothing more.

**In scope**

- Local accounts (email + password) and a first-run wizard that creates the admin.
- Projects with a short key (`WEB`, `API`) and numbered issues (`WEB-42`).
- Issues: title, Markdown description, status, priority, assignee, reporter, labels, custom fields.
- Configurable workflows (statuses in three categories: to do, in progress, done), global by default and overridable per project.
- Custom fields, each marked required or optional at creation, global by default and overridable per project.
- List view (sort, group), filters, full-text search.
- Comments, attachments, activity history per issue.
- In-app and email notifications.
- Custom roles composed from permissions; Administrator, Team and Requester are editable defaults, named in the administrator's language at setup. Requesters (customers, other departments) submit and follow their own issues through a simple portal; the team sees every issue.
- Automated tests at every level, blocking in CI.

**Out of scope (later, often as plugins)**

- Kanban board, sprints, estimates, time tracking, Gantt, wiki.
- Plugin system and webhooks, then OIDC, SAML, LDAP: right after 0.1, free.
- Inbound email (create an issue by writing to an address).
- Real-time collaboration, native mobile apps, AI.
- Dark theme (the UI ships a single light theme; tokens make a second theme possible later).

## Technical stack

TypeScript everywhere, from server to plugins: one language for maintainers, contributors and Claude Code.

| Layer      | Choice (pinned version)                                                          | Why                                                                              |
| ---------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Runtime    | Node.js 24 LTS                                                                   | Current LTS; runs TypeScript by stripping types in development                   |
| Language   | TypeScript 7 (native compiler)                                                   | Fast type checking on every commit                                               |
| Monorepo   | npm workspaces + Turborepo 2                                                     | Nothing to install beyond Node; cached tasks                                     |
| Server     | Fastify 5                                                                        | Mature and fast; encapsulation isolates each plugin's routes                     |
| Database   | PostgreSQL 16+ (18 by default), `postgres` driver, Drizzle ORM                   | One database to test, solid at every team size, versioned migrations             |
| Auth       | Better Auth                                                                      | Local accounts now, OIDC/SAML later without a rewrite                            |
| Validation | Zod 4, shared front/back                                                         | One contract for the API, the forms and the plugins                              |
| Front      | React 19, Vite 8, TanStack Router, TanStack Query                                | Fast SPA, cache and optimistic updates                                           |
| UI         | Tailwind CSS 4, Radix primitives, shadcn/ui-style components owned in-repo       | Accessible components we own, consistent design                                  |
| Search     | PostgreSQL full-text (`tsvector`) + `pg_trgm`                                    | No extra service to host                                                         |
| Jobs       | Job queue in PostgreSQL (`FOR UPDATE SKIP LOCKED`)                               | No Redis to install                                                              |
| Email      | Nodemailer (SMTP)                                                                | Works with any mail server                                                       |
| Quality    | Biome (lint + format code), Prettier (Markdown, YAML), Vitest 5, Playwright, axe | Few, fast tools                                                                  |
| Image      | Distroless Node 24, non-root, multi-arch (amd64, arm64)                          | No shell or package manager in production; runs on servers, Raspberry Pi and NAS |

Rule: besides PostgreSQL, no new service to host (Redis, Elasticsearch…) without a strong reason recorded here. Every extra service complicates installation for every user.

## Repository layout

The server serves both the API and the compiled front end: one Docker image, one port.

```
toppo/
├── apps/
│   ├── server/        # Fastify: platform/ (http, auth, cqrs…) + features/ (routes, commands, queries)
│   └── web/           # React SPA (Vite): routes/, features/, shared/
├── packages/
│   ├── core/          # pure business logic: issues, workflows, permissions
│   ├── db/            # Drizzle schema, migrations, connection (PostgreSQL)
│   ├── shared/        # Zod schemas and types shared by front, back and plugins
│   ├── ui/            # design tokens and accessible components
│   ├── testing/       # test database setup, data factories
│   └── plugin-sdk/    # public plugin API, after v0.1 (npm: @toppo/plugin-sdk, MIT)
├── plugins/           # official plugins (webhooks, github), after v0.1
├── e2e/               # Playwright tests, run against a build or the Docker image
├── scripts/           # repository guards run in CI (conventions, dependencies)
├── docker/            # Dockerfile, docker-compose.yml for users, compose.dev.yml
├── docs/              # user and plugin documentation
├── CLAUDE.md          # rules for Claude Code
└── ARCHITECTURE.md    # this document
```

Dependency rule: `core` depends on nothing but `shared`. Server, front end and plugins depend on `core`, never the reverse. Plugins import only `plugin-sdk`. The browser never bundles `db`. These rules are data in `scripts/src/dependencies/rules.ts` and fail CI when broken.

## Core data model

One Toppo instance = one organization; projects live inside it. No multiple workspaces in v0.1. Every table has `id` (UUID v7), `created_at` and `updated_at`.

> **Status:** `users`, `sessions`, `accounts`, `verifications`, `rate_limits`, `roles` and `instance_settings` exist (migrations `0000_init` to `0002_drop_instance_name`). The other tables are a proposal, reviewed before their own migration: the schema is the hardest part to undo.

| Table                             | Key columns                                                                                                                                                 | Notes                                                                                                                                  |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `users`                           | email (lowercase, unique), name, image, email_verified, instance_role_id                                                                                    | Shaped by Better Auth; the instance role carries global permissions (default: Member)                                                  |
| `sessions` / `accounts`           | session: token, user_id, expires_at, ip_address · account: provider_id, account_id, password (hash)                                                         | Better Auth; `accounts` will also hold OIDC/SAML links                                                                                 |
| `verifications` / `rate_limits`   | Better Auth internals                                                                                                                                       | Rate limits live in PostgreSQL, shared by every server process                                                                         |
| `instance_settings`               | single row (id 1): setup_completed_at                                                                                                                       | The wizard is open while `setup_completed_at` is null                                                                                  |
| `roles`                           | name (unique per scope, case-insensitive), scope (instance, project), permissions (text[])                                                                  | Free-form; Administrator, Team and Requester are seeded with stable ids (`DEFAULT_ROLE_IDS`), renamed in the admin's language at setup |
| `projects`                        | key (`WEB`), name, description, archived_at, workflow_id, field_set_id, label_set_id                                                                        | The key prefixes issue numbers; null scheme ids follow the global default                                                              |
| `project_members`                 | project_id, user_id, role_id                                                                                                                                | One role per member per project                                                                                                        |
| `statuses`                        | name, category (todo, in_progress, done), color, project_id (nullable)                                                                                      | Catalog shared by workflows; a project-scoped status only serves that project's override                                               |
| `workflows`                       | name, project_id (nullable), is_default                                                                                                                     | See "Global defaults, project overrides"                                                                                               |
| `workflow_statuses`               | workflow_id, status_id, position, is_initial                                                                                                                | Exactly one initial status per workflow                                                                                                |
| `priorities`                      | name, color, level, position, is_default                                                                                                                    | Instance-wide editable list (open question below)                                                                                      |
| `issues`                          | project_id, number, title, description, status_id, priority_id, assignee_id, reporter_id, custom_values (JSONB), closed_at                                  | `(project_id, number)` unique: `WEB-42`                                                                                                |
| `custom_fields`                   | key, name, type, options (JSONB), project_id (nullable)                                                                                                     | Types: text, long text, number, select, multi-select, date, user, checkbox                                                             |
| `field_sets` / `field_set_fields` | field set: name, project_id, is_default · item: field_id, position, required, shown_on_create, visible_to_requesters, editable_by_requesters, default_value | Same override mechanism as workflows                                                                                                   |
| `labels`                          | name, color, project_id (nullable)                                                                                                                          |                                                                                                                                        |
| `label_sets` / `label_set_labels` | label set: name, project_id, is_default · item: label_id, position                                                                                          | Same override mechanism as workflows                                                                                                   |
| `issue_labels`                    | issue_id, label_id                                                                                                                                          | Many-to-many                                                                                                                           |
| `comments`                        | issue_id, author_id, body                                                                                                                                   | Markdown                                                                                                                               |
| `attachments`                     | issue_id, comment_id, file_name, mime, size, storage_key                                                                                                    | Files on disk (`/data/uploads`), S3 later                                                                                              |
| `activities`                      | issue_id, actor_id, type, payload (JSONB)                                                                                                                   | Immutable log: history, notifications, then plugin hooks                                                                               |
| `notifications`                   | user_id, activity_id, read_at                                                                                                                               | In-app; email is sent by a job                                                                                                         |
| `jobs`                            | type, payload, run_at, attempts, status, last_error                                                                                                         | Background job queue                                                                                                                   |
| `plugins`                         | plugin_id, version, enabled, settings (JSONB)                                                                                                               | After v0.1                                                                                                                             |

Key point: **every issue change writes an `activities` row in the same transaction.** It is the single source for history, notifications, webhooks and plugins.

`issues.custom_values` is a JSONB object keyed by custom field id, validated by a Zod schema that `core` builds from the effective field set. It avoids a slow key-value table.

### Global defaults, project overrides

Workflows, custom fields and labels follow one mechanism, implemented once in `core` and reused:

- **A shared set is configured once** in the instance settings (`workflows`, `field_sets`, `label_sets` rows with `project_id = null`). One of them is the default (`is_default`, unique among shared sets).
- **Projects use it by reference, not by copy.** `projects.workflow_id = null` means "follow the instance default": add a status to the global workflow and every project that has not overridden it gets it immediately.
- **"Customize for this project"** copies the effective set into a new set owned by the project (`project_id` = the project), then points the project at it. The copy is edited freely.
- **"Revert to the global workflow"** deletes the override and sets the project back to `null`.
- **Several named shared sets** ("Dev", "Support") can exist later; a project picks one by id. The schema already allows it.
- **The delicate case** is switching set while issues use something that disappears (a status, a required field). The UI then shows a mapping screen ("issues _In review_ move to…") and the server applies the mapping and the switch in one transaction, writing one activity per moved issue.

Per-field settings live on the set item (`field_set_fields`), not on the field: the same "Version" field can be required at creation in one project and optional in another. `required` implies `shown_on_create`. Visibility to requesters is per field.

Statuses are a shared catalog so that switching between the global workflow and an override keeps issues on the same status rows when both contain them. Transitions are free (any status to any status) in v0.1; a `workflow_transitions` table can restrict them later.

## Roles and permissions

Code always checks a permission, never a role name. A role is only a set of permissions that the admin composes freely, at instance or project level.

```ts
// Forbidden (rejected by `npm run check:conventions`)
if (member.role === 'admin') { … }

// Expected
await authorize(user, 'issue.delete', { projectId });
```

**Permission catalog** (single source in `packages/core`, format `resource.action`)

| Permission                 | Allows                                           | Administrator | Team | Requester |
| -------------------------- | ------------------------------------------------ | ------------- | ---- | --------- |
| `instance.settings.manage` | Instance settings, SMTP, global workflows/fields | yes           |      |           |
| `instance.users.manage`    | Invite, deactivate users                         | yes           |      |           |
| `instance.roles.manage`    | Create and edit roles                            | yes           |      |           |
| `project.create`           | Create a project                                 | yes           | yes  |           |
| `project.settings.manage`  | Project overrides: workflow, fields, labels      | yes           |      |           |
| `project.members.manage`   | Add members, change their role                   | yes           |      |           |
| `issue.read`               | See every issue of the project                   | yes           | yes  |           |
| `issue.read.own`           | See issues one reported                          | yes           | yes  | yes       |
| `issue.create`             | Create an issue                                  | yes           | yes  | yes       |
| `issue.update`             | Edit any issue                                   | yes           | yes  |           |
| `issue.assign`             | Assign an issue                                  | yes           | yes  |           |
| `issue.delete`             | Delete an issue                                  | yes           |      |           |
| `comment.create`           | Comment on a visible issue                       | yes           | yes  | yes       |
| `comment.moderate`         | Edit or delete someone else's comment            | yes           |      |           |

The three right-hand columns are only defaults: the admin changes them or creates other roles (Reporter, Read-only, Contractor…).

**Rules**

- One `authorize()` function in `core`, and every Fastify route declares its access (`config.access`). The server refuses to boot if a route forgets it (already enforced).
- Effective permissions = instance role + project role, computed once per request.
- The front end receives the effective permissions to hide actions; the server stays the only judge.
- CI fails if code compares a role name (`check:conventions`).
- Plugins will declare their own permissions in the same catalog.

## Plugin system (after v0.1)

Plugins arrive right after v0.1, but the core prepares for them now: every change goes through `activities` and the job queue, and no integration is hard-coded. The contract below is the target.

A plugin is an npm package (or a folder in `plugins/`) exporting `definePlugin()` and declaring what it may do. It is Toppo's public contract: designed by hand, never generated.

The core writes the issue and its activity in one transaction; the job queue then dispatches the event to notifications and plugins, which never block the UI.

**Manifest** (`package.json`, `toppo` key): `id`, `name`, `version`, `apiVersion` (e.g. `^1.0`), `permissions` (e.g. `issue.read`, `issue.update`, `http.outbound`), Zod schema of the settings.

**v1 extension points**

1. **Event hooks**: `issue.created`, `issue.updated`, `issue.status_changed`, `issue.assigned`, `comment.created`. Fed by `activities`, asynchronous through the job queue: a slow plugin never blocks the UI.
2. **HTTP routes** mounted under `/api/plugins/<id>/…`, for inbound webhooks (GitHub, Sentry…).
3. **Limited Toppo API**: read and update issues and comments, within the declared permissions.
4. **Settings**: form generated from the Zod schema in the admin screen.
5. **Declarative UI contributions**: actions in an issue menu, links and small sidebar panels, described as JSON. No arbitrary front-end code in v1, for security and stability.

```ts
import { definePlugin, z } from "@toppo/plugin-sdk";

export default definePlugin({
  settings: z.object({ webhookUrl: z.string().url() }),
  setup(ctx) {
    ctx.on("issue.created", async ({ issue }) => {
      await ctx.http.post(ctx.settings.webhookUrl, {
        text: `New issue ${issue.key}: ${issue.title}`,
      });
    });
  },
});
```

**Contract rules**

- `apiVersion` is semver: Toppo refuses to load an incompatible plugin, with a clear message.
- Nothing breaks in a minor version; any break = new major API version and a deprecation period.
- In v1, plugins run in the server process and are installed by an admin (trusted). Isolation (worker threads) comes if the ecosystem grows.
- Webhooks and the GitHub integration are written as plugins from day one: the best test of the SDK.

## Self-hosted installation

Goal: from zero to a working Toppo in under 5 minutes, without reading docs. See `docs/self-hosting.md` and `docker/docker-compose.yml`.

- **One multi-arch image** (amd64 + arm64) on GitHub Container Registry: `ghcr.io/kevinbrt/toppo`. Tags: `X.Y.Z`, `X.Y`, `latest` on releases; `edge` and `sha-…` on every green `main`. SBOM and provenance attestations attached.
- **Hardened runtime**: distroless, no shell, user 65532, read-only root filesystem, all capabilities dropped, `no-new-privileges`.
- **Files in `/data`**: attachments and the secret key generated on first start (`secret.key`, mode 600; or `TOPPO_SECRET`). The database lives in its own volume. Backup = `pg_dump` + a copy of `/data`.
- **Automatic migrations** at startup, in one transaction, under a PostgreSQL advisory lock so that several starting instances never migrate twice; Toppo refuses to start if one fails.
- **First-run wizard** in the browser: create the admin and name the instance. It requires a one-time **setup code printed in the server logs** (or preset with `TOPPO_SETUP_CODE`), so a fresh instance exposed on a network cannot be claimed by a stranger. It closes for good once the first administrator exists. SMTP settings come with email notifications (step 4).
- **Configuration through environment variables**, all prefixed `TOPPO_`, validated at startup (unknown `TOPPO_*` variables are rejected to catch typos), each readable from a file with the `_FILE` suffix (Docker secrets). Documented in `.env.example`.
- **`/health`** for Docker and reverse proxies: 200 when the database answers, 503 otherwise, no version or error details.

## UI/UX

- Design tokens (colors, radii, shadows, fonts) defined once in `packages/ui/src/theme.css`. The default Tailwind palette is disabled so components can only use tokens. Theme taken from the reference mockups: dark sidebar `#0B1012`, teal primary `#0F766E`, page `#F5F6F8`, white cards with `#E6E8EC` borders, Geist and Geist Mono (self-hosted).
- **Light theme only** for now.
- **Responsive, mobile first**: fixed sidebar from 1024 px, navigation drawer below; no horizontal scroll from 320 px; 44 px touch targets on coarse pointers; safe-area insets. Reading and commenting an issue on a phone must be comfortable.
- **Accessible**: WCAG 2.2 AA, checked by axe in end-to-end tests on desktop and phone.
- Command palette (`Ctrl/Cmd + K`) and keyboard shortcuts for common actions (`C` create, `/` search, `E` edit).
- Optimistic updates: the UI reacts before the server answers.
- i18n from day one (English, French): no hard-coded string in components (checked). Typed messages: a missing key or parameter fails type checking.

## Security

- **CSP**: `default-src 'self'`, no inline script, no `unsafe-inline` or `unsafe-eval`, `frame-ancestors 'none'`. Runtime `<style>` tags (Radix scroll lock) are allowed through a per-request nonce: Vite writes a placeholder into `index.html`, the server replaces it on every page request and the app hands it to `get-nonce`. HSTS and `upgrade-insecure-requests` only when `TOPPO_URL` is HTTPS, so plain-HTTP LAN installs keep working.
- **Route contracts** enforced at boot: access rule on every route (`public`, `authenticated`, permissions next), response schema on every `/api/` route. Responses are parsed through their schema, which strips undeclared fields. Access is checked before the body is parsed.
- **Authentication** (Better Auth, email and password): passwords of 12 to 128 characters without composition rules, hashed with scrypt; sessions in an `HttpOnly`, `SameSite=Lax` cookie, `Secure` with the `__Secure-` prefix behind HTTPS; 30-day sliding sessions. Only sign-in, sign-out and session endpoints are exposed (allowlist); public sign-up is off. Sign-in is limited to 5 attempts per minute per client, keyed on the address Fastify resolves (Better Auth's default trust in `X-Forwarded-For` is overridden). Telemetry is off.
- **Cross-site requests**: every state-changing request with a foreign `Origin` or a cross-site `Sec-Fetch-Site` is refused (CSRF, login CSRF included). After sign-in, the app only redirects to same-site paths.
- **Errors**: one envelope (`{ error: { code, message, details? } }`); 5xx are generic, details stay in logs with the request id (`x-request-id`, generated server-side, never trusted from the client).
- **Supply chain**: exact versions, lockfile restricted to `registry.npmjs.org` with integrity hashes, install scripts disabled, licenses checked against an AGPL-compatible allowlist, `npm audit` and dependency review on PRs, Actions pinned by SHA, base images pinned by digest, Dependabot, CodeQL, OpenSSF Scorecard.
- Vulnerabilities are reported privately (`SECURITY.md`).

## Conventions

- Code, commits, issues and docs in English.
- Conventional Commits; release-please derives versions and `CHANGELOG.md` from them.
- CI on GitHub Actions: lint, conventions, dependency checks, typecheck, tests on PostgreSQL 16 and 18, end-to-end tests against the Docker image started with the user-facing compose file.
- REST API versioned (`/api/v1`), described in OpenAPI generated from the Zod schemas (`z.toJSONSchema`).

## Test strategy

No merge without green tests: a task is done only when its tests exist and pass in CI.

| Level             | Tools                                         | What                                                                               | When          |
| ----------------- | --------------------------------------------- | ---------------------------------------------------------------------------------- | ------------- |
| Unit              | Vitest, fast-check                            | `core` logic: `authorize()`, workflows, numbering, validation                      | Every commit  |
| API integration   | Vitest + `fastify.inject()` + real PostgreSQL | Each route: success, validation (400), unauthenticated (401), forbidden (403)      | Every PR      |
| Permission matrix | Vitest, generated from the catalog            | Each route refuses without its permission and accepts with it; default roles match | Every PR      |
| Components        | Vitest browser mode (Chromium)                | Behavior and accessibility, desktop and phone viewports                            | Every PR      |
| End-to-end        | Playwright (desktop + Pixel 7), axe           | First run, create and close an issue, comment, requester portal, a11y, responsive  | Every PR      |
| Migrations        | Vitest                                        | All migrations on an empty database, then on the previous version's database       | Every release |

- Each integration test file gets its own database, cloned in milliseconds from a migrated template (`setupTestDatabase()`): tests run in parallel against a real PostgreSQL without seeing each other's data, and code that opens its own transactions (Better Auth) is tested as it runs in production.
- Data factories (`createUser()`, `createIssue()`…) shared in `packages/testing`.
- Coverage thresholds: `core` and `shared` 90 %, `server` 85 %, enforced in CI.
- Every fixed bug comes with the test that reproduces it.

## Roadmap to 0.1

Seven steps, in order; each ends with a working demo and green tests.

- [x] **0. Foundation**: _done when `docker compose up` leads to a logged-in admin._
  - [x] 0a. Monorepo, tooling and guards, CI, Docker image and compose, `/health`, design tokens, responsive app shell, i18n.
  - [x] 0b. Schema (users, roles, settings) and migrations, permission catalog and default roles, Better Auth local accounts, first-run wizard with setup code, sign-in and sign-out.
- [ ] **1. Roles and permissions**: custom roles, `authorize()` and route permissions, user management, permission matrix tests. _Done when no route answers without a verified permission._
- [ ] **2. Projects and issues**: project CRUD, issues, workflows with global defaults and project overrides, `WEB-42` numbering, `activities` log. _Done when an issue can be created and closed._
- [ ] **3. Views**: list with sort and grouping, filters, search, command palette. _Done when an issue is found in under 3 seconds._
- [ ] **4. Collaboration**: comments, attachments, labels, custom fields (required or optional at creation), in-app and email notifications.
- [ ] **5. Requester portal**: submit and follow one's own issues, with the default Requester role.
- [ ] **6. Release 0.1**: Mantis/Redmine import (CSV first), installation docs, screenshots, announcement on r/selfhosted.

Right after 0.1: plugin system (SDK v1, loader, official webhooks and GitHub plugins), then free OIDC/SAML/LDAP, Jira import, inbound email.

The detailed task list of each step, the open questions and the watch list live in [ROADMAP.md](ROADMAP.md).

## Decisions

| Date       | Decision                                                                                                                                                                                                                                                                                                                                                                      |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-20 | **License**: AGPL-3.0-only for the core; MIT for `@toppo/plugin-sdk` so anyone can write plugins, closed or open.                                                                                                                                                                                                                                                             |
| 2026-10-20 | **Database**: PostgreSQL only (16+, 18 by default). One database to test, ready for every instance size.                                                                                                                                                                                                                                                                      |
| 2026-10-20 | **Repository**: `github.com/KevinBrt/toppo`; image `ghcr.io/kevinbrt/toppo`.                                                                                                                                                                                                                                                                                                  |
| 2026-10-20 | **Light theme only**; tokens keep a dark theme possible later.                                                                                                                                                                                                                                                                                                                |
| 2026-10-20 | **Configurable entities** (workflows, custom fields, labels) follow "global default, project override" by reference.                                                                                                                                                                                                                                                          |
| 2026-10-20 | **Every variable is `TOPPO_*`**, including `TOPPO_DATABASE_URL` (the original brief used `DATABASE_URL`).                                                                                                                                                                                                                                                                     |
| 2026-10-20 | **Named Docker volumes** instead of bind mounts in the user compose file: they work with the non-root image without `chown`.                                                                                                                                                                                                                                                  |
| 2026-10-20 | **No Testcontainers**: tests use `docker/compose.dev.yml`, started automatically by the test setup when needed; CI provides PostgreSQL as a service. Same comfort, fewer dependencies.                                                                                                                                                                                        |
| 2026-10-20 | **Formatting**: Biome formats code (Prettier-compatible output); Prettier only formats Markdown and YAML, which Biome does not handle. No overlap.                                                                                                                                                                                                                            |
| 2026-10-20 | **Own Zod type provider** for Fastify (~50 lines) instead of a dependency; OpenAPI will come from `z.toJSONSchema`.                                                                                                                                                                                                                                                           |
| 2026-10-20 | **Own typed i18n** (~60 lines) instead of i18next: compile-time checked keys and parameters, zero dependency.                                                                                                                                                                                                                                                                 |
| 2026-10-20 | **Server bundle**: Rolldown bundles the server and workspace packages; third-party packages stay in `node_modules` (production install only).                                                                                                                                                                                                                                 |
| 2026-10-20 | **First-run setup code** in the logs rather than an open wizard: nobody can claim a fresh exposed instance.                                                                                                                                                                                                                                                                   |
| 2026-10-20 | **Drizzle ORM 0.45** (stable) with the `postgres` driver; 1.0 is still a release candidate. Ids are UUID v7 generated by the app (PostgreSQL 16 has no `uuidv7()`).                                                                                                                                                                                                           |
| 2026-10-20 | **Better Auth mounted behind an allowlist** of endpoints, with Toppo's own client-IP header, cookie security and Origin check rather than its defaults.                                                                                                                                                                                                                       |
| 2026-10-20 | **`GET /api/v1/me` is public** and answers `{ user: null }` when signed out: "nobody" is a normal state, not an error logged in every browser console.                                                                                                                                                                                                                        |
| 2026-10-20 | **One database per test file**, cloned from a migrated template, instead of rolled-back transactions.                                                                                                                                                                                                                                                                         |
| 2026-10-20 | **npm override** pins the esbuild used by `drizzle-kit`'s loader to a patched version (dev only, GHSA-67mh-4wv8-2f99); remove it once drizzle-kit drops `@esbuild-kit`.                                                                                                                                                                                                       |
| 2026-10-20 | **Web app by features**: `routes/public` and `routes/protected` (one folder per URL section), `features/<feature>` with one folder per kind (`api/` objects such as `Session.signIn()`, `queries/`, `components/`, `models/`, `utils/`), `shared/`. Files carry their kind (`.api.ts`, `.route.tsx`…). Layout and layers are checked.                                         |
| 2026-10-20 | **Server by features with light CQRS**: `platform/` (technical) and `features/<feature>/` with `.routes.ts` at its root and one folder per kind (`commands/`, `queries/`, `models/`, `utils/`). `defineCommand` / `defineQuery` enforce access, input validation and one transaction per command; they will be the plugins' API. No bus, no event sourcing, no read database. |
| 2026-10-21 | **Renamed Ticko to Toppo**, before any release: packages `@toppo/*`, variables `TOPPO_*`, image `ghcr.io/kevinbrt/toppo`, repository `KevinBrt/toppo`.                                                                                                                                                                                                                        |

## Open questions

- **Priorities**: instance-wide editable list (proposed) or the same project-override mechanism?
- **Labels**: full label sets (proposed, for consistency) or simply global labels + project labels?
- **Issue types** (bug, feature, task): a built-in concept or a default select custom field (proposed)?
