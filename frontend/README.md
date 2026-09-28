# Frontend — Next.js app

React + Next.js (App Router), TypeScript, Tailwind CSS, TanStack Query. Status: **Phases 1–2
verified end to end in a real browser; Phase 3 (Google Drive) verified as far as possible
without real Google credentials; navigation/UI overhaul verified end to end** — see "Verified"
sections below. Stack-wide conventions this structure implements are in the root
[CLAUDE.md § 46](../CLAUDE.md#46-tech-stack-and-project-structure); read that before adding code.

## What exists now

* **`features/auth`** — `LoginForm`, `useCurrentUser`/`useLogin`/`useLogout` (TanStack Query,
  `['auth','me']` is the source of truth for "am I logged in, as whom"). Login posts credentials;
  the backend responds by setting an httpOnly cookie (see backend README) — this app never
  touches the token itself.
* **`features/organization`** — `DepartmentManager`, `TeamPanel`, `UserManager`: create/list/
  delete departments, teams, and users, scoped to whatever the logged-in user is allowed to see
  (the backend enforces this independently; the UI just hides controls the user can't use — e.g.
  the "Xoá" and "Tạo phòng ban" controls only render for an EXECUTIVE, mirroring CLAUDE.md
  section 9's "hide the button on the frontend, verify the permission on the backend" example).
* **`middleware.ts`** — redirects based on whether the session cookie is *present*, not whether
  it's valid (it can't read an httpOnly cookie's contents, and must not try). An expired/invalid
  cookie just means the first API call from `/dashboard/*` gets a 401 and the page bounces to
  `/login` — the backend is still the only real authorization boundary.
* The old reference `features/sample` has been deleted; `app/page.tsx` is now just a fallback
  (middleware redirects `/` to `/login` or `/dashboard/*` before it would ever render).
* **`features/tasks`** — `TasksPanel` (list + create form). `CreateTaskForm` only renders for
  EXECUTIVE/DEPARTMENT_HEAD/TEAM_LEAD, and its "Cả một phòng ban" (whole department) option is
  hidden for TEAM_LEAD, mirroring `TaskServiceImpl`'s assignment rules. `TaskList`'s
  Nhận/Từ chối/Hoàn thành/Huỷ buttons are shown per `canActOnTask`/`canCancelTask` helpers that
  mirror the backend's authorization checks — approximations for UX only; the backend is what
  actually enforces them.
* **`features/drive`** — `DrivePanel`: `ConnectDriveButton` does a full-page
  `window.location.href` redirect to the backend's `/drive/connect` (OAuth cannot go through
  axios/XHR); `FolderCatalog` lets a user paste a Drive folder link/ID to register it for their
  department; `AccessRequestPanel` sends/approves/rejects cross-department access requests. The
  `/dashboard/drive` page reads `?drive=connected` / `?error=...` query params (set by the
  backend's OAuth callback redirect) to show a one-line status banner.

### Navigation & UI (after a design discussion with the user — see session history)

* **`/dashboard/*` is now four separate pages** (`departments`, `users`, `tasks`, `drive`)
  under a shared `app/dashboard/layout.tsx` (auth gate + header) with a `Sidebar`
  (`components/layout/Sidebar.tsx`) — not one long scrolling page anymore. `/dashboard` itself
  just redirects to `/dashboard/departments`. Each page is a thin wrapper that reads
  `useCurrentUser()` (already cached, no extra fetch) and renders its feature panel.
* **`Sidebar` is a fixed left column on desktop, a horizontal scrollable bar on small screens**
  — chosen deliberately over a hamburger/drawer menu, since the agreed scope was "don't break
  mobile layout," not a fully mobile-optimized nav (see the UI design discussion).
* **`ToastProvider`/`useToast`** (`components/ui/Toast.tsx`, wired into `app/providers.tsx`) —
  every mutation across `organization`/`tasks`/`drive` now reports success or failure via a
  toast, closing the gap where a successful action (e.g. deleting a department) previously left
  the page silently updating with no confirmation. Toasts are additive to, not a replacement
  for, inline field-level validation errors that need to stay visible.
* `EmptyState` usages across all four pages now include a one-line next-step hint (e.g. "Tạo
  phòng ban đầu tiên bên dưới") instead of just naming what's missing.

## Running locally (once dependencies are installed)

```bash
node -v              # confirm Node 20+ is on PATH
npm install
cp .env.example .env.local   # then point NEXT_PUBLIC_API_BASE_URL at your running backend
npm run dev
```

Log in as `binmit1` / `binmit1` (or any of `binmit2`–`binmit4` — see backend README for who's
who) once the backend is running with its dev seed data.

## Testing

```bash
npm run lint
npx tsc --noEmit     # type-check
npm test             # Jest + React Testing Library, once test files exist under src/
```

**Not yet written**: automated component tests. Phase 1 was verified by hand in a real browser
(see "Verified" below) — real evidence it works today, but not a regression guard. Add Jest/RTL
tests for `LoginForm`, `DepartmentManager`, and `UserManager` before building Phase 2 on top.
End-to-end tests (Playwright/Cypress) are still deferred per CLAUDE.md section 29 (don't add a
dependency before it earns its keep) — reconsider once there's a multi-page flow worth covering.

## Verified — Phase 1 (2026-09-24, this machine)

* `npx tsc --noEmit` — clean (one real error caught and fixed: `allowedLevels[0]` is typed
  `AuthorityLevel | undefined` under `noUncheckedIndexedAccess`, since an EMPLOYEE's allowed-level
  list is empty).
* Full browser session against the real backend: logged in as `binmit1` (EXECUTIVE), saw the
  real company name and every department/user created via the API in earlier testing, created a
  new department and a new team through the UI, viewed a team's members. Logged out, logged in
  as `binmit2` (EMPLOYEE), and confirmed the UI correctly renders a read-only department/team
  view with no user-management section at all and no delete controls — matching exactly what the
  backend would reject if called directly.
* `SameSite=Lax` on the auth cookie (a deviation from the original plan's `Strict` — see backend
  `AuthController` javadoc) works correctly across the frontend's `localhost:3000` and backend's
  `localhost:8080`: no CORS or cookie-not-sent issues in the real browser test.

## Verified — Phase 2 (2026-09-25, this machine)

* `npx tsc --noEmit` — clean.
* Created a task for a specific employee through the `CreateTaskForm` UI (assignee dropdown
  populated from the real `GET /users` list). Logged in as that employee: the task appeared with
  "Nhận"/"Từ chối" buttons; clicking "Nhận" updated its status badge to "Đã nhận" and swapped the
  button to "Hoàn thành" — a real state change round-tripped through the backend, not a local-only
  UI toggle.
* Same employee's task list also showed a department-wide task (assigned to their department, not
  to them personally) with **no** action buttons at all, correctly matching the backend rule that
  only a department head or executive may act on a department-targeted task.

## Verified — Phase 3 (2026-09-25, this machine)

* `npx tsc --noEmit` — clean.
* Full browser session: catalog and access-request tables render real data with correct
  per-viewer action buttons (only the owning department's head/executive see Duyệt/Từ chối).
  Clicking "Kết nối Google Drive" genuinely navigated to `accounts.google.com` and returned
  Google's own `Error 401: invalid_client` — proving the redirect wiring is correct; a real
  Client ID from you is the only missing piece (see backend README's "Still needs your action").
* **Not verified**: the actual OAuth consent screen, and a folder registration/approval that
  succeeds against real Google APIs — both need your real Google login, which I can't do myself.

## Verified — Navigation & UI overhaul (2026-09-27, this machine)

* `npx tsc --noEmit` — clean.
* Full browser session: login → lands on `/dashboard/departments`; sidebar correctly highlights
  the active page across all four sections; creating and deleting a department both produced the
  correct Toast ("Đã tạo phòng ban" / "Đã xoá phòng ban") in addition to the table updating.
* Resized to a 375px mobile viewport on all four pages: sidebar correctly collapses to a
  horizontal scrollable bar, the multi-field user-creation form stacks to one column, and — key
  check — `document.body.scrollWidth` stayed equal to the viewport width on every page (no
  page-level horizontal overflow); the wide `Nhân sự` table scrolls only within its own
  container (`Table`'s existing `overflow-x-auto`), exactly as intended.
