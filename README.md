# Orbit

An enterprise workspace for people, tasks and cross-department collaboration.

**[Open Orbit](https://app.stayorbit.cloud/)** · **[Sign in](https://app.stayorbit.cloud/login)** · **[English landing page](https://app.stayorbit.cloud/en)**

## What is in Orbit

- Company, department and team structure, with executive, department-head, team-lead and employee roles.
- Task assignment, acceptance, checklists, attachments, deadlines, priorities and monthly KPI reporting.
- Cross-department projects, customer datasets, whiteboards and internal messaging.
- Personal calendars, notes, notifications, a focus timer and Google Drive access requests.
- Vietnamese and English interfaces, themes, workspace tabs and a first-run guide.

The [product specification](docs/SPECIFICATION.md) is the detailed reference for behavior, roles, limits and API contracts. Historical phase notes in the component READMEs describe earlier implementation and verification; they are not a current release checklist.

## Latest landing-page update

The public landing page includes a task-board demonstration, a three-step setup sequence, feature flashcards, an interactive role-scope map, security layers and a registration call to action. On mobile, features and comparisons use a straightforward reading layout without desktop overlays or pinned sequences.

The orbit background stays fixed and becomes softly blurred below the opening section. Scroll-state updates, step rendering and redundant blur layers were optimized; measurements and their limits are recorded in the [landing performance report](docs/engineering/landing-performance-2026-11-01.md).

## Repository layout

Backend and frontend live in **one application repository**. Each has its own dependency manifest and runtime configuration.

```text
.
├── backend/                 Java API, migrations and backend tests
├── frontend/                Next.js application and frontend tests
├── deploy/                  Docker Compose and reverse-proxy examples
├── docs/
│   ├── SPECIFICATION.md     Product behavior and contracts
│   ├── api/                 API documentation
│   ├── engineering/         Engineering and release records
│   └── architecture-decision-records/
├── run-local.ps1            Local stack
├── run-dev-parallel.ps1     Development alongside the public stack
└── run-public.ps1           Production stack and Cloudflare tunnel
```

Agent instructions and skills are maintained separately in **[My-Agents](https://github.com/komorebi240/My-Agents)**. Local `.claude/`, `.agents/`, `.codex/`, `AGENTS.md` and `CLAUDE.md` are ignored by the application repository. Existing Git history is preserved. See the [separation record](docs/engineering/agent-repository-separation.md) and [engineering guidance](https://github.com/komorebi240/My-Agents/blob/main/CLAUDE.md).

## Requirements

- Java 17 and Maven for the Spring Boot API.
- Node.js 20+ and npm for Next.js 15, React 18 and TypeScript.
- Microsoft SQL Server with separate development and production configuration.
- Google OAuth credentials for Drive integration; SMTP configuration for email flows.

Environment templates contain placeholders. Keep credentials, encryption keys, tokens and real environment files out of Git.

## Run locally

1. Follow the database and environment setup in [backend/README.md](backend/README.md). Copy `backend/.env.example` to `backend/.env.local` and supply your own settings.
2. Install the frontend dependencies:

   ```powershell
   cd frontend
   npm ci
   ```

3. From the repository root, launch the local stack:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\run-local.ps1
   ```

The normal frontend is at `http://localhost:3000`; the API is on port `8080`.

**While this machine serves the public site, use the parallel development launcher** to keep development on separate ports and configuration:

```powershell
powershell -ExecutionPolicy Bypass -File .\run-dev-parallel.ps1
```

The parallel frontend is at `http://localhost:3001`, with the development API on `8081`. This launcher uses the development database and logs email instead of sending it. Stop that stack with `-Stop`.

## Verify changes

Run frontend checks from `frontend/`:

```powershell
npm run typecheck
npm run lint
npm test -- --runInBand
npm run build
```

Browser tests use Playwright. [frontend/playwright.config.ts](frontend/playwright.config.ts) expects a separate production build in `.next-e2e` and starts its own server on port `3100`. Do not reuse the live public server for fixture-based tests.

Run backend tests from `backend/` with `mvn test`. Database-backed integration tests have additional SQL Server requirements; see [backend/README.md](backend/README.md).

A dependency audit is not a security sign-off. The [dependency baseline](docs/engineering/dependency-baseline.md) records known findings; the [Next.js hotfix report](docs/engineering/security-hotfix-2026-10-29.md) explains the framework upgrade.

## Publish

[Deployment options](docs/deploy-free.md) cover a VM with SQL Server connectivity and the files under `deploy/`.

The existing PC-hosted setup uses `run-public.ps1`, the production environment in ignored `backend/prod.env.local`, and the named Cloudflare tunnel `orbit`. It serves [app.stayorbit.cloud](https://app.stayorbit.cloud/) while the host remains online. This is a real production database, not an empty development database. The launcher rebuilds and restarts services; `-Stop` closes the public stack.

Before a release, verify the build, applicable tests, environment and rollback path. Keep development settings and seed data separate from production. A README-only update is published through GitHub and does not require restarting the running application.

## More detail

- [Product specification](docs/SPECIFICATION.md)
- [Backend setup and API](backend/README.md)
- [Frontend implementation](frontend/README.md)
- [Agent instructions and skills](https://github.com/komorebi240/My-Agents)
