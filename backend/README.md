# Backend — Spring Boot API

Java 17 + Spring Boot 3, SQL Server, Maven. Status: **Phase 1 (identity & organization),
Phase 2 (task assignment), and Phase 3 (Google Drive access requests) verified as far as
possible without your real Google OAuth credentials** — see "Verified" sections below,
and the Phase 3 section's "Still needs your action" for exactly what's left. Stack-wide
conventions this structure implements are in the root
[CLAUDE.md § 46](../CLAUDE.md#46-tech-stack-and-project-structure); read that before adding code.
The design decisions for each phase (why Position is separate from User, why a task's assignee
is USER-or-DEPARTMENT with no TEAM target, etc.) are recorded in the approved plans referenced
from this project's session history — ask if you need the rationale restated.

## What exists now

Real authentication and a 3-level org model, replacing the old placeholder auth:

* **`modules/identity`** — `Company` → `Department` → `Team` → `User`/`Position`. A user's
  company is fixed; their authority tier (`EXECUTIVE`, `DEPARTMENT_HEAD`, `TEAM_LEAD`,
  `EMPLOYEE`) and org placement live in a separate `Position` row. Multiple people can hold
  `EXECUTIVE` (CEO/CTO/COO all get the same permissions, distinguished only by a display
  `title`) or `DEPARTMENT_HEAD` for the same department at once — see `PositionEntity` and
  `UserManagementServiceImpl` for exactly how scope is checked.
* **Login is a cookie, not a bearer token in the response body** — `POST /api/v1/auth/login`
  sets an httpOnly `access_token` cookie (`SameSite=Lax`, see `AuthController`'s javadoc for
  why not `Strict`); `JwtAuthenticationFilter` reads it on every request and rebuilds a full
  `UserPrincipal` from the token's claims (no DB hit per request).
* **Authorization is two-layered**: `@PreAuthorize` on controllers checks only the authority
  tier (e.g. "must be at least a TEAM_LEAD"); `OrganizationServiceImpl`/`UserManagementServiceImpl`
  re-check that the specific department/team/user actually belongs to the caller's company (and,
  for DEPARTMENT_HEAD/TEAM_LEAD, their own department/team) before acting — never trusting an id
  the client sent for that purpose (CLAUDE.md section 9/10). Cross-company access reads as 404
  (hides existence); same-company-wrong-scope reads as 403.
* The old reference `sample` module has been deleted (migration `V2__drop_sample_module.sql`)
  now that a real module exists to copy the pattern from instead.

**Phase 2 adds `modules/tasks`** — a task's target (`assigneeType`) is either one `USER` or an
entire `DEPARTMENT` acting as a shared queue (no `TEAM` target — see the Phase 2 plan). Status
is `ASSIGNED → ACCEPTED|DECLINED → DONE`, or `CANCELLED` before `DONE`; there is no separate
"in progress" step. Who can assign to whom mirrors `UserManagementServiceImpl`'s hierarchy
(EXECUTIVE anywhere in their company, DEPARTMENT_HEAD only within their own department,
TEAM_LEAD only to their own team's members) — see `TaskServiceImpl.assertCallerCanActOnAssignment`,
which is also reused to decide who may cancel someone else's task. A `DEPARTMENT`-targeted task
can only be accepted/declined/completed by that department's head or an executive, not by a
regular member (they can view it, not act on it) — this was a deliberate simplification to
avoid a "first person to claim it" race condition; see the Phase 2 plan if that needs revisiting.

**Phase 3 adds `modules/drive`** — each user connects their *own* Google Drive via OAuth (no
shared company account). No Google SDK dependency: `GoogleDriveClient` calls Google's OAuth and
Drive REST APIs directly with Spring's `RestClient` (CLAUDE.md section 29 — avoid an
unnecessary dependency). Registering a folder means pasting its Drive link/ID, not browsing via
the API (a deliberate scope cut — see the Phase 3 plan). The company-wide catalog
(`department_drive_folders`) lets any department expose a folder; another department's member
requests access (`folder_access_requests`); approval — by that folder's department head or an
executive, mirroring the Phase 2 authorization pattern — calls the real Drive API to grant the
*requester's own connected account* reader access (Drive permissions are per-email, not
per-department). Refresh tokens are AES-GCM encrypted at rest by `TokenEncryptionService`
before being stored (CLAUDE.md section 7) — encrypt/decrypt are explicit service calls, not a
JPA `AttributeConverter`, to keep this security-sensitive path easy to read and test.

### Still needs your action

Phase 3 needs a Google Cloud OAuth Client ID/Secret, which only you can create (it needs your
Google account):

