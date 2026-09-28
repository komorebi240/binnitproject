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

Phases 1–2 are verified end to end on this machine (real SQL Server, real browser session).
Phase 3 is verified as far as possible **without your own Google OAuth credentials** — see
[backend/README.md](backend/README.md#still-needs-your-action) for the one manual step left
(creating a Google Cloud OAuth client) before it can be checked all the way through. See
[backend/README.md](backend/README.md#what-exists-now) and
[frontend/README.md](frontend/README.md#what-exists-now) for what exists, and each file's
"Verified" sections for exactly what was checked. The reference `sample` module from the
initial scaffold has been deleted now that real modules exist to copy patterns from instead.

This is being built in phases (foundation → task assignment → shared-folder access requests →
AI suggestions → polish); phases 1–3 are done (Phase 3 pending your Google credentials), 4–5 are
not started. See "Getting started" below
to run it yourself.

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
