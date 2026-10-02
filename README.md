# PROJECT 0.0.1

Enterprise web application — Spring Boot backend, Next.js frontend, SQL Server database.

This started as a scaffold and now has real functionality:

* **Phase 1** — login, multi-tenant companies, a 3-level org structure (company/department/team),
  role-based staff management.
* **Phase 2** — task assignment: managers assign work to a specific employee or to a whole
  department; employees accept/decline/complete it, all under the same authorization rules as
  Phase 1.
* **Phase 3** — Google Drive: each user connects their own Drive via OAuth, departments expose
  folders in a company-wide catalog, and other departments request access — approved by that
  folder's department head or an executive, same authorization pattern as Phases 1–2.
* **Phase 4** — multi-theme UI (light/dark/gray/pink) with a Settings page (theme, change
  password, recovery email, company rename); a public "forgot password" flow that emails a
  one-time code via Gmail SMTP; and employee/company scalability additions identified during
  this phase — transferring an existing employee's position/department, suspending an account
  without permanently deleting it, and basic HR fields (phone/employee code/start date).
* **Phase 5** — an employee Home page with a monthly KPI score (company-wide, EXECUTIVE-editable
  formula + a descriptive, non-monetary incentive-tier table), a workload chart, and a
  Notion-style priority panel grouping the caller's own tasks by `TaskPriority`.
* **Phase 6** — a header icon redesign (priority panel, a task-board view, notifications, and
  settings all moved into header icons instead of a floating button / Sidebar entry); a private
  per-user Calendar (self-service, or a manager proposes an event a subordinate must
  accept/decline — the manager never gets to read the subordinate's actual calendar); fully
  private per-user Notes; and a durable, per-user Notifications system with an unread badge.
* **Phase 7** — self-service task creation (anyone can give themselves a task; assigning to
  someone else is still authority-gated) with a manager-facing duplicate check; Phòng ban
  redesigned as tiles with a per-department staff directory and public-info popover; simple 1-1
  internal messaging; and note pinning (a pinned note floats on every `/dashboard` page).

Phases 1–2 and 5–7 are verified end to end on this machine (real SQL Server, real browser
session). Phase 3 is verified as far as possible **without your own Google OAuth credentials**
(still pending — see [backend/README.md](backend/README.md#still-needs-your-action) for the one
manual step left). Phase 4's Gmail App Password step has since been completed and verified for
real (a real OTP email was sent and received). See
[backend/README.md](backend/README.md#what-exists-now) and
[frontend/README.md](frontend/README.md#what-exists-now) for what exists, and each file's
"Verified" sections for exactly what was checked. The reference `sample` module from the
initial scaffold has been deleted now that real modules exist to copy patterns from instead.

This is being built in phases (foundation → task assignment → shared-folder access requests →
theme/settings/scalability → KPI/Home → calendar/notes/notifications → self-service tasks/
directory/messaging); phases 1–7 are done (Phase 3 still pending your Google OAuth credentials).
See "Getting started" below to run it yourself.

## Repository layout

This workspace holds two independently-versioned projects side by side. They are meant to
become two separate Git repositories (`backend-repo`, `frontend-repo`); until that split
happens, each subfolder is self-contained (its own `.gitignore`, its own dependencies) so the
split is a copy, not a rewrite.

```text
.
├── CLAUDE.md          Engineering standards & philosophy (read this first)
├── AGENTS.md          Pointer to CLAUDE.md (for tools that look for this filename)
├── .claude/
│   ├── CLAUDE.md      Session operating procedure (when to ask, commit/push approval)
│   └── skills/        Task-specific review/workflow skills
├── backend/           Spring Boot API — see backend/README.md
├── frontend/          Next.js app — see frontend/README.md
└── docs/
    ├── architecture-decision-records/   ADR template + how to write one
    └── api/                              API versioning notes, link to Swagger UI
```

Full stack conventions (package structure, naming, API envelope, migrations, testing) are in
[CLAUDE.md § 46 — Tech Stack and Project Structure](CLAUDE.md#46-tech-stack-and-project-structure).

## Getting started

Neither project has been built or had dependencies installed yet. To go from scaffold to a
running app:

```bash
# Backend — requires JDK 17+ and Maven installed
cd backend
mvn -v          # confirm toolchain
mvn compile     # first real compile
```

(On this machine Maven wasn't on PATH, so it was extracted to `%USERPROFILE%\tools\apache-maven-3.9.16`
and invoked by full path — see [backend/README.md](backend/README.md#running-locally) if you're
in the same situation.)

```bash
# Frontend — requires Node.js 20+ installed
cd frontend
node -v         # confirm toolchain
npm install     # first real dependency install
npm run dev
```

Before either will run against a real database, copy `backend/src/main/resources/application-prod.yml.example`
and fill in real (non-committed) SQL Server connection details via environment variables —
see [CLAUDE.md § 30](CLAUDE.md#30-secrets-and-configuration).