1. https://console.cloud.google.com → create or pick a project.
2. **APIs & Services → Library** → enable **Google Drive API**.
3. **APIs & Services → OAuth consent screen** → type **External** → fill in an app name → add
   your test Gmail addresses under **Test users** (whichever accounts you'll log `binmit1`/
   `binmit2` in as — "Testing" mode supports up to 100 test users, no Google review needed).
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID** → type
   **Web application** → Authorized redirect URI: `http://localhost:8080/api/v1/drive/oauth2/callback`.
5. Set the three new environment variables below, then click "Kết nối Google Drive" in the app
   and sign in with one of your test accounts — that step needs your real login, so it's the one
   thing I can't do or verify myself. Tell me what happens (success, or the exact error) and I'll
   take it from there.

## Before this goes anywhere near production

1. **Rename the placeholder package** (`com.company.project` and the Maven `groupId`/`artifactId`).
2. **`DevDataSeeder`** (`@Profile("dev")`) creates `binmit1`–`binmit4` with passwords equal to
   their usernames — real, BCrypt-hashed credentials in a real database, just weak and
   throwaway. It only runs under the `dev` Spring profile; confirm that profile is never active
   in a real deployment before you rely on that.
3. **Access tokens are short-lived (15 min) with no refresh token yet** — logging back in is
   the only recovery once one expires. Refresh-token rotation is an explicit CLAUDE.md
   section 8 (auth design) decision for a later phase, not an oversight.
4. **`JWT_SECRET`, `DB_USERNAME`, `DB_PASSWORD`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
   `DRIVE_TOKEN_ENCRYPTION_KEY`** are required environment variables with no default — the app
   fails to start rather than run with a guessable secret. Generate the encryption key with
   `openssl rand -base64 32`; it's yours to generate (not from Google) and must stay the same
   across restarts or previously-stored refresh tokens become undecryptable.
