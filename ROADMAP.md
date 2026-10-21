# Roadmap

What comes next, step by step, up to the 0.1 release and right after. The principles and the reasoning live in [ARCHITECTURE.md](ARCHITECTURE.md); this file is the working plan. Tick items as they land and keep it current.

Each step ends with a working demo, green CI and updated docs. Anything touching the database schema or the plugin contract is reviewed by hand before it is merged.

## Now

- [ ] Protect `main` once contributors arrive: require the CI checks (quality, tests, end-to-end) before merging.
- [ ] Check that the `ghcr.io/kevinbrt/toppo` package is public once the first `edge` image is published (GitHub → Packages → Package settings).
- [ ] Leave the release-please pull request open until 0.1 is ready: merging it publishes the version and the `latest` image.
- [ ] Answer the [open questions](#open-questions) needed by step 2.

## Step 1: roles, permissions and users

_Done when no route answers without a verified permission._

**Authorization**

- [x] `core`: `can(permissions, permission)`, `canAny()`, `permissionsOfRole()`: a role never grants a permission it may not be given, nor one the catalog no longer knows.
- [x] `defineCommand` / `defineQuery`: `access: { permission }` (organisation permissions), checked before the input; the actor's permissions are loaded with the user on every request.
- [x] Routes declare the access of the operation they run, `config: { access: operation.access }` (checked by `check:conventions`).
- [x] `/api/v1/me` returns the organisation permissions; the web app hides the settings from users who cannot manage anything (the server stays the only judge).
- [x] Permission tests generated from the registered routes: every route refuses a user who has every permission but its own and accepts one who has only its own; open API routes are listed explicitly.

**Roles model**

- [x] One list of roles for the instance and projects (migrations 0004 to 0007): a locked system role (Administrator) with every permission, client roles that can never administer, badge colors from the palette.

**Members** (`features/users`)

- [x] List members, change their role, deactivate and reactivate them (sessions revoked at once, sign-in refused while deactivated).
- [x] Never leave the instance without an active member holding the system role, even when two administrators act at once.
- [x] Settings layout after the mockups: settings navigation and breadcrumb; members table with role tabs and counts, search, colored role badges, state and a row menu. The mockup’s selection checkboxes (bulk actions) and the Projects and Activity columns come with their features.
- [ ] Invitations without SMTP: "Invite members" (emails and a role) gives links to copy (single use, expire after 7 days, only a hash of the token stored, the token after `#` so it stays out of logs); pending invitations show as "Invited", with copy link and revoke; a public page to accept (name, password). Email delivery comes with step 4.

**Roles and permissions** (`features/roles`)

- [ ] Matrix after the mockups: roles in columns, permissions by section in rows, switches; the system role locked; switches a client role may not have disabled; "See issues" as all or own; unsaved changes bar, saved in one transaction.
- [ ] Create a role (name, internal or client, color), rename it, delete it while nobody holds it.

**Account**

- [ ] Account page: change one's name and password.

**Tests**

- [ ] End-to-end: the administrator invites a team member, who accepts, signs in and cannot open the settings.

## Step 2: projects and issues

_Done when an issue can be created and closed._

**Schema** (reviewed by hand before the migration)

- [ ] `projects`, `project_members`, `statuses`, `workflows`, `workflow_statuses`, `priorities`, `issues`, `activities`.
- [ ] Issue numbers unique per project and safe under concurrency (counter on the project row, locked in the creating transaction).

**Project permissions**

- [ ] Project access per member: every project or chosen ones; the system role reaches every project.
- [ ] Effective permissions in a project = the role the project gives the member, or else their own role; `access: { permission, projectOf: (input) => projectId }`.

**Domain** (`core`)

- [ ] Effective workflow: project override or global default; initial status; status categories.
- [ ] Issue validation rules shared by the server and the forms.

**Commands and queries**

- [ ] Projects: create (key such as `WEB`), update, archive; who reaches it, and role overrides.
- [ ] Issues: create, update title and description, change status, set priority, assign, close and reopen, delete.
- [ ] Every issue change writes an `activities` row in the same transaction (`defineCommand` provides the hook).
- [ ] Workflows: global workflow editor; "customize for this project"; "revert to the global workflow" with the status mapping step.

**Web app**

- [ ] Projects list and creation; project settings (members, workflow).
- [ ] Issue creation form and issue page, after the reference mockups; activity history.

**Tests**

- [ ] End-to-end: create project `WEB`, create `WEB-1`, move it through the workflow, close it.

## Step 3: views

_Done when an issue is found in under 3 seconds._

- [ ] Issue list: sort, group (status, priority, assignee), pagination, state kept in the URL.
- [ ] Filters as chips, as in the mockups; saved in the URL.
- [ ] Full-text search (`tsvector`) and fuzzy search (`pg_trgm`); typing `WEB-42` opens the issue (`parseIssueKey`).
- [ ] Command palette (`Ctrl/Cmd + K`) and shortcuts: `C` create, `/` search, `E` edit.
- [ ] Phone layout of the list (cards instead of a table).
- [ ] Indexes checked with `EXPLAIN` on a seeded database of realistic size.

## Step 4: collaboration

- [ ] Comments in Markdown, sanitized (no raw HTML); edit and delete one's own; moderation permission.
- [ ] Attachments: size limits, type sniffed server-side, stored under `/data/uploads` with random keys, downloads authorized and served as attachments.
- [ ] Labels, with the global default / project override mechanism.
- [ ] Custom fields: types, required at creation, shown at creation, visible to requesters, default values; field sets with project overrides.
- [ ] Background job queue in PostgreSQL (`FOR UPDATE SKIP LOCKED`), retried with backoff.
- [ ] In-app notifications (bell, unread count, mark as read), fed by `activities`; mentions with `@`.
- [ ] Email: SMTP settings in the admin (password encrypted with the instance key), test email, invitations and notifications by email, password reset (Better Auth endpoint added to the allowlist).

## Step 5: requester portal

- [ ] Requesters see and follow only the issues they reported (`issue.read.own`), in a simplified interface.
- [ ] Issue creation with only the fields visible to requesters.
- [ ] Internal notes, visible to the team only (see the open question below).
- [ ] End-to-end: a requester submits an issue, the team answers, the requester sees the answer but not the internal note.

## Step 6: release 0.1

- [ ] Import from Mantis and Redmine (CSV first).
- [ ] Migration tests: upgrade a database created by the previous version.
- [ ] Documentation: installation, upgrade, backup and restore, reverse proxy; screenshots.
- [ ] Security review: threat model, CSP and headers, dependency audit, container scan.
- [ ] Merge the release-please pull request: version 0.1.0 and the `latest` image.
- [ ] Announcement on r/selfhosted.

## After 0.1

- [ ] Plugin system: `@toppo/plugin-sdk` (MIT), manifest and `apiVersion`, loader, hooks fed by `activities` through the job queue, plugin HTTP routes, settings forms generated from Zod, declarative UI contributions.
- [ ] Official plugins: webhooks, then GitHub.
- [ ] OIDC, SAML and LDAP, free (Better Auth plugins, added to the endpoint allowlist).
- [ ] Jira import; inbound email.
- [ ] Kanban board, as a plugin or in core (to decide).

## Open questions

Needed for step 2:

- **Priorities**: an instance-wide editable list (proposed), or the same project override mechanism as workflows?
- **Labels**: full label sets (proposed, for consistency), or global labels plus project labels?
- **Issue types** (bug, feature, task): a built-in concept, or a default select custom field (proposed)?

Needed for step 5:

- **Internal notes**: a visibility flag on comments (proposed), or a separate kind of entry?

## Watch list

Known compromises to revisit, not blocking:

- Drizzle ORM 1.0 is still a release candidate: upgrade when it is stable (new migration format).
- The npm override pinning the esbuild of `drizzle-kit`'s loader can go once drizzle-kit drops `@esbuild-kit`.
- The Docker image weighs about 280 MB, largely Better Auth adapters Toppo does not use (MongoDB, Prisma, Kysely): try the `better-auth/minimal` entry point.
- OpenAPI description of `/api/v1`, generated from the Zod schemas (`z.toJSONSchema`), is not published yet.
- Dark theme: possible later by redefining the tokens in `packages/ui/src/theme.css`.
