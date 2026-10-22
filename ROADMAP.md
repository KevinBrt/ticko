# Roadmap

What comes next, step by step, up to the 0.1 release and right after. The principles and the reasoning live in [ARCHITECTURE.md](ARCHITECTURE.md); this file is the working plan. Tick items as they land and keep it current.

Each step ends with a working demo, green CI and updated docs. Anything touching the database schema or the plugin contract is reviewed by hand before it is merged.

## Now

- [ ] Protect `main` once contributors arrive: require the CI checks (quality, tests, end-to-end) before merging.
- [ ] Check that the `ghcr.io/kevinbrt/toppo` package is public once the first `edge` image is published (GitHub → Packages → Package settings).
- [ ] Leave the release-please pull request open until 0.1 is ready: merging it publishes the version and the `latest` image.
- [x] Answer the [open questions](#open-questions) needed by step 2: categories, priorities and labels are instance-wide lists.

## Step 1: roles, permissions and users

_Done when no route answers without a verified permission._

**Authorization**

- [x] `core`: `can(permissions, permission)`, `canAny()`, `permissionsOfRole()`: a role never grants a permission it may not be given, nor one the catalog no longer knows.
- [x] `defineCommand` / `defineQuery`: `access: { permission }` (organisation permissions), checked before the input; the actor's permissions are loaded with the user on every request.
- [x] Routes declare the access of the operation they run, `config: { access: operation.access }` (checked by `check:conventions`).
- [x] `/api/v1/me` returns the organisation permissions; the web app hides the settings from users who cannot manage anything (the server stays the only judge).
- [x] Permission tests generated from the registered routes: every route refuses a user who has every permission but its own and accepts one who has only its own; open API routes are listed explicitly.

**Roles model**

- [x] One list of roles for the instance and projects (migrations 0004 to 0007): a locked system role (Administrator) with every permission, badge colors from the palette.
- [x] A role is just a role: no internal or client kind (migration 0010). A role can be deleted once nobody holds it; history keeps no reference to it (migration 0011).

**Members** (`features/users`)

- [x] List members, change their role, deactivate and reactivate them (sessions revoked at once, sign-in refused while deactivated).
- [x] Never leave the instance without an active member holding the system role, even when two administrators act at once; only holders of the system role give it, take it away, or act on its holders; nobody changes their own role.
- [x] The members list is searched, filtered and paginated by the server, with its filters in the URL.
- [x] Delete a member, after confirming: their personal data is erased, history keeps an anonymous author, the address is free again.
- [x] Settings layout after the mockups: settings navigation and breadcrumb; members table with role tabs and counts, search, colored role badges, state and a row menu. The mockup’s selection checkboxes (bulk actions) and the Projects and Activity columns come with their features.
- [x] Invitations without SMTP: "Invite members" (emails and a role) gives links to copy (single use, expire after 7 days, only a hash of the token stored, the token after `#` so it stays out of logs); pending invitations show among the members as "Invited" or "Expired", with a new link (the old one dies) and revoke; a public page to accept (name, password). Email delivery comes with step 4.

**Roles and permissions** (`features/roles`)

- [x] Matrix after the mockups: roles in columns, permissions by section in rows, switches; the system role locked; "See issues" as none, own or all; unsaved changes bar, saved in one transaction; one role at a time on phones.
- [x] Create a role (name, color), rename it, delete it while nobody holds it (members, pending invitations); at most 20 roles. The system role cannot be changed.

**Account**

- [x] Account page, from the account in the sidebar: change one's name; change one's password (the current one first), which signs out every other device.

**Tests**

- [x] End-to-end: the administrator invites a team member, who accepts, signs in and cannot open the settings.
- [x] End-to-end, a member’s whole journey: a role made in the matrix, an invitation with it, access to the members but not the roles, the permission taken back and gone on the next request, one’s own account, then the member and the role deleted.

## Step 2: projects and issues

_Done when an issue can be created and closed._

Nine tasks, each committed on its own. The first issue can be created and closed at task 6, with the seeded defaults; the settings screens come after. Reference mockups: the project's issue list and the issue page.

1. **Schema and defaults** (reviewed by hand before the migration)
   - [x] `projects` (`next_issue_number`: the counter, locked by the creating transaction), `project_members`, `statuses`, `workflows`, `workflow_statuses`, `priorities` (four fixed levels), `issue_categories`, `issues` (`UNIQUE (project_id, number)`), `activities` (outliving a deleted issue); project access on users and invitations.
   - [x] Defaults, renamed in the administrator’s language at setup: the workflow New, To do, In progress, Waiting, Resolved; the priorities Low, Normal, High, Urgent; the categories Bug, Request, Question.
   - [x] `workflow_transitions` (migrations 0014 and 0015): which status may follow which, by default New → To do, In progress, Resolved; To do → In progress, Resolved; In progress → To do, Waiting, Resolved; Waiting → In progress, Resolved; Resolved → To do.
2. **Domain rules in `core`**
   - [x] Effective workflow (the project's or the instance's) and initial status; an issue is closed while its status is in the done category, `closed_at` follows.
   - [x] Transitions (`nextStatusesOf`, `canMoveTo`): people change an issue’s status, never the system, and only to a status the workflow allows from the current one, administrators included.
   - [x] Effective permissions in a project: the role the project gives the member, or else their own role; the system role has everything.
   - [x] Issue validation rules shared by the server and the forms.
3. **Project permissions**
   - [x] `access: { project: 'projectKey' | 'issueKey', permission? }`, the project named in the route's path; permissions in the project read by one query; a project a member cannot reach answers 404, as if it did not exist; an archived project is read-only. First route: `GET /api/v1/projects/:projectKey`.
   - [x] Generated permission tests cover project routes: no access, access without the permission, a role given by the project.
4. **Projects and access**
   - [x] Create (`project.create`; the creator gets access), list (paged and searched by the server), settings (name, description, key until the first issue), archive and unarchive: an archived project is read-only.
   - [x] Access per member: none until given, every project, or chosen ones; chosen when inviting (none by default), changed from the member or the project; a role per project; the system role reaches every project.
   - [x] Whoever manages a project's members cannot give a role stronger than their own; a role given in a project cannot be deleted.
5. **Issues, server side**
   - [ ] Create (number from the counter, initial status, default category and priority), read by key (`WEB-42`), change title, description, category and priority, change the status to one the workflow allows from the current one (closing and reopening included), assign to anyone who reaches the project.
   - [ ] Delete for good after confirming: an activity keeps the key and who deleted it; the number is never reused.
   - [ ] One page of a project's issues, newest first (sorting and filters come with step 3).
   - [ ] Every issue change writes an `activities` row in the same transaction.
6. **Issues, in the app** (after the mockups)
   - [ ] The project's issue list, the creation form, the issue page at `/issues/WEB-42`: Markdown description (`react-markdown`, raw HTML ignored), fields edited in place with optimistic updates, the status menu offering only the allowed next statuses, activity history, delete after confirming. From 320 px, with the keyboard.
7. **Categories and priorities in the settings** (`instance.settings.manage`)
   - [ ] Categories: add, rename, recolor, reorder (keyboard buttons, not only drag and drop), choose the default, delete once unused.
   - [ ] Priorities: rename the four levels, choose the default.
8. **Workflows**
   - [ ] Global workflow editor: statuses, category, color, order, initial status, and which status may follow which.
   - [ ] "Customize for this project" (a copy of its own, transitions included); "revert to the global workflow" with the status mapping step, in one transaction, one activity per moved issue.
9. **End-to-end and docs**
   - [ ] Create project `WEB`, create `WEB-1`, move it through the workflow, close it, on desktop and phone; `ARCHITECTURE.md` and this roadmap updated.

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
- [ ] Labels: one list for the instance, edited in the settings; no project labels.
- [ ] Properties (Version, Team…), replacing custom fields: defined for the instance; a project adds its own, hides one or replaces its options; each shown in the issue list or not, asked at creation or not, then required or not. List type first, then multi-select, text, number, date, user, checkbox; visibility to requesters.
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

Needed before 0.1:

- **Lost passwords** while email is not set up: today a member who forgets their password, or the only administrator, has no way back in. Proposed: an administrator creates a one-time reset link from the members list (like an invitation), and a recovery code printed in the logs on demand covers the last administrator.

Needed for step 5:

- **Internal notes**: a visibility flag on comments (proposed), or a separate kind of entry?

## Watch list

Known compromises to revisit, not blocking:

- Drizzle ORM 1.0 is still a release candidate: upgrade when it is stable (new migration format).
- The npm override pinning the esbuild of `drizzle-kit`'s loader can go once drizzle-kit drops `@esbuild-kit`.
- The Docker image weighs about 280 MB, largely Better Auth adapters Toppo does not use (MongoDB, Prisma, Kysely): try the `better-auth/minimal` entry point.
- OpenAPI description of `/api/v1`, generated from the Zod schemas (`z.toJSONSchema`), is not published yet.
- Dark theme: possible later by redefining the tokens in `packages/ui/src/theme.css`.