5. **EXECUTIVE is excluded from creating folder access requests** (Phase 3 plan simplification —
   they already have full rights, so "request access" doesn't fit their scope). Revisit if that
   turns out to matter in practice.

## Structure

See [CLAUDE.md § 46.1](../CLAUDE.md#461-backend-structure-spring-boot) for the layering
convention `modules/identity`, `modules/tasks`, and `modules/drive` all follow (controller →
service → repository → entity, DTOs at the boundary). Copy their shape for the next real module
(AI suggestions, Phase 4).

## Running locally

Maven isn't required on PATH — a local copy was extracted to
`%USERPROFILE%\tools\apache-maven-3.9.16` and is invoked by full path below.

```powershell
& "$env:USERPROFILE\tools\apache-maven-3.9.16\bin\mvn.cmd" -v   # confirm JDK 17+ and Maven

$env:JWT_SECRET   = "dev-only-secret-change-me-please-1234567890"
$env:DB_USERNAME  = "app_user"
$env:DB_PASSWORD  = "<the app_user password you set in SQL Server>"
$env:DRIVE_TOKEN_ENCRYPTION_KEY = "<output of: openssl rand -base64 32>"
$env:GOOGLE_CLIENT_ID     = "<from Google Cloud Console — see Phase 3 section above>"
$env:GOOGLE_CLIENT_SECRET = "<from Google Cloud Console>"

& "$env:USERPROFILE\tools\apache-maven-3.9.16\bin\mvn.cmd" spring-boot:run "-Dspring-boot.run.profiles=dev"
```

The `dev` profile connects to `jdbc:sqlserver://localhost:1433;databaseName=project_dev`. If you
haven't created that database/login yet:

```powershell
sqlcmd -S localhost -E -C -Q "CREATE DATABASE project_dev;"
sqlcmd -S localhost -E -C -Q "CREATE LOGIN app_user WITH PASSWORD = '<choose a strong password>', CHECK_POLICY = ON;"
sqlcmd -S localhost -E -C -d project_dev -Q "CREATE USER app_user FOR LOGIN app_user; ALTER ROLE db_owner ADD MEMBER app_user;"
```

On first startup, Flyway creates the schema and `DevDataSeeder` inserts 2 companies, 4
departments, and `binmit1`–`binmit4` (password = username) — see "Seed data" below for exactly
who is who.

Swagger UI: `http://localhost:8080/swagger-ui.html`. Health check: `http://localhost:8080/actuator/health`.

## Seed data (dev profile only)

| Username | Company | Position | Department |
|---|---|---|---|
| `binmit1` | Doanh nghiệp A | EXECUTIVE ("CEO") | — |
| `binmit2` | Doanh nghiệp A | EMPLOYEE | Kỹ thuật |
| `binmit3` | Doanh nghiệp B | EXECUTIVE ("CEO") | — |
| `binmit4` | Doanh nghiệp B | EMPLOYEE | Kinh doanh |

Each company also gets a second department (A: Truyền thông, B: Vận hành) with no members yet,
so there's something to assign people to right away. Password for each = the username.

This local database also has a few extra users created ad hoc while testing Phases 1–3
(`depthead2`, `cto_a`, `depthead3`, `teamlead1` — all password `password123`) — those exist only
in this machine's database, not in `DevDataSeeder`, so a fresh clone won't have them.

## Testing

```powershell
& "$env:USERPROFILE\tools\apache-maven-3.9.16\bin\mvn.cmd" test      # unit tests: 19 passing (identity + tasks + drive authorization rules)
& "$env:USERPROFILE\tools\apache-maven-3.9.16\bin\mvn.cmd" verify    # integration tests, requires Docker for Testcontainers
```

`UserManagementServiceImplTest` (6), `TaskServiceImplTest` (7), `DriveCatalogServiceImplTest` (2),
and `FolderAccessRequestServiceImplTest` (4) cover the hierarchy/authorization rules for all
three modules with Mockito — no real database, no real Google calls. **Still not written**:
MockMvc/`@SpringBootTest` integration tests, and anything covering `OrganizationServiceImpl`,
`GoogleDriveClient`, or the controllers directly. Everything in the "Verified" sections below
beyond those 19 unit tests was checked by hand (curl + a real browser) — real evidence the code
works today, not a regression guard. Docker was not installed/verified in this environment, so
Testcontainers-based integration tests have not been run at all.

## Verified — Phase 1 (2026-09-24, this machine, by hand — see caveat above)

* `mvn compile` and `spring-boot:run -Dspring-boot.run.profiles=dev` — starts clean, Flyway
  applies `V2`–`V4`, `DevDataSeeder` inserts the seed data (confirmed with `sqlcmd`, including
  that Vietnamese diacritics round-trip correctly — see bug #1 below).
* Login (`binmit1`/`binmit1`) → 200, cookie set, `/auth/me` returns the right company/position.
* Wrong password and no-cookie access → both 401 with the same generic message (no user
  enumeration).
* `binmit1` (EXECUTIVE) creates a department → 201. `binmit2` (EMPLOYEE) attempts the same →
  403.
* `binmit1` (company A) attempts to delete a department belonging to company B → 404 (tenant
  isolation holds under a direct, deliberate cross-tenant id guess, not just normal use).
* Created a `DEPARTMENT_HEAD` for "Kỹ thuật"; they can create a team in their own department
  (201) but not in a different department of the same company (403).
* Created a second `EXECUTIVE` ("CTO") in company A alongside the existing CEO; both have full,
  independent EXECUTIVE rights in that company — confirms multiple executives per company works
  as designed.
* Soft-deleted a user: immediately can no longer log in, no longer appears in `GET /users`.
* An EXECUTIVE cannot delete their own account (`CANNOT_DELETE_SELF`, 422).
* Full browser run (Next.js frontend against this backend): login, dashboard shows real
  company/department/team names, department/team/user management UI works for `binmit1`
  end-to-end (create department, view/create team, create a second executive), and `binmit2`
  (EMPLOYEE) sees a correctly stripped-down, view-only version of the same screens.

Two real bugs were caught by running this, not by reading the code:

1. **Circular bean dependency in `SecurityConfig`**: its constructor originally required a
   `PasswordEncoder`, but `SecurityConfig` itself defines the `passwordEncoder()` bean — Spring
   can't construct the class in order to call a method on it to satisfy its own constructor.
   Fixed by instantiating `BCryptPasswordEncoder` directly inside `authenticationProvider()`
   instead of injecting the bean.
2. **`DaoAuthenticationProvider` requires a `UserDetailsService`** at construction time in
   Spring Security 6 — this was the exact crash documented as a known gap in the previous
   version of this file. Fixed properly this time by wiring a real one
   (`CustomUserDetailsService`, backed by `UserRepository`/`PositionRepository`) instead of
   leaving the bean out.

## Verified — Phase 2 (2026-09-25, this machine)

* `mvn test` — all 13 unit tests pass (6 identity + 7 tasks).
* `spring-boot:run` against the same `project_dev` database used in Phase 1 — Flyway applies
  `V5__create_tasks.sql` cleanly on top of the existing schema; Phase 1 data (companies,
  departments, users created during Phase 1 testing) is untouched.
* Full curl run through every rule in the Phase 2 plan's test matrix (TC-11 through TC-21):
  EXECUTIVE assigns to a specific user and to a whole department (both 201); DEPARTMENT_HEAD
  assigning to a different department's shared queue → 403; TEAM_LEAD assigning to someone
  outside their team → 403 (see bug below); EMPLOYEE creating a task at all → 403; the exact
  assignee accepting their own task → 200; someone else trying to act on it → 403; a
  department's head accepting/completing a department-wide task → 200; a regular member of
  that department trying the same → 403; re-accepting an already-`ACCEPTED` task → 422
  (`INVALID_TASK_STATUS`), not a generic error; the assigner cancelling before `DONE` → 200.
* `GET /tasks` scoping verified with a task deliberately assigned to someone outside the
  tester's department (an EXECUTIVE-only task) — confirmed invisible to a `DEPARTMENT_HEAD`
  and an `EMPLOYEE` in an unrelated department, visible only to the EXECUTIVE, and a
  company-B user saw zero company-A tasks (tenant isolation holds for tasks too).
* Full browser run: EXECUTIVE creates a task for a specific employee via the UI form; logged in
  as that employee, the task appeared with "Nhận"/"Từ chối" buttons, clicking "Nhận" updated its
  status to "Đã nhận" and swapped the button to "Hoàn thành" — and a department-wide task in the
  same list correctly showed **no** action buttons for that same regular employee.

One real bug was caught by running TC-14, not by reading the code:

3. **`Optional.map(field -> field.getX())` silently swallows a legitimate `null` field into
   "not found."** `assertCallerCanActOnAssignment` looked up a target's position and did
   `.map(PositionEntity::getTeamId).orElseThrow(...)` to compare team scope — but
   `Optional.map` collapses to empty when the mapper returns `null`, which is exactly what
   happens for a target with no team. A `TEAM_LEAD` assigning to a same-department-but-
   different-team employee got a misleading `404 "User not found"` instead of the intended
   `403 Forbidden`. Fixed by fetching the whole `PositionEntity` first and comparing its field
   directly, matching the (safe) pattern `UserManagementServiceImpl` already used in Phase 1.

## Verified — Phase 3 (2026-09-25, this machine)

Real Google credentials were **not** available yet (waiting on you to create them — see "Still
needs your action" above), so this used a placeholder `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`.
Everything that doesn't require Google to actually accept those credentials was verified for
real; the parts that do are explicitly called out as not verified, not glossed over.

* `mvn test` — all 19 unit tests pass (added 2 + 4 for `modules/drive`).
* `spring-boot:run` — Flyway applies `V6`–`V8` cleanly on top of the existing schema.
* Full curl run through the parts of the Phase 3 test matrix that don't need a real Google
  round trip: registering a folder for a different department than your own → 403 (a real bug —
  see below); registering without connecting Drive first → 422 `DRIVE_NOT_CONNECTED`; requesting
  access to your own department's own folder → 422 `OWN_DEPARTMENT_FOLDER`; the requester
  approving their own request, and the *wrong* department's head approving someone else's → both
  403; the correct department head approving/rejecting → passes the authorization check;
  re-deciding an already-rejected request → 422 `INVALID_REQUEST_STATUS`, not a generic error;
  an invalid/expired OAuth `state` on the callback → redirects to the frontend with
  `?error=expired_or_invalid_state`, nothing stored.
* With a fake (locally-encrypted, not Google-issued) refresh token inserted directly into the
  database as a test fixture: confirmed that reaching the real Google token-refresh endpoint
  with bad credentials fails as a clean `502 DRIVE_API_ERROR` — no stack trace, no raw Google
  error payload leaked to the client (CLAUDE.md section 14).
* Full browser run: catalog and access-request lists render real data (including correct
  newest-first ordering and per-row action buttons matching each viewer's authority), and
  clicking "Kết nối Google Drive" as `binmit1` genuinely navigated to `accounts.google.com` and
  came back with Google's own `Error 401: invalid_client` — confirming the redirect, `state`
  handling, and query-string construction all reach Google's real servers correctly; the only
  missing piece is a real Client ID.
* Test fixtures (the fake connections, catalog folder, and the two requests against it) were
  deleted after testing — they were never real data, just a way to exercise the approval/reject
  logic without a working Google connection.

**Not verified — needs your real Google login**: actually completing the OAuth consent screen,
a folder being registered by successfully calling `files.get`, and a real `permissions.create`
call actually sharing a folder. I cannot click through Google's real sign-in screen myself (it
needs your account, and Google blocks automated browsers there anyway) — do that step once you
have a Client ID/Secret and tell me what happens.

One real bug was caught by running the register-folder flow, not by reading the code:

4. **`registerFolder` silently ignored a non-executive's mismatched `departmentId` instead of
   rejecting it.** The original code just used the caller's own department unconditionally,
   so sending a different `departmentId` in the request body had no effect — safe, but it meant
   TC-23 ("register for a department that isn't yours → 403") could never actually happen; the
   field was accepted and quietly discarded instead. Fixed to explicitly reject a mismatched
   value with `AccessDeniedException` (403), matching the documented test case and failing
   loudly on a suspicious request instead of silently overriding it.
5. **The OAuth authorization URL's `scope` parameter went out with a literal, unencoded space**
   (`UriComponentsBuilder.build()` does not percent-encode by default) instead of `%20` between
   the two requested scopes. Found by inspecting the actual `Location` header, not by reading
   the code. Fixed by calling `.encode()` before `.toUriString()` in both places this project
   builds a redirect URL.
