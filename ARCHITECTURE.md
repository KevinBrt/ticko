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
7. **Configurable, not hard-coded.** Workflows, properties, categories, priorities, labels and roles are data an admin edits, with sensible defaults.

## v0.1 scope

v0.1 lets a team replace Mantis day to day, nothing more.

**In scope**

- Local accounts (email + password) and a first-run wizard that creates the admin.
- Projects with a short key (`WEB`, `API`) and numbered issues (`WEB-42`).
- Issues: category, title, Markdown description, status, priority, assignee, reporter, labels, properties.
- Configurable workflows (statuses in three categories: to do, in progress, done), global by default and overridable per project.
- Properties (Version, Team…), defined for the instance and adapted per project: each one shown in the issue list or not, asked at creation or not, then required or not.
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

> **Status:** `users`, `sessions`, `accounts`, `verifications`, `rate_limits`, `instance_settings`, `invitations`, `invitation_projects`, `roles`, `projects`, `project_members`, `statuses`, `workflows`, `workflow_statuses`, `workflow_transitions`, `priorities`, `issue_categories`, `issues` and `activities` exist (migrations `0000` to `0017`). The others are a proposal, reviewed before their own migration: the schema is the hardest part to undo.

| Table                           | Key columns                                                                                                                          | Notes                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`                         | email (lowercase, unique), name, image, email_verified, instance_role_id, all_projects, deactivated_at, deleted_at                   | Shaped by Better Auth; the role is always chosen explicitly, and only a deleted account may lose it (when the role itself is deleted). `all_projects` gives access to every project, present and future. A deleted account keeps its row, erased (no name, an `@deleted.invalid` address, no password) and deactivated, so history keeps an author |
| `sessions` / `accounts`         | session: token, user_id, expires_at, ip_address · account: provider_id, account_id, password (hash)                                  | Better Auth; `accounts` will also hold OIDC/SAML links                                                                                                                                                                                                                                                                                             |
| `verifications` / `rate_limits` | Better Auth internals                                                                                                                | Rate limits live in PostgreSQL, shared by every server process                                                                                                                                                                                                                                                                                     |
| `instance_settings`             | single row (id 1): setup_completed_at                                                                                                | The wizard is open while `setup_completed_at` is null                                                                                                                                                                                                                                                                                              |
| `invitations`                   | email, role_id, token_hash, invited_by_id, expires_at, accepted_at                                                                   | One pending invitation per address; only a SHA-256 of the link's token is stored; accepted ones stay as a record, and lose their role only when it is deleted                                                                                                                                                                                      |
| `invitation_projects`           | invitation_id, project_id                                                                                                            | The projects an invitation gives access to, unless it gives all of them (`invitations.all_projects`)                                                                                                                                                                                                                                               |
| `roles`                         | name (unique, case-insensitive), grants_all, color, permissions (text[])                                                             | One list for the instance and projects. Administrator (system role, `grants_all`), Team and Requester are seeded with stable ids (`DEFAULT_ROLE_IDS`), renamed in the admin's language at setup                                                                                                                                                    |
| `projects`                      | key (`WEB`), name, description, color, archived_at, next_issue_number                                                                | The key prefixes issue numbers and is fixed once the first issue exists; `next_issue_number` numbers issues and never goes down; an archived project is read-only. Deleted only by the command made for it, which removes its issues and activities first (their foreign keys `RESTRICT`)                                                          |
| `project_members`               | project_id, user_id, role_id (nullable)                                                                                              | Who reaches a project; `role_id` overrides the member's own role in this project                                                                                                                                                                                                                                                                   |
| `statuses`                      | name, category (todo, in_progress, done), color, project_id (nullable)                                                               | Catalog shared by workflows; a project-scoped status only serves that project's override                                                                                                                                                                                                                                                           |
| `workflows`                     | project_id (nullable)                                                                                                                | The instance’s workflow (`project_id` null, exactly one) and at most one per project, its own copy                                                                                                                                                                                                                                                 |
| `workflow_statuses`             | workflow_id, status_id, position, is_initial                                                                                         | Exactly one initial status per workflow                                                                                                                                                                                                                                                                                                            |
| `workflow_transitions`          | workflow_id, from_status_id, to_status_id                                                                                            | Which status may follow which. Both ends belong to the workflow (composite foreign keys to `workflow_statuses`): taking a status out of it takes its transitions                                                                                                                                                                                   |
| `priorities`                    | level (1 to 4), name, is_default                                                                                                     | Exactly four levels, each with its own icon and color; the admin renames them and chooses the default for new issues                                                                                                                                                                                                                               |
| `issue_categories`              | name, color, position, is_default                                                                                                    | Built in: every issue has a category. One list for the whole instance (Bug, Request, Question by default), edited in the settings                                                                                                                                                                                                                  |
| `issues`                        | project_id, number, category_id, title, description, status_id, priority_id, assignee_id, reporter_id, properties (JSONB), closed_at | `(project_id, number)` unique: `WEB-42`; closed while its status is in the done category                                                                                                                                                                                                                                                           |
| `properties`                    | name, type, options (JSONB), project_id (nullable), shown_in_list, shown_on_create, required, position                               | Step 4. Version, Team…: defined for the instance, or for one project. Types: list first, then multi-select, text, number, date, user, checkbox                                                                                                                                                                                                     |
| `project_properties`            | project_id, property_id, hidden, options (JSONB)                                                                                     | Step 4. A project hides one of the instance’s properties or replaces its options (its own versions)                                                                                                                                                                                                                                                |
| `labels`                        | name (unique, case-insensitive), color                                                                                               | One list for the whole instance, no project labels                                                                                                                                                                                                                                                                                                 |
| `issue_labels`                  | issue_id, label_id                                                                                                                   | Many-to-many                                                                                                                                                                                                                                                                                                                                       |
| `comments`                      | issue_id, author_id, body                                                                                                            | Markdown                                                                                                                                                                                                                                                                                                                                           |
| `attachments`                   | issue_id, comment_id, file_name, mime, size, storage_key                                                                             | Files on disk (`/data/uploads`), S3 later                                                                                                                                                                                                                                                                                                          |
| `activities`                    | project_id, issue_id, actor_id, type, payload (JSONB)                                                                                | Immutable log: history, notifications, then plugin hooks. Gone with their issue, except the deletion itself, recorded without one                                                                                                                                                                                                                  |
| `notifications`                 | user_id, activity_id, read_at                                                                                                        | In-app; email is sent by a job                                                                                                                                                                                                                                                                                                                     |
| `jobs`                          | type, payload, run_at, attempts, status, last_error                                                                                  | Background job queue                                                                                                                                                                                                                                                                                                                               |
| `plugins`                       | plugin_id, version, enabled, settings (JSONB)                                                                                        | After v0.1                                                                                                                                                                                                                                                                                                                                         |

Key point: **every issue change writes an `activities` row in the same transaction.** It is the single source for history, notifications, webhooks and plugins.

`issues.properties` is a JSONB object keyed by property id, validated by a Zod schema that `core` builds from the project’s effective properties. It avoids a slow key-value table.

### Global defaults, project overrides

Two things can differ per project; everything else (categories, priorities, labels, roles) is one list for the whole instance, edited in the settings.

**Workflows are copied.**

- The instance has one workflow (`project_id` null). A project without a workflow of its own follows it: add a status to it and every such project gets it at once.
- **"Customize for this project"** copies the instance's workflow into one the project owns, then edited freely.
- **"Revert to the global workflow"** deletes the project's copy. Issues on a status the instance's workflow lacks move first: the UI shows a mapping screen ("issues _In review_ move to…") and the server applies the mapping and the revert in one transaction, writing one activity per moved issue.
- Statuses are a shared catalog: the copy and the original share their status rows, so customizing moves no issue. A status added to a copy belongs to its project.
- People change an issue’s status, never the system. The workflow says which statuses may follow each one (`workflow_transitions`), for everyone, administrators included. A project’s copy takes the transitions along.

**Properties are adapted one by one** (step 4).

- The instance defines properties (Version, Team…); every project gets them.
- A project adds properties of its own, hides one of the instance's, or replaces its options (its own versions), without touching the others.
- Each property says whether it shows in the issue list, whether it is asked at creation and, if so, whether it is required.

## Roles and permissions

Code always checks a permission, never a role name. A role is only a set of permissions that the admin composes freely, in a single list for the whole instance (one matrix in the settings), never defined per project.

- **Two levels, global default and project override**: a member's role grants its organisation permissions in the whole instance, and its project permissions in every project the member reaches; a project may give the member another role from the same list.
- **The system role** (Administrator, `grants_all`) has every permission, present and future. It cannot be edited or deleted, it is the only one that manages roles, and the instance always keeps an active member holding it.
- **A role is just a role**: there is no built-in kind of role. Requester is an ordinary role, which the admin renames, changes or deletes like any other; only the system role is special.
- **A role is deleted only once nobody holds it**: an active or deactivated member, a pending invitation or a project giving it blocks it, in the database too (`CHECK` constraints, `ON DELETE RESTRICT` on `project_members`). Deleted accounts and accepted invitations lose it (`ON DELETE SET NULL`). The screen says who still holds it.
- **Access to projects is given per member**: none until given, every project (`users.all_projects`, present and future), or chosen projects (`project_members`). It is chosen when inviting (none by default) and changed from the member or from the project. The system role reaches every project, and takes no role of a project (`409 SYSTEM_ROLE_HOLDER`): it has every permission there anyway. A project's access list shows everyone: those who reach it automatically, its members, and the pending invitations that give it.

```ts
// Forbidden (rejected by `npm run check:conventions`)
if (member.role === 'admin') { … }

// Expected: the operation declares its permission, checked before its input is even read
export const inviteUser = defineCommand({
  name: 'user.invite',
  access: { permission: 'instance.users.manage' },
  …
});
```

**Permission catalog** (single source in `packages/core`, format `resource.action`)

| Section      | Permission                 | Allows                                           | Administrator | Team | Requester |
| ------------ | -------------------------- | ------------------------------------------------ | ------------- | ---- | --------- |
| Tickets      | `issue.read`               | See every issue of the project                   | yes           | yes  |           |
| Tickets      | `issue.read.own`           | See issues one reported                          | yes           | yes  | yes       |
| Tickets      | `issue.create`             | Create an issue                                  | yes           | yes  | yes       |
| Tickets      | `issue.update`             | Edit any issue                                   | yes           | yes  |           |
| Tickets      | `issue.assign`             | Assign an issue                                  | yes           | yes  |           |
| Tickets      | `issue.delete`             | Delete an issue                                  | yes           |      |           |
| Conversation | `comment.create`           | Comment on a visible issue                       | yes           | yes  | yes       |
| Conversation | `comment.moderate`         | Edit or delete someone else's comment            | yes           |      |           |
| Project      | `project.settings.manage`  | The project’s workflow and properties            | yes           |      |           |
| Project      | `project.members.manage`   | Give access to the project, override roles       | yes           |      |           |
| Organisation | `instance.users.manage`    | Invite, deactivate members, change their role    | yes           |      |           |
| Organisation | `project.create`           | Create a project                                 | yes           |      |           |
| Organisation | `project.delete`           | Delete a project, its issues and their history   | yes           |      |           |
| Organisation | `instance.settings.manage` | Instance settings, SMTP, global workflows/fields | yes           |      |           |
| Organisation | `instance.roles.manage`    | Create and edit roles (system role only)         | yes           |      |           |

Organisation permissions apply to the whole instance, the others inside projects. Team and Requester are only defaults: the admin changes them or creates other roles (Supervisor, Read-only, Contractor…).

**Rules**

- `can(permissions, permission)` in `core` decides. Commands and queries declare `access: { permission }`, checked before their input; a route declares the access of the operation it runs (`config: { access: operation.access }`, checked by `check:conventions`), enforced before the body is parsed. The server refuses to boot if a route forgets its access.
- Effective permissions in a project = the role the project gives the member, or else their own role (`projectPermissionsOf` in `core`). That role grants project permissions only: organisation permissions always come from the member’s own role. The system role keeps every permission in every project, whatever a project gives its holder. The actor's permissions are read with the user on every request (one query), so a role change applies at once. A stored permission the catalog no longer knows, or one only the system role may hold, grants nothing (`permissionsOfRole` in `core`).
- An operation about a project declares `access: { project: 'projectKey' | 'issueKey', permission? }`: the input field names the project, and comes from the route's path (the server refuses to boot otherwise), so a route checks it before reading the body. A project the actor does not reach answers 404 `PROJECT_NOT_FOUND`, as if it did not exist; one they reach without the permission, 403. The project, the actor's role and their membership are read in one query, and the operation gets the project with the actor's permissions there. An archived project is read-only: commands on it answer 409 `PROJECT_ARCHIVED`, unless their access allows it (`evenArchived`, to unarchive it).
- Managing a project's members gives no way to more rights: one may give there, and act on a member holding, only a role whose project permissions one holds there oneself, never the system role (`canGiveProjectRole`, `canActOnProjectMember` in `core`); otherwise 403 `ROLE_BEYOND_YOURS`.
- A project route may also require an organisation permission, held through the member's own role, once the project is reached: deleting a project needs `project.delete` and answers 404 to those who do not reach it.
- The front end receives the instance permissions in `GET /api/v1/me` to hide what the user cannot do; the server stays the only judge.
- The instance always keeps an active member holding the system role: a deactivation or role change that would break this is refused, and such changes are serialized by an advisory lock.
- The matrix saves every changed role in one transaction. Each change carries what the matrix showed (`from`) and what it should grant (`to`); if a role changed meanwhile, the whole save is refused (`409 ROLES_CHANGED`) and the screen shows the other administrator's changes, rather than overwriting them.
- At most 20 roles (`ROLES_MAX`): the matrix shows them side by side and the list stays bounded. Creating and renaming roles lock the role rows, so the limit and the unique name hold under concurrency; giving a role share-locks it, so it cannot be deleted at the same moment.
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
- **Route contracts** enforced at boot: access rule on every route (`public`, `authenticated` or a permission), response schema on every `/api/` route. Responses are parsed through their schema, which strips undeclared fields. Access is checked before the body is parsed. Public routes that write are rate limited per client address (`config.rateLimit`), before the body is parsed.
- **Authentication** (Better Auth, email and password): passwords of 12 to 128 characters without composition rules, hashed with scrypt; sessions in an `HttpOnly`, `SameSite=Lax` cookie, `Secure` with the `__Secure-` prefix behind HTTPS; 30-day sliding sessions. Only sign-in, sign-out, session and password change endpoints are exposed (allowlist); public sign-up is off. Changing one’s password requires the current one, is validated by Toppo before Better Auth, limited to 5 attempts per 10 minutes, and always signs out every other device; the new session’s token stays in its cookie, never in the response body. Sign-in is limited to 5 attempts per minute per client, keyed on the address Fastify resolves (Better Auth's default trust in `X-Forwarded-For` is overridden). Telemetry is off.
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
| Unit              | Vitest, fast-check                            | `core` logic: permissions, workflows, numbering, validation                        | Every commit  |
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
- [x] **1. Roles and permissions**: custom roles, route and operation permissions, user management, permission matrix tests. _Done when no route answers without a verified permission._
- [ ] **2. Projects and issues**: project CRUD, issues, workflows with global defaults and project overrides, `WEB-42` numbering, `activities` log. _Done when an issue can be created and closed._
- [ ] **3. Views**: list with sort and grouping, filters, search, command palette. _Done when an issue is found in under 3 seconds._
- [ ] **4. Collaboration**: comments, attachments, labels, properties (shown in the list, asked at creation, required or not), in-app and email notifications.
- [ ] **5. Requester portal**: submit and follow one's own issues, with the default Requester role.
- [ ] **6. Release 0.1**: Mantis/Redmine import (CSV first), installation docs, screenshots, announcement on r/selfhosted.

Right after 0.1: plugin system (SDK v1, loader, official webhooks and GitHub plugins), then free OIDC/SAML/LDAP, Jira import, inbound email.

The detailed task list of each step, the open questions and the watch list live in [ROADMAP.md](ROADMAP.md).

## Decisions

| Date       | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-20 | **License**: AGPL-3.0-only for the core; MIT for `@toppo/plugin-sdk` so anyone can write plugins, closed or open.                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-10-20 | **Database**: PostgreSQL only (16+, 18 by default). One database to test, ready for every instance size.                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-10-20 | **Repository**: `github.com/KevinBrt/toppo`; image `ghcr.io/kevinbrt/toppo`.                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-10-20 | **Light theme only**; tokens keep a dark theme possible later.                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-10-20 | **Configurable entities** (workflows, custom fields, labels) follow "global default, project override" by reference.                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2026-10-20 | **Every variable is `TOPPO_*`**, including `TOPPO_DATABASE_URL` (the original brief used `DATABASE_URL`).                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-10-20 | **Named Docker volumes** instead of bind mounts in the user compose file: they work with the non-root image without `chown`.                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-10-20 | **No Testcontainers**: tests use `docker/compose.dev.yml`, started automatically by the test setup when needed; CI provides PostgreSQL as a service. Same comfort, fewer dependencies.                                                                                                                                                                                                                                                                                                                                    |
| 2026-10-20 | **Formatting**: Biome formats code (Prettier-compatible output); Prettier only formats Markdown and YAML, which Biome does not handle. No overlap.                                                                                                                                                                                                                                                                                                                                                                        |
| 2026-10-20 | **Own Zod type provider** for Fastify (~50 lines) instead of a dependency; OpenAPI will come from `z.toJSONSchema`.                                                                                                                                                                                                                                                                                                                                                                                                       |
| 2026-10-20 | **Own typed i18n** (~60 lines) instead of i18next: compile-time checked keys and parameters, zero dependency.                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-10-20 | **Server bundle**: Rolldown bundles the server and workspace packages; third-party packages stay in `node_modules` (production install only).                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-10-20 | **First-run setup code** in the logs rather than an open wizard: nobody can claim a fresh exposed instance.                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-10-20 | **Drizzle ORM 0.45** (stable) with the `postgres` driver; 1.0 is still a release candidate. Ids are UUID v7 generated by the app (PostgreSQL 16 has no `uuidv7()`).                                                                                                                                                                                                                                                                                                                                                       |
| 2026-10-20 | **Better Auth mounted behind an allowlist** of endpoints, with Toppo's own client-IP header, cookie security and Origin check rather than its defaults.                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-10-20 | **`GET /api/v1/me` is public** and answers `{ user: null }` when signed out: "nobody" is a normal state, not an error logged in every browser console.                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-10-20 | **One database per test file**, cloned from a migrated template, instead of rolled-back transactions.                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-10-20 | **npm override** pins the esbuild used by `drizzle-kit`'s loader to a patched version (dev only, GHSA-67mh-4wv8-2f99); remove it once drizzle-kit drops `@esbuild-kit`.                                                                                                                                                                                                                                                                                                                                                   |
| 2026-10-20 | **Web app by features**: `routes/public` and `routes/protected` (one folder per URL section), `features/<feature>` with one folder per kind (`api/` objects such as `Session.signIn()`, `queries/`, `components/`, `models/`, `utils/`), `shared/`. Files carry their kind (`.api.ts`, `.route.tsx`…). Layout and layers are checked.                                                                                                                                                                                     |
| 2026-10-20 | **Server by features with light CQRS**: `platform/` (technical) and `features/<feature>/` with `.routes.ts` at its root and one folder per kind (`commands/`, `queries/`, `models/`, `utils/`). `defineCommand` / `defineQuery` enforce access, input validation and one transaction per command; they will be the plugins' API. No bus, no event sourcing, no read database.                                                                                                                                             |
| 2026-10-21 | **Renamed Ticko to Toppo**, before any release: packages `@toppo/*`, variables `TOPPO_*`, image `ghcr.io/kevinbrt/toppo`, repository `KevinBrt/toppo`.                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-10-21 | **Permissions read on every request**, with the user, rather than cached in the session: a role change or a deactivation applies at once, for one indexed query.                                                                                                                                                                                                                                                                                                                                                          |
| 2026-10-21 | **Invitations by copyable link** until email exists: single use, expiring, only a hash of the token stored. The same link is emailed once SMTP is configured.                                                                                                                                                                                                                                                                                                                                                             |
| 2026-10-21 | **Instance administrators reach every project through a permission** (`instance.projects.manage`, granted to the Administrator role by default), never through a role name.                                                                                                                                                                                                                                                                                                                                               |
| 2026-10-21 | **Users are deactivated, never deleted**: history keeps pointing at them; a deactivated account loses its sessions at once and cannot sign in.                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-10-21 | **Deleting a member erases them but keeps a row**, replacing the decision above: name, address, password and sessions go; the row stays, deactivated, shown as "Deleted user" in history; the address is free again. Irreversible and confirmed; deactivation stays the way to keep an account for later.                                                                                                                                                                                                                 |
| 2026-10-21 | **One list of roles for the instance and projects**, shown as one matrix: a member's role applies everywhere they reach, a project may override it. Replaces separate instance and project roles. A locked system role (Administrator) has every permission; client roles can never administer. The system role reaches every project, which replaces the `instance.projects.manage` permission decided earlier today.                                                                                                    |
| 2026-10-21 | **A role is just a role**, replacing client roles above: no internal or client kind, the admin composes every role freely. Only the system role is special, and it alone manages roles.                                                                                                                                                                                                                                                                                                                                   |
| 2026-10-21 | **The roles matrix never overwrites another administrator**: a save sends, for each changed role, what the matrix showed and what it should grant, and is refused whole if one of them changed meanwhile. Simpler than versions on rows, and exact about what was seen.                                                                                                                                                                                                                                                   |
| 2026-10-21 | **Lists are searched, filtered, sorted and paginated by the server**: a screen sends its filters (kept in the URL) and gets one page plus the counts it shows; no endpoint returns an unbounded collection, and checks over "all of X" query only what they need.                                                                                                                                                                                                                                                         |
| 2026-10-21 | **Invitation links are shown once**: only a hash of their 256-bit token is stored, the token travels after `#` and in request bodies, never in a URL the server logs. A lost link is renewed, which kills the old one; inviting an address again replaces its pending invitation.                                                                                                                                                                                                                                         |
| 2026-10-21 | **Toppo's own rate limits live in PostgreSQL**, in Better Auth's `rate_limits` table under `toppo:` keys; every public route that writes declares one (checked by the route tests).                                                                                                                                                                                                                                                                                                                                       |
| 2026-10-22 | **A password change signs out every other device**, enforced by the server whatever the client asks: a stolen session does not survive the owner changing their password.                                                                                                                                                                                                                                                                                                                                                 |
| 2026-10-22 | **Priorities, issue types and labels are instance-wide lists**, edited in the settings, without project overrides, replacing "labels follow global default, project override" above. Issue types are built in (every issue has one) rather than a custom field, so that lists, filters and the requester portal can rely on them.                                                                                                                                                                                         |
| 2026-10-22 | **Markdown is rendered by `react-markdown`** (with `remark-gfm`): React elements, never an HTML string; raw HTML is ignored and unsafe link targets are neutralized. Descriptions and comments share it.                                                                                                                                                                                                                                                                                                                  |
| 2026-10-22 | **Deleting an issue is final**, after confirming: the issue and its history go, one activity keeps its key and who deleted it (for audit and webhooks), and the number is never reused. No recycle bin.                                                                                                                                                                                                                                                                                                                   |
| 2026-10-22 | **People use issue keys, never ids**: `WEB-42` is the project key and a number counted per project; the UUID stays internal (foreign keys, API). An issue's page is `/issues/WEB-42`, the very text people pass on. A project key can change until the project's first issue, then never: no key already passed on breaks. Aliases can come later without breaking anything.                                                                                                                                              |
| 2026-10-22 | **Categories and priorities are fields of the issue; properties replace custom fields**, replacing the "issue types" and "configurable entities" decisions above. An issue always has a category (an instance list: Bug, Request, Question) and a priority (four fixed levels with their own icon, renamed by the admin). Version, Team… are properties (step 4), adapted per project one by one rather than in copied sets. A project's workflow is its own copy if any, else the instance's: no named shared workflows. |
| 2026-10-22 | **People move issues; the workflow says where they may go**, replacing free transitions: for each status, the statuses that may follow it, the same for everyone. The default workflow is a guided path with reopening. Only `closed_at` follows on its own, when an issue enters or leaves a done status.                                                                                                                                                                                                                |
| 2026-10-22 | **Project access is given per member, never inferred**: none until given, every project, or chosen ones, decided when inviting and changed later from either side. A project out of reach answers 404, so its key leaks nothing. Managing a project's members never gives more than one holds there.                                                                                                                                                                                                                      |
| 2026-10-22 | **The projects screen is where projects are managed**: it lists the projects one manages (their settings or access), and a project opens on its general settings and access, not on its issues, which are found from the Issues screen. Projects are set up by administrators: the Team role no longer creates them by default. A project has a color, given in turn at creation. Deleting a project, its issues and their history is its own permission, confirmed by typing the key.                                    |

## Open questions

They live in [ROADMAP.md](ROADMAP.md#open-questions), next to the step that needs them.
