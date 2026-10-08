# Backend - Spring Boot API

Java 17 + Spring Boot 3, SQL Server, Maven. Status: **Phases 1-5 verified end to end** (Phase 3's
Google OAuth consent step and Phase 4's real OTP inbox delivery were the only two manual actions
that needed you - both done) - see "Verified" sections below. Stack-wide
conventions this structure implements are in the root
[CLAUDE.md § 46](../CLAUDE.md#46-tech-stack-and-project-structure); read that before adding code.
The design decisions for each phase (why Position is separate from User, why a task's assignee
is USER-or-DEPARTMENT with no TEAM target, etc.) are recorded in the approved plans referenced
from this project's session history - ask if you need the rationale restated.

## What exists now

Real authentication and a 3-level org model, replacing the old placeholder auth:

* **`modules/identity`** - `Company` → `Department` → `Team` → `User`/`Position`. A user's
  company is fixed; their authority tier (`EXECUTIVE`, `DEPARTMENT_HEAD`, `TEAM_LEAD`,
  `EMPLOYEE`) and org placement live in a separate `Position` row. Multiple people can hold
  `EXECUTIVE` (CEO/CTO/COO all get the same permissions, distinguished only by a display
  `title`) or `DEPARTMENT_HEAD` for the same department at once - see `PositionEntity` and
  `UserManagementServiceImpl` for exactly how scope is checked.
* **Login is a cookie, not a bearer token in the response body** - `POST /api/v1/auth/login`
  sets an httpOnly `access_token` cookie (`SameSite=Lax`, see `AuthController`'s javadoc for
  why not `Strict`); `JwtAuthenticationFilter` reads it on every request and rebuilds a full
  `UserPrincipal` from the token's claims (no DB hit per request).
* **Authorization is two-layered**: `@PreAuthorize` on controllers checks only the authority
  tier (e.g. "must be at least a TEAM_LEAD"); `OrganizationServiceImpl`/`UserManagementServiceImpl`
  re-check that the specific department/team/user actually belongs to the caller's company (and,
  for DEPARTMENT_HEAD/TEAM_LEAD, their own department/team) before acting - never trusting an id
  the client sent for that purpose (CLAUDE.md section 9/10). Cross-company access reads as 404
  (hides existence); same-company-wrong-scope reads as 403.
* The old reference `sample` module has been deleted (migration `V2__drop_sample_module.sql`)
  now that a real module exists to copy the pattern from instead.

**Phase 2 adds `modules/tasks`** - a task's target (`assigneeType`) is either one `USER` or an
entire `DEPARTMENT` acting as a shared queue (no `TEAM` target - see the Phase 2 plan). Status
is `ASSIGNED → ACCEPTED|DECLINED → DONE`, or `CANCELLED` before `DONE`; there is no separate
"in progress" step. Who can assign to whom mirrors `UserManagementServiceImpl`'s hierarchy
(EXECUTIVE anywhere in their company, DEPARTMENT_HEAD only within their own department,
TEAM_LEAD only to their own team's members) - see `TaskServiceImpl.assertCallerCanActOnAssignment`,
which is also reused to decide who may cancel someone else's task. A `DEPARTMENT`-targeted task
can only be accepted/declined/completed by that department's head or an executive, not by a
regular member (they can view it, not act on it) - this was a deliberate simplification to
avoid a "first person to claim it" race condition; see the Phase 2 plan if that needs revisiting.

**Phase 3 adds `modules/drive`** - each user connects their *own* Google Drive via OAuth (no
shared company account). No Google SDK dependency: `GoogleDriveClient` calls Google's OAuth and
Drive REST APIs directly with Spring's `RestClient` (CLAUDE.md section 29 - avoid an
unnecessary dependency). Registering a folder means pasting its Drive link/ID, not browsing via
the API (a deliberate scope cut - see the Phase 3 plan). The company-wide catalog
(`department_drive_folders`) lets any department expose a folder; another department's member
requests access (`folder_access_requests`); approval - by that folder's department head or an
executive, mirroring the Phase 2 authorization pattern - calls the real Drive API to grant the
*requester's own connected account* reader access (Drive permissions are per-email, not
per-department). Refresh tokens are AES-GCM encrypted at rest by `TokenEncryptionService`
before being stored (CLAUDE.md section 7) - encrypt/decrypt are explicit service calls, not a
JPA `AttributeConverter`, to keep this security-sensitive path easy to read and test.

### Still needs your action

Phase 3 needs a Google Cloud OAuth Client ID/Secret, which only you can create (it needs your
Google account):

1. https://console.cloud.google.com → create or pick a project.
2. **APIs & Services → Library** → enable **Google Drive API**.
3. **APIs & Services → OAuth consent screen** → type **External** → fill in an app name → add
   your test Gmail addresses under **Test users** (whichever accounts you'll log `binmit1`/
   `binmit2` in as - "Testing" mode supports up to 100 test users, no Google review needed).
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID** → type
   **Web application** → Authorized redirect URI: `http://localhost:8080/api/v1/drive/oauth2/callback`.
5. Set the three new environment variables below, then click "Kết nối Google Drive" in the app
   and sign in with one of your test accounts - that step needs your real login, so it's the one
   thing I can't do or verify myself. Tell me what happens (success, or the exact error) and I'll
   take it from there.

**Phase 4 adds**: no new module - additions to `modules/identity`. A forgot-password OTP flow
(`password_reset_otps`, `EmailService`/`EmailServiceImpl` via `spring-boot-starter-mail`),
self-service change-password and recovery-email endpoints, an EXECUTIVE-only company rename
(`CompanyController`), and two employee-lifecycle gaps identified as part of this phase's
explicit "add what a scalable platform needs" ask: `PATCH /users/{id}/position` (promote/transfer
- closes the old `Position` row and opens a new one, so promotion history is free) and
`PATCH /users/{id}/status` (suspend/restore login without the permanent soft-delete `DELETE`
already had). `phone`/`employee_code`/`start_date` were added to `users` for basic HR data. On
the frontend: a 4-theme system (`light`/`dark`/`gray`/`pink`) driven by CSS variables + a
`data-theme` attribute (see `frontend/src/app/globals.css`), a `/dashboard/settings` page, and a
public `/forgot-password` 2-step flow.

**SMTP is optional, not required-with-no-default** like `JWT_SECRET` - see `EmailServiceImpl`'s
javadoc. Leaving `SMTP_USERNAME`/`SMTP_PASSWORD` unset means the rest of the app runs completely
normally; only `POST /auth/forgot-password` fails with a clean `503 EMAIL_SERVICE_UNAVAILABLE`
(identical for every username, so it still never leaks account existence).

### Still needs your action (Phase 4)

Real OTP email needs a Gmail **App Password**, which only you can create (it needs your Google
account and 2-Step Verification turned on):

1. https://myaccount.google.com/security → turn on **2-Step Verification** if it isn't already
   (needs a phone number to confirm).
2. Once that's on, go to https://myaccount.google.com/apppasswords → name it anything (e.g.
   `project-smtp`) → Create. Google shows a 16-character password once - copy it.
3. Set the two new environment variables below, then hit "Gửi mã OTP" on `/forgot-password` with
   a seed username (all seed accounts are bound to the mailbox in `DEV_SEED_RECOVERY_EMAIL` - see "Seed data")
   and confirm the email actually arrives. That inbox check needs your access, so it's the one
   thing I can't verify myself.

```powershell
$env:SMTP_USERNAME = "<the Gmail address you created the App Password for>"
$env:SMTP_PASSWORD = "<the 16-character App Password, no spaces>"
```

**Phase 5 adds `modules/kpi`** - a monthly KPI score computed from tasks personally assigned to
a user (`completionRate`/`onTimeRate`, weighted by a company-wide `completionWeight` that only an
EXECUTIVE can change) plus a descriptive (non-monetary) incentive-tier table, also EXECUTIVE-only
to edit but readable by everyone (transparency of the formula). Viewing someone ELSE's KPI reuses
the exact same hierarchy rules as `UserManagementServiceImpl` (EXECUTIVE/company,
DEPARTMENT_HEAD/own department, TEAM_LEAD/own team) rather than inventing a new authorization
rule - see `KpiServiceImpl.assertCallerCanView`. No new schema tables beyond `kpi_configs`
(`V11`) and `kpi_incentive_tiers` (`V12`); everything else reuses `TaskEntity` fields
(`priority`, `dueDate`, `completedAt`) that already existed but were never surfaced anywhere.

## Before this goes anywhere near production

1. **Rename the placeholder package** (`com.company.project` and the Maven `groupId`/`artifactId`).
2. **`DevDataSeeder`** (`@Profile("dev")`) creates `binmit1`-`binmit4` with passwords equal to
   their usernames - real, BCrypt-hashed credentials in a real database, just weak and
   throwaway. It only runs under the `dev` Spring profile; confirm that profile is never active
   in a real deployment before you rely on that.
3. **Access tokens are short-lived (15 min); a server-side session (Phase 39) renews them** - a
   sign-in lasts until 2 hours without action or 7 days, and ends at once on sign-out, password
   change or reset, or when the account is deactivated.
4. **`JWT_SECRET`, `DB_USERNAME`, `DB_PASSWORD`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
   `DRIVE_TOKEN_ENCRYPTION_KEY`, `CRM_DATA_KEY`** are required environment variables with no default - the app
   fails to start rather than run with a guessable secret. Generate the encryption key with
   `openssl rand -base64 32`; it's yours to generate (not from Google) and must stay the same
   across restarts or previously-stored refresh tokens become undecryptable.
5. **EXECUTIVE is excluded from creating folder access requests** (Phase 3 plan simplification -
   they already have full rights, so "request access" doesn't fit their scope). Revisit if that
   turns out to matter in practice.

## Structure

See [CLAUDE.md § 46.1](../CLAUDE.md#461-backend-structure-spring-boot) for the layering
convention `modules/identity`, `modules/tasks`, and `modules/drive` all follow (controller →
service → repository → entity, DTOs at the boundary). Copy their shape for the next real module
(AI suggestions, Phase 4).

## Running locally

Maven isn't required on PATH - a local copy was extracted to
`%USERPROFILE%\tools\apache-maven-3.9.16` and is invoked by full path below.

```powershell
& "$env:USERPROFILE\tools\apache-maven-3.9.16\bin\mvn.cmd" -v   # confirm JDK 17+ and Maven

$env:JWT_SECRET   = "dev-only-secret-change-me-please-1234567890"
$env:DB_USERNAME  = "app_user"
$env:DB_PASSWORD  = "<the app_user password you set in SQL Server>"
$env:DRIVE_TOKEN_ENCRYPTION_KEY = "<output of: openssl rand -base64 32>"
$env:CRM_DATA_KEY = "<output of: openssl rand -base64 32 - Phase 38; a different value from the one above>"
$env:GOOGLE_CLIENT_ID     = "<from Google Cloud Console - see Phase 3 section above>"
$env:GOOGLE_CLIENT_SECRET = "<from Google Cloud Console>"
$env:SMTP_USERNAME = "<Gmail address - see Phase 4 section above; omit to skip forgot-password>"
$env:SMTP_PASSWORD = "<Gmail App Password - see Phase 4 section above; omit to skip forgot-password>"

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
departments, and `binmit1`-`binmit4` (password = username) - see "Seed data" below for exactly
who is who.

Swagger UI: `http://localhost:8080/swagger-ui.html`. Health check: `http://localhost:8080/actuator/health`.

## Seed data (dev profile only)

| Username | Company | Position | Department |
|---|---|---|---|
| `binmit1` | Doanh nghiệp A | EXECUTIVE ("CEO") | - |
| `binmit2` | Doanh nghiệp A | EMPLOYEE | Kỹ thuật |
| `binmit3` | Doanh nghiệp B | EXECUTIVE ("CEO") | - |
| `binmit4` | Doanh nghiệp B | EMPLOYEE | Kinh doanh |

Each company also gets a second department (A: Truyền thông, B: Vận hành) with no members yet,
so there's something to assign people to right away. Password for each = the username.

**All seed accounts share one real recovery email, the mailbox set in `DEV_SEED_RECOVERY_EMAIL`** (git-ignored
`backend/.env.local`; Phase 4 plan,
explicit request) so the forgot-password OTP flow can actually be tested end to end on this
machine - a deliberate dev-only convention, never appropriate for real employees (see
`DevDataSeeder`'s javadoc). This local database's `users.email` column was also bulk-updated to
that address for every pre-existing row (including the ad-hoc test accounts below), since
`DevDataSeeder` only runs its insert logic once and never touches already-seeded rows.

This local database also has a few extra users created ad hoc while testing Phases 1-3
(`depthead2`, `cto_a`, `depthead3`, `teamlead1` - all password `password123`) - those exist only
in this machine's database, not in `DevDataSeeder`, so a fresh clone won't have them.

**`binmit1`'s password on this machine is now `binmit1newpw`**, not `binmit1` - changed while
verifying the new change-password endpoint by hand during Phase 4 testing. A fresh clone/reseed
still gets the original `binmit1`/`binmit1`.

## Testing

```powershell
& "$env:USERPROFILE\tools\apache-maven-3.9.16\bin\mvn.cmd" test      # unit tests: 39 passing
& "$env:USERPROFILE\tools\apache-maven-3.9.16\bin\mvn.cmd" verify    # integration tests, requires Docker for Testcontainers
```

`UserManagementServiceImplTest` (10), `AuthServiceImplTest` (8), `KpiServiceImplTest` (8 -
Phase 5's scope rules plus the score math's edge cases: zero tasks, no due dates, cancelled tasks
excluded), `TaskServiceImplTest` (7), `DriveCatalogServiceImplTest` (2), and
`FolderAccessRequestServiceImplTest` (4) cover the hierarchy/authorization rules for all modules
with Mockito - no real database, no real Google calls, no real SMTP send. **Still not written**:
MockMvc/`@SpringBootTest` integration tests, and anything covering `OrganizationServiceImpl`,
`GoogleDriveClient`, or the controllers directly. Everything in the "Verified" sections below
beyond those 19 unit tests was checked by hand (curl + a real browser) - real evidence the code
works today, not a regression guard. Docker was not installed/verified in this environment, so
Testcontainers-based integration tests have not been run at all.

## Verified - Phase 1 (2026-09-24, this machine, by hand - see caveat above)

* `mvn compile` and `spring-boot:run -Dspring-boot.run.profiles=dev` - starts clean, Flyway
  applies `V2`-`V4`, `DevDataSeeder` inserts the seed data (confirmed with `sqlcmd`, including
  that Vietnamese diacritics round-trip correctly - see bug #1 below).
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
  independent EXECUTIVE rights in that company - confirms multiple executives per company works
  as designed.
* Soft-deleted a user: immediately can no longer log in, no longer appears in `GET /users`.
* An EXECUTIVE cannot delete their own account (`CANNOT_DELETE_SELF`, 422).
* Full browser run (Next.js frontend against this backend): login, dashboard shows real
  company/department/team names, department/team/user management UI works for `binmit1`
  end-to-end (create department, view/create team, create a second executive), and `binmit2`
  (EMPLOYEE) sees a correctly stripped-down, view-only version of the same screens.

Two real bugs were caught by running this, not by reading the code:

1. **Circular bean dependency in `SecurityConfig`**: its constructor originally required a
   `PasswordEncoder`, but `SecurityConfig` itself defines the `passwordEncoder()` bean - Spring
   can't construct the class in order to call a method on it to satisfy its own constructor.
   Fixed by instantiating `BCryptPasswordEncoder` directly inside `authenticationProvider()`
   instead of injecting the bean.
2. **`DaoAuthenticationProvider` requires a `UserDetailsService`** at construction time in
   Spring Security 6 - this was the exact crash documented as a known gap in the previous
   version of this file. Fixed properly this time by wiring a real one
   (`CustomUserDetailsService`, backed by `UserRepository`/`PositionRepository`) instead of
   leaving the bean out.

## Verified - Phase 2 (2026-09-25, this machine)

* `mvn test` - all 13 unit tests pass (6 identity + 7 tasks).
* `spring-boot:run` against the same `project_dev` database used in Phase 1 - Flyway applies
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
  tester's department (an EXECUTIVE-only task) - confirmed invisible to a `DEPARTMENT_HEAD`
  and an `EMPLOYEE` in an unrelated department, visible only to the EXECUTIVE, and a
  company-B user saw zero company-A tasks (tenant isolation holds for tasks too).
* Full browser run: EXECUTIVE creates a task for a specific employee via the UI form; logged in
  as that employee, the task appeared with "Nhận"/"Từ chối" buttons, clicking "Nhận" updated its
  status to "Đã nhận" and swapped the button to "Hoàn thành" - and a department-wide task in the
  same list correctly showed **no** action buttons for that same regular employee.

One real bug was caught by running TC-14, not by reading the code:

3. **`Optional.map(field -> field.getX())` silently swallows a legitimate `null` field into
   "not found."** `assertCallerCanActOnAssignment` looked up a target's position and did
   `.map(PositionEntity::getTeamId).orElseThrow(...)` to compare team scope - but
   `Optional.map` collapses to empty when the mapper returns `null`, which is exactly what
   happens for a target with no team. A `TEAM_LEAD` assigning to a same-department-but-
   different-team employee got a misleading `404 "User not found"` instead of the intended
   `403 Forbidden`. Fixed by fetching the whole `PositionEntity` first and comparing its field
   directly, matching the (safe) pattern `UserManagementServiceImpl` already used in Phase 1.

## Verified - Phase 3 (2026-09-25, this machine)

Real Google credentials were **not** available yet (waiting on you to create them - see "Still
needs your action" above), so this used a placeholder `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`.
Everything that doesn't require Google to actually accept those credentials was verified for
real; the parts that do are explicitly called out as not verified, not glossed over.

* `mvn test` - all 19 unit tests pass (added 2 + 4 for `modules/drive`).
* `spring-boot:run` - Flyway applies `V6`-`V8` cleanly on top of the existing schema.
* Full curl run through the parts of the Phase 3 test matrix that don't need a real Google
  round trip: registering a folder for a different department than your own → 403 (a real bug -
  see below); registering without connecting Drive first → 422 `DRIVE_NOT_CONNECTED`; requesting
  access to your own department's own folder → 422 `OWN_DEPARTMENT_FOLDER`; the requester
  approving their own request, and the *wrong* department's head approving someone else's → both
  403; the correct department head approving/rejecting → passes the authorization check;
  re-deciding an already-rejected request → 422 `INVALID_REQUEST_STATUS`, not a generic error;
  an invalid/expired OAuth `state` on the callback → redirects to the frontend with
  `?error=expired_or_invalid_state`, nothing stored.
* With a fake (locally-encrypted, not Google-issued) refresh token inserted directly into the
  database as a test fixture: confirmed that reaching the real Google token-refresh endpoint
  with bad credentials fails as a clean `502 DRIVE_API_ERROR` - no stack trace, no raw Google
  error payload leaked to the client (CLAUDE.md section 14).
* Full browser run: catalog and access-request lists render real data (including correct
  newest-first ordering and per-row action buttons matching each viewer's authority), and
  clicking "Kết nối Google Drive" as `binmit1` genuinely navigated to `accounts.google.com` and
  came back with Google's own `Error 401: invalid_client` - confirming the redirect, `state`
  handling, and query-string construction all reach Google's real servers correctly; the only
  missing piece is a real Client ID.
* Test fixtures (the fake connections, catalog folder, and the two requests against it) were
  deleted after testing - they were never real data, just a way to exercise the approval/reject
  logic without a working Google connection.

**Not verified - needs your real Google login**: actually completing the OAuth consent screen,
a folder being registered by successfully calling `files.get`, and a real `permissions.create`
call actually sharing a folder. I cannot click through Google's real sign-in screen myself (it
needs your account, and Google blocks automated browsers there anyway) - do that step once you
have a Client ID/Secret and tell me what happens.

One real bug was caught by running the register-folder flow, not by reading the code:

4. **`registerFolder` silently ignored a non-executive's mismatched `departmentId` instead of
   rejecting it.** The original code just used the caller's own department unconditionally,
   so sending a different `departmentId` in the request body had no effect - safe, but it meant
   TC-23 ("register for a department that isn't yours → 403") could never actually happen; the
   field was accepted and quietly discarded instead. Fixed to explicitly reject a mismatched
   value with `AccessDeniedException` (403), matching the documented test case and failing
   loudly on a suspicious request instead of silently overriding it.
5. **The OAuth authorization URL's `scope` parameter went out with a literal, unencoded space**
   (`UriComponentsBuilder.build()` does not percent-encode by default) instead of `%20` between
   the two requested scopes. Found by inspecting the actual `Location` header, not by reading
   the code. Fixed by calling `.encode()` before `.toUriString()` in both places this project
   builds a redirect URL.

## Verified - Phase 4 (2026-09-28, this machine)

A real Gmail App Password was provided partway through this phase and used to verify the actual
send - see the update at the end of this section. Everything below the curl/browser bullets was
run before that, with `SMTP_USERNAME`/`SMTP_PASSWORD` left unset.

* `mvn test` - all 31 unit tests pass (12 new: 4 in `UserManagementServiceImplTest` for
  position-transfer/suspend-restore, 8 in the new `AuthServiceImplTest`).
* `spring-boot:run` - Flyway applies `V9`/`V10` cleanly on top of the existing schema.
* Full curl run: change-password with the wrong current password → 401
  `INVALID_CURRENT_PASSWORD`; with the right one → 200, and a fresh login with the new password
  succeeds. `forgot-password` for a real username and for `doesnotexist` both return the exact
  same `503 EMAIL_SERVICE_UNAVAILABLE` body while SMTP is unset (confirms the never-leak
  contract holds even in this degraded state, not just for a plain wrong-username case).
  `PATCH /users/{id}/position` transfers an EMPLOYEE to DEPARTMENT_HEAD in a different
  department (200) and rejects an invalid scope combination (`INVALID_POSITION_SCOPE`, 422).
  `PATCH /users/{id}/status` suspends a user (`active:false`), confirmed they then fail login
  with the same generic 401 as a wrong password (not a distinguishable "account disabled"
  message), then restores them and confirms login works again; an EXECUTIVE cannot suspend
  their own account (`CANNOT_DEACTIVATE_SELF`, 422). `PATCH /companies/me` renames the caller's
  company as EXECUTIVE (200) and is rejected as 403 for a non-executive.
* Full browser run: all 4 themes (light/dark/gray/pink) switch instantly and persist across a
  reload via `localStorage`; Settings page's change-password, recovery-email, and company-rename
  forms all round-trip against the real backend; `/forgot-password`'s two-step form correctly
  shows the generic "not available right now" message while SMTP is unset; the Nhân sự page's
  new "Chuyển vị trí" inline form and "Khoá/Mở khoá" button both work end-to-end against a real
  user, confirmed via the table re-rendering the new role/department and status afterward.

**Real email send - verified 2026-09-28, with your Gmail App Password**: restarted the backend
with real `SMTP_USERNAME`/`SMTP_PASSWORD` set, called `POST /auth/forgot-password` for `binmit1`,
and the log showed `EmailServiceImpl : Password reset OTP email sent` with no
`MailAuthenticationException` (that's what a wrong App Password or unconfigured 2-Step
Verification would throw). You confirmed the email actually arrived in the seed recovery mailbox -
**in the Spam folder**, not the inbox. That's an expected characteristic of transactional email
sent via `SimpleMailMessage`/personal Gmail SMTP (no SPF/DKIM domain alignment, no List-Unsubscribe
header, generic subject) - not a bug in this code, but a real limitation to flag before this goes
near production: a real deployment should use a transactional email provider (SendGrid, SES,
Postmark, etc.) with a verified sending domain, not personal Gmail SMTP, if OTP emails landing in
Spam would be a problem for real users. **Not verified**: completing an actual reset using the
OTP code from that real email (only the send itself was exercised end to end).

Two real bugs were caught by running this, not by reading the code:

6. **`updatePosition` inserting the new `Position` row before the old one's `is_deleted=1`
   update was flushed** - Hibernate's default flush ordering emits inserts before updates for
   different rows of the same table in one flush, so the new row briefly coexisted with the
   still-active old row and violated `ux_positions_active_user` (unique on `user_id` where
   `is_deleted=0`), failing with a raw `DataIntegrityViolationException` on the very first real
   call. Fixed with an explicit `positionRepository.saveAndFlush(oldPosition)` before the insert.
7. Tailwind's theme tokens (`bg-surface-muted`, `bg-primary`, etc.) rendered with their old fixed
   hex values instead of the new CSS-variable references after editing `tailwind.config.ts` -
   the running Next.js dev server had cached a pre-edit Tailwind build and needed its `.next`
   cache cleared and the process restarted to pick up the config change; a page refresh alone
   was not enough. Confirmed by inspecting the actually-generated CSS rule for `.bg-surface-muted`
   in the browser, not by assuming the edit took effect.

## Verified - Phase 5 (2026-09-28, this machine)

* `mvn test` - all 39 unit tests pass (8 new in `KpiServiceImplTest`).
* `spring-boot:run` - Flyway applies `V11`/`V12` cleanly on top of the existing schema.
* Full curl run through the plan's TC-50-TC-57: EXECUTIVE changes `completionWeight` and
  incentive tiers (200); a non-executive doing either → 403; an employee's own KPI summary with
  zero tasks this month → score 0 (not a bogus partial credit - see bug below); a real completed
  task with no `dueDate` set → 100% on-time rate, not penalized; a cancelled task correctly
  excluded from the denominator (`totalAssigned` unaffected); a TEAM_LEAD viewing their own
  team's member → 200, viewing an EXECUTIVE outside their scope → 403, viewing a different
  company's user → 404.
* Full browser run: `/dashboard` (now the Home page instead of a redirect) shows the 3 KPI cards,
  the workload bar chart matching the same month's data as the cards, and the incentive badge;
  the right-edge "Ưu tiên" tab slides out a 3-column panel grouping the caller's own open tasks
  by priority; Settings' new KPI section (EXECUTIVE-only, confirmed hidden for an EMPLOYEE) shows
  and updates the real saved formula/tiers.

One real bug was caught by running this, not by reading the code:

8. **A month with zero tasks scored 30, not 0.** `onTimeRate` defaulted to `1.0` whenever no
   completed task had a due date - including when there were zero completed tasks at all (not
   "some completed but untracked," just "nothing happened"). With the default 0.7/0.3 weights
   that gave every idle account a free 30-point score instead of 0. Caught by a unit test
   asserting `kpiScore` is exactly 0 for an empty task list, not by inspecting the formula by eye.
   Fixed by special-casing `totalAssigned == 0` to a flat 0 score.

## Verified - Phase 6 (2026-10-01, this machine)

Three new modules: `modules/notifications` (durable, per-user, unread-count badge),
`modules/calendar` (private per-user calendar; a manager can propose a PENDING event for a
subordinate, who must accept/decline it - never the reverse, and never a way for the manager to
read the subordinate's actual calendar), `modules/notes` (fully private, no sharing).

* `mvn test` - all 47 unit tests pass (5 new in `CalendarServiceImplTest`, 3 new in
  `NoteServiceImplTest`).
* `spring-boot:run` - Flyway applies `V13`-`V15` cleanly on top of the existing schema.
* Full curl run through TC-60-TC-69: self-created event → CONFIRMED immediately; a TEAM_LEAD
  adding an event for their own team member → PENDING + a real notification row created for that
  member (confirmed via `GET /notifications`); the same TEAM_LEAD targeting someone outside their
  team → 403; the event's owner accepting/declining their own PENDING event → 200; **the
  manager who created it trying to accept on the owner's behalf → 404**, not 403 - confirms the
  calendar's privacy is absolute, not just "read-only for managers" (see
  `CalendarServiceImpl.requireOwnEvent`); marking one/all notifications read updates the unread
  count correctly; notes CRUD scoped to the caller, a foreign note id → 404.
* Full browser run: the header's new ⭐/☰/🔔/⚙️ icon cluster (replacing the old floating
  "Ưu tiên" button and the Sidebar's "Cài đặt" entry) all work - ⭐ opens the same priority panel
  now controlled from the header, ☰ swaps the Home page into the compact task-board view with
  working click-to-expand detail, 🔔 shows a live unread badge and a working dropdown, ⚙️ links
  to Settings. `/dashboard/calendar` renders a real Apple-Calendar-style month grid with events
  on the correct days (a declined event correctly disappears from the grid but stays listed
  below), and `/dashboard/notes` create/edit/delete all round-trip against the real backend.

## Verified - Phase 7 (2026-10-01, this machine)

Self-service task creation, a department-tile directory, 1-1 internal messaging
(`modules/messages`, new), and note pinning.

* `mvn test` - all 55 unit tests pass (1 new `OrganizationServiceImplTest`, 4 new
  `MessageServiceImplTest`, 1 new self-assignment case in `TaskServiceImplTest`, 2 new pin cases
  in `NoteServiceImplTest`).
* `spring-boot:run` - Flyway applies `V16`-`V18` cleanly on top of the existing schema.
* Full curl run through TC-70-TC-77: an EMPLOYEE creating a task for themselves → 201 (previously
  403 for anyone below TEAM_LEAD); the same EMPLOYEE assigning to someone else → still 403,
  unchanged; viewing another company's department directory → 404, same company → real
  name/title/email data; sending a message to a same-company user → 201 plus a real
  `MESSAGE_RECEIVED` notification row for the recipient (confirmed via `GET /notifications`);
  messaging a different company's user → 404; reading a thread marks the other party's unread
  messages read (`is_read` flips to 1, confirmed directly in the database); pinning/unpinning
  your own note works, pinning someone else's note by guessed id → 404.
* Full browser run: Phòng ban now renders as square tiles with a "+" create tile for EXECUTIVE
  only; clicking a tile opens its own 1/4-3/4 detail page with a real staff directory, and the
  "..." popover shows email/title plus working "Nhắn tin riêng" (navigates to a real,
  pre-selected conversation) and "Gửi yêu cầu Drive" links; `/dashboard/messages` sends and
  receives a real message end to end; the ☰ board view's "+" opens a working self-task form;
  Notes' 📌 pin makes the note appear as a floating, editable widget on a completely different
  page (`/dashboard`), and minimizing/unpinning both work from that floating widget itself.

## Verified - Phase 9 (2026-10-01, this machine)

`FolderAccessRequestServiceImpl` gained a `notifyApprovers` fan-out (new `NotificationType.FOLDER_ACCESS_REQUESTED`,
new `PositionRepository`/`NotificationService` constructor dependencies) so a department head or
executive gets notified the moment someone requests access to their folder, instead of only
finding out by checking the Drive page. No schema change - reuses the existing `positions` and
`notifications` tables.

* `mvn test` - all 56 unit tests pass, including a new
  `createRequest_notifiesOnlyTheFoldersApproversNotUnrelatedStaff` case asserting the right
  department head is notified and an unrelated employee is not.
* **A real bug was caught and fixed during manual verification, not by the test suite**: the
  dev `mvn spring-boot:run` process had been running since before this change was finalized, so
  it was still serving the *previous* compiled bytecode even though the source file and
  `target/classes` had moved on - Spring Boot's plain `spring-boot:run` (no devtools LiveReload
  configured here) does not hot-reload a running JVM when a class changes on disk underneath it.
  The symptom: creating a folder access request succeeded and persisted correctly, but zero
  notifications were created, with no exception anywhere - the stale process simply never had the
  new `notifyApprovers` call compiled into its `createRequest` method. Confirmed by comparing the
  source file's mtime against the running process's start time, and by checking that the
  Hibernate SQL log around the request-creation request never showed the `positions`/`users`
  fan-out queries at all. Fixed by stopping and restarting the dev server. **Lesson for future
  sessions**: after editing a service class, restart the dev server and confirm via a curl test
  that exercises the *new* code path specifically - "the app still responds" is not evidence the
  latest code is running.
* Full curl run against the restarted server, using temporary test data (a `department_drive_folders`
  row and a dummy `google_drive_connections` row inserted directly via `sqlcmd`, both cleaned up
  afterward) since exercising this flow for real needs a real Drive-connected requester: created a
  folder access request as an EMPLOYEE in a different department → the folder's department head
  and every company EXECUTIVE each got a real `FOLDER_ACCESS_REQUESTED` notification with
  `relatedEntityId` set to the request's own id (what the frontend's inline Duyệt/Từ chối buttons
  need); approving it correctly failed with `DRIVE_NOT_CONNECTED` since the approver's own Drive
  isn't connected (expected - approval calls the real Google Drive API, which needs the real OAuth
  credentials from "Still needs your action" above).
* `MESSAGE_RECEIVED` notification fan-out (already built in Phase 7) re-verified after the
  restart: `relatedEntityId` is confirmed to be the sender's `userId` (not a thread id), matching
  what the frontend's `NotificationBell.resolveTarget` expects for its `?with=` link.

## Security audit + team-member directory + rate limiting (Phase 11)

The user asked for a security review (signup CAPTCHA, user-info leakage, IDOR/privilege
escalation, hardcoded frontend admin checks, source-code secret leakage) plus 3 reported bugs.
A read-only code audit (not guessed) found **all 5 security items were false alarms** - see the
frontend README's Phase 11 section for the full per-item writeup; the short version: there is no
public signup endpoint at all (so CAPTCHA doesn't apply), no DTO returns `passwordHash`/tokens,
every service method audited (`NoteServiceImpl`, `MessageServiceImpl`, `CalendarServiceImpl`,
`TaskServiceImpl`, `UserManagementServiceImpl`) re-derives the company/owner boundary rather than
trusting a client-supplied id, every frontend role check is a UX mirror of a real backend check
(never a hardcoded bypass), and the only `process.env` value referenced client-side is the
intentionally-public API base URL.

One real, smaller gap surfaced during that audit rather than being in the original ask:
**`forgot-password`/`reset-password` had no rate limiting**, meaning the two genuinely public
endpoints in this app could be hit repeatedly to spam a user's inbox with OTP emails or to
brute-force a 6-digit OTP. Fixed:

* **`common/RateLimiter.java`** (new) - an in-memory sliding-window counter, `tryConsume(key, maxAttempts, window)`.
  No new dependency (CLAUDE.md section 29 - Redis would be the right answer for a multi-instance
  deployment, but this is a single dev instance); the class's own javadoc states that limitation
  so it isn't missed later.
* **`AuthController`** - `forgot-password` now rate-limits by both client IP (10/15min, blocks
  one source hammering many usernames) and target username (3/15min, blocks one username's inbox
  being spammed from many IPs); `reset-password` similarly (20/15min by IP, 5/15min by username -
  tighter since the real risk there is brute-forcing the OTP itself). Both return `429
  TOO_MANY_REQUESTS` through the existing `BusinessException`/`GlobalExceptionHandler` path, no
  new error-handling code needed.
* New `unit/common/RateLimiterTest.java` (3 cases: blocks after the max, tracks different keys
  independently, forgets attempts once they age out of the window).

The 3 reported bugs - missing team-member view, "Nhân sự" nav shown to roles that get an empty
page, and the ☰ board-view icon not navigating home - were all frontend-only; see the frontend
README's Phase 11 section. The one backend piece they needed: a new **`GET /api/v1/teams/{id}/members`**
endpoint (`TeamController`), backed by `OrganizationService.listTeamMembers` - refactored the
existing `listDepartmentMembers`'s position→user mapping into a shared `toMemberResponses` helper
reused by both, same `DepartmentMemberResponse` shape, same tenant-boundary check pattern
(`requireOwnCompanyDepartment` via the team's `departmentId`, so a team in another company 404s
like every other cross-tenant lookup in this codebase).

## Verified - Phase 11 (2026-10-01, this machine)

* `mvn test` - all 60 unit tests pass (3 new `RateLimiterTest` cases, 1 new
  `listTeamMembers_crossCompanyTeamIsNotFound` case in `OrganizationServiceImplTest`).
* Full curl run against the restarted server: called `POST /forgot-password` with the same
  username 4 times in a row - the first 3 returned `{"success":true}`, the 4th returned
  `{"success":false,"error":{"code":"TOO_MANY_REQUESTS",...}}`, confirming the per-username limit
  actually blocks rather than just existing in code. `GET /api/v1/teams/1/members` returned the
  real 2 members of "Nhom Backend" (`Truong Nhom 1`, `Binmit Two`) with their titles/emails.
* Not independently re-tested here: the IP-based rate-limit bucket (same code path, only the key
  differs - exercising it would need requests from genuinely different source IPs, not practical
  from this single dev machine) and the `reset-password` limits (same `enforceRateLimit` helper,
  already covered by the unit tests' generic sliding-window behavior).

## Avatars + presence status (Phase 12)

User-requested: an uploadable avatar and a self-reported presence dot (green/yellow/red). Decided
up front with the user: avatars are stored on local disk, not S3/base64-in-DB (no cloud storage
configured yet, and base64 would bloat the `users` table for no benefit at this scale); the
presence status is **display-only** - explicitly confirmed with the user that it must never
suppress a real notification, since a user forgetting to reset their status back from "Không làm
phiền" would otherwise risk losing something genuinely important.

* **`V19__add_user_avatar_and_presence.sql`** - `users` gains `avatar_path` (nullable) and
  `presence_status` (`NOT NULL DEFAULT 'ONLINE'`). New `common/PresenceStatus` enum
  (`ONLINE`/`LIMITED`/`DO_NOT_DISTURB`) - its javadoc states the "display-only" decision so a
  future reader doesn't wire it into notification filtering by mistake.
* **`modules/identity/service/AvatarStorageService`** (new, not `.impl` - it's an infra helper
  like a repository, not a business-interface implementation) - validates (≤2MB, and the
  extension comes from *sniffing the actual bytes*, never the client's declared Content-Type or
  filename - CLAUDE.md section 31), writes under a fresh random UUID filename, and resolves
  against the configured `app.uploads.avatar-dir` with a path-traversal guard even though the
  filename always comes from our own `store()` output. `uploads/` is gitignored.
* **`AuthController`**: `POST /auth/me/avatar` (multipart, self only), `PATCH /auth/me/presence`
  (self only). **`UserController`**: `GET /users/{id}/avatar` (any authenticated company member -
  same visibility rule as the department directory - tenant-scoped like every other per-id
  lookup here, so a cross-company id 404s). `avatarUrl` in every response that carries one is a
  relative API path (`/users/{id}/avatar`), not `/api/v1/...` - matching the convention every
  other frontend API call already follows relative to its configured base URL (this was a real
  bug: it originally included `/api/v1`, which the frontend's `apiClient` would have doubled up).
* `UserProfileResponse`, `UserSummaryResponse`, `DepartmentMemberResponse` all gained
  `avatarUrl`/`presenceStatus` - `OrganizationServiceImpl`'s department/team member mapping was
  refactored into one shared `toMemberResponses` that populates both.

Two real bugs were caught by actually exercising the upload endpoint, not by the unit tests that
were written first:

1. **A real PNG was rejected as `AVATAR_INVALID_TYPE`** the first time this was tested with curl,
   despite passing in a unit test using `MockMultipartFile`. Cause: content-type sniffing used
   `URLConnection.guessContentTypeFromStream`, which needs a mark/reset-capable stream -
   `MockMultipartFile.getInputStream()` happens to return a `ByteArrayInputStream` (mark/reset
   capable), but a real multipart part's stream isn't guaranteed to be. Fixed by wrapping in
   `BufferedInputStream` before sniffing, and added a regression test
   (`AvatarStorageServiceTest.sniffsCorrectlyEvenWhenTheUnderlyingStreamDoesNotSupportMarkReset`)
   using a hand-written `MultipartFile` whose stream explicitly reports `markSupported() == false`
   - `MockMultipartFile` can't reproduce this gap, which is exactly why the first version of the
   test suite didn't catch it.
2. **A related latent NPE**: fixing bug 1 by having `sniffContentType` return `null` (instead of
   silently falling back to the client's declared Content-Type when sniffing was inconclusive -
   that fallback was itself a security gap, since it let a file whose real bytes matched nothing
   sail through on a false claim) exposed `Map.of(...).get(null)` throwing
   `NullPointerException` instead of cleanly returning "not found". Guarded with an explicit null
   check before the lookup. Both are covered by `AvatarStorageServiceTest`.

## Verified - Phase 12 (2026-10-01, this machine)

* `mvn clean test` - all 68 unit tests pass (8 new `AvatarStorageServiceTest` cases, including
  the two regression tests above).
* Full curl run against the restarted server (Flyway applied `V19` cleanly): uploaded a real PNG
  to `POST /auth/me/avatar` → `200` with `avatarUrl: "/users/1/avatar"`; `GET /users/1/avatar`
  returned the correct bytes with `Content-Type: image/png` and a `private, max-age=300`
  Cache-Control; `PATCH /auth/me/presence` round-tripped all three status values correctly.
* Full browser session confirmed the avatar and presence dot render correctly in both the
  dashboard header and a department's staff directory - see the frontend README's Phase 12
  section for that walkthrough and a genuine frontend bug it caught (not a backend issue).

## Task restore/delete + system broadcast account (Phase 14)

Two independent backend additions from a user feedback batch:

* **Cancelled-task restore/delete** - `TaskEntity` gained `restore()` (CANCELLED → ASSIGNED,
  clearing `decidedAt`) and `markDeleted()`; `TaskServiceImpl` gained `restoreTask`/`deleteTask`,
  both gated by the exact same authority check `cancelTask` already used (the original assigner,
  or whoever could have assigned to that same target) and both guarded to only operate on a
  CANCELLED task. New `POST /tasks/{id}/restore` and `DELETE /tasks/{id}` endpoints. Deletion is
  a soft delete (`is_deleted`), like every other entity in this codebase - never a real SQL
  `DELETE` (CLAUDE.md section 6/36).
* **System/broadcast account** - a new `is_system_account` column (`V20` migration) on `users`,
  surfaced through `UserEntity.isSystemAccount()`/`markAsSystemAccount()` (the latter is the
  *only* place in the codebase that ever sets it - no create/update-user request path can grant
  itself this). The flag travels with the authenticated identity end to end:
  `CustomUserDetailsService` reads it at login, `JwtService` round-trips it as a `systemAccount`
  JWT claim so it survives into `UserPrincipal` on every later request without a DB hit.
  `MessageServiceImpl.requireSameCompanyUser` - previously an absolute "cross-company is always
  404" - now has exactly one deliberate exception: if either party to a message has this flag,
  the same-company check is skipped. This had to apply to *both* directions (not just the
  sender), because a regular recipient viewing the thread the bot just wrote to them would
  otherwise 404 on their own inbox. New `MessageService.broadcastMessage` (system accounts only,
  `AccessDeniedException` otherwise) fans one message out to every active user in every company,
  via `UserRepository.findAllActive()` (the one place in the app that deliberately queries across
  the tenant boundary - every other repository method here is scoped). New
  `POST /messages/broadcast` endpoint. One seed account, `orbit_broadcast`, is created by
  `DevDataSeeder` - password from `DEV_BROADCAST_PASSWORD` (git-ignored `backend/.env.local`; the value that was
  written here until Phase 40 was rotated and no longer works), deliberately not
  password-equals-username like the other seed accounts since this one has real cross-tenant
  power; per the user's explicit instruction, this account is meant to be controlled only by
  them, not shared like the other `binmitN` demo logins.

A real bug was caught here by actually trying to log in as the new account, not by reading the
code: **`DevDataSeeder`'s existing idempotency check (`if binmit1 exists, skip everything and
return`) silently skipped creating the new broadcast account too**, on any local database that
already had seed data from an earlier phase in this session. Fixed by giving the broadcast
account its own independent `existsByUsername` check, outside the early-return - a lesson for
any future seed-data addition in this file: never add a new seeded entity inside a block gated by
an unrelated existence check, or it will silently never run for anyone whose database predates it.

## Verified - Phase 14 (2026-10-02, this machine)

* `mvn clean test` - all 77 unit tests pass (4 new `restoreTask`/`deleteTask` cases in
  `TaskServiceImplTest`, 4 new cross-company/broadcast cases in `MessageServiceImplTest`). Two of
  the new task tests initially failed on a wrong assumption about `requireStatus`'s error message
  format (it states the task's *current* status, not the status that was required) - caught
  immediately by actually running the tests, fixed by asserting on the right substring.
* Full curl run against the restarted server (Flyway applied `V20` cleanly): logged in as
  `orbit_broadcast` and confirmed `systemAccount: true` in the profile response; sent a broadcast
  → `{"success":true,"data":9}` (9 recipients = every other active seed user across both
  companies); logged in as `binmit3` (company B, unrelated to the bot's own company A) and
  confirmed their `/messages/conversations` really does show a new thread from "Thông báo nội
  bộ" - the cross-company bypass works in both directions, not just for the sender. Created a
  task, cancelled it, restored it (back to `ASSIGNED`), cancelled it again, deleted it (`204`),
  and confirmed it no longer appears in `GET /tasks` at all.

## Directory hygiene (Phase 16)

* The broadcast bot (`is_system_account`) is excluded from the staff directory: `UserManagementServiceImpl.listUsers`
  and `OrganizationServiceImpl.toMemberResponses` filter it out. Chat is unchanged - it still appears in
  conversations and can still send/receive (those paths use different queries).
* Unit test added: `OrganizationServiceImplTest.listDepartmentMembers_hidesSystemAccountButKeepsRealUsers`.
  Full suite: 78 tests passing.

## Verified - Phase 16 (2026-10-02, this machine)

Backend restarted; employee `binmit2` sees department members without the bot while the bot still
appears in `/messages/conversations`.

## Chat attachments, recall, archive (Phase 18)

Migration `V21__message_attachments_recall_archive.sql`: `messages.recalled_at`, tables
`message_attachments` and `message_archives` (unique `(user_id, other_user_id)`).

| Endpoint | Behavior |
|---|---|
| `POST /messages/attachments` (multipart `recipientUserId`, optional `body`, `file`) | Same tenant rules as sending text; 20 uploads/min per user (429 after) |
| `GET /messages/attachments/{id}` | Only the message's sender/recipient (else 404); images inline, everything else forced download as `application/octet-stream`; `nosniff` |
| `DELETE /messages/{id}` | Recall: sender only (others get 404), body blanked, attachment row + file deleted, idempotent |
| `PUT` / `DELETE /messages/with/{userId}/archive` | Hide / unhide the caller's side only; a new message in either direction brings the thread back |
| `GET /messages/conversations?archived=true` | Archived list (default `false`) |

File handling (`ChatAttachmentStorageService`): 5MB cap; stored under a random UUID name; allowlist PNG/JPEG/GIF/WebP
(identified by magic bytes, client name/type ignored) and PDF/DOC(X)/XLS(X)/PPT(X)/ZIP/TXT/CSV (extension must match the
file's real leading bytes - a renamed exe is rejected). SVG/HTML are not allowed. Files live in `app.uploads.chat-dir`
(`CHAT_UPLOAD_DIR`, default `./uploads/chat`, git-ignored) - single-instance disk, like avatars. Recall deletes the file
only in `afterCommit` of the transaction (`MessageServiceImpl.deleteFilesAfterCommit`), so a rolled-back recall keeps the
file; if the file delete itself fails the orphan is harmless. Still single-instance disk: running several backend
instances needs shared/object storage behind `ChatAttachmentStorageService` first.

`GlobalExceptionHandler` now maps framework request errors to proper codes instead of 500: oversize upload 413, missing
part/param or unreadable body 400, unknown route 404, wrong method 405.

Tests: 103 passing (new: `ChatAttachmentStorageServiceTest`, recall/attachment-access/archive cases in
`MessageServiceImplTest`, `GlobalExceptionHandlerTest`).

## Verified - Phase 18 (2026-10-02, this machine)

curl against the running backend (binmit3 <-> binmit4 same company, binmit2 other company): PNG and PDF upload 201;
exe renamed `.pdf` and `.html` 400; cross-company upload 404; recipient download 200 (image inline / pdf attachment),
third party 404, anonymous 401; recipient recall 404, sender recall 204 (repeat 204), recalled attachment download 404;
archive hides only the caller's side, new message restores it; 7MB upload 413, missing file 400.

Follow-up verification (2026-10-02): after the `afterCommit` change, a real upload then recall removed the file from
`uploads/chat` (4 -> 3 files); live attachments in the dev DB and files on disk match (3 and 3, no orphans).

## Task attachments + Drive link (Phase 20)

Migration `V22__task_attachments_and_drive_link.sql`: `tasks.drive_url`, table `task_attachments`.

Shared storage refactor: `ChatAttachmentStorageService` became `common/storage/AttachmentStorage` (plain class, same validation:
magic bytes, allowlist, random names, 5MB), instantiated twice in `config/StorageConfig` - `chatAttachmentStorage`
(`app.uploads.chat-dir`) and `taskAttachmentStorage` (`app.uploads.task-dir`, env `TASK_UPLOAD_DIR`, default `./uploads/tasks`,
git-ignored). `common/storage/AttachmentDownloads` builds the download response for chat and tasks; `common/TransactionHooks.afterCommit`
runs file deletion only after a successful commit.

| Endpoint | Rule |
|---|---|
| `POST /tasks/{id}/attachments` (multipart `file`) | Task must be visible to the caller **and** manageable by them; not on a cancelled task; max 10 per task (422); 20 uploads/min per user |
| `GET /tasks/{id}/attachments/{attachmentId}` | Anyone who can see the task (same scope as `GET /tasks`); everyone else 404; images inline, other types forced download |
| `DELETE /tasks/{id}/attachments/{attachmentId}` | The uploader, or a manager of the task; file deleted after commit |
| `PATCH /tasks/{id}/drive-url` `{driveUrl}` | Managers only; blank clears; `POST /tasks` also accepts `driveUrl` |

"Can manage" (`TaskResponse.canManage`, a pure function so the list can compute it per task): the assigner, the user assignee, an
executive, or the head of the department a department-wide task was assigned to. Department/team managers over a *user* task they
did not assign can view but not change it (a deliberate simplification).

`DriveUrlPolicy`: https only, host exactly `drive.google.com` or `docs.google.com`, no credentials in the URL, <= 500 chars - it is
rendered as a clickable link for other users. Soft-deleting a cancelled task keeps its attachments (soft-delete philosophy).

Tests: 133 passing (new: `DriveUrlPolicyTest`, 16 attachment/Drive cases in `TaskServiceImplTest`, `AttachmentStorageTest` moved).

## Verified - Phase 20 (2026-10-02, this machine)

curl as binmit1 (exec) / binmit2 (assignee) / binmit4 (other company): create with Drive link 201 and bad link 400; assignee upload 201,
exe renamed `.pdf` 400, cross-company upload/download/remove 404, anonymous 401; download as assignee and as assigner 200 (forced
download, nosniff); Drive link bad host 400 / valid 200 / blank clears; 11th file 422; removing a file deletes it from disk (10 -> 9).
Left in the dev DB: task id 18 "E2E attach task" with 9 attachments (files in `uploads/tasks`).

## Company registration, staff invitations, first-run tour (Phase 21)

Migration `V23__registration_invitations_onboarding.sql`: `companies.contact_email` / `logo_path`, `users.onboarding_completed`
(existing users are backfilled to 1; new users are inserted with 0), tables `registration_verifications` and `invitations`.

**Self-service registration** (public, `SecurityConfig` permits `/api/v1/auth/register/**` and `/api/v1/auth/invitations/**`):

| Step | Endpoint | Rules |
|---|---|---|
| 1 | `POST /auth/register/request-otp` `{email}` | Same response for any address; 6-digit OTP valid 10 min, only the newest code counts; limits: 10/h per IP, 3/h per email |
| 2 | `POST /auth/register/verify-otp` `{email, otp}` | Max 5 wrong tries per code (counter survives the exception: `noRollbackFor`); success returns a single-use verification token valid 30 min; limits 30/15 min per IP, 10/15 min per email |
| 3 | `POST /auth/register` | Needs the token (locked row, one registration per token); creates the company + an EXECUTIVE whose email is the verified address, signs them in (session cookie), 10/h per IP; username `[A-Za-z0-9._-]{3,100}`, password 8-72 chars |

Only SHA-256 hashes of the OTP and the token are stored (`SecureTokens`). The company logo is uploaded **after** registration through the
authenticated endpoint (no public file upload).

**Invitations** (`/api/v1/invitations`, managers only - `hasAnyAuthority('EXECUTIVE','DEPARTMENT_HEAD','TEAM_LEAD')`): `POST` create, `GET`
pending (executives see the company's, others their own), `DELETE /{id}` revoke, `POST /{id}/resend` (new link, old one dies). Creating one
runs `UserManagementService.validateGrantScope` - exactly the rules of creating a user directly (extracted from `createUser`/`updatePosition`
so they cannot drift). The link `/invite/{token}` carries a 32-byte token (hash stored, 7 days). Public `GET /auth/invitations/{token}` previews it
(company, level, inviter - unknown/used/revoked/expired are indistinguishable 404s) and `POST .../accept` creates the user: company, level,
department/team and email come from the invitation, the department/team are re-validated at accept time, the row is locked so a link works once.
A new invitation to the same address revokes the earlier pending one. Limits: 30 invites/h per user, 30 token requests/15 min per IP.

**Company profile** (`CompanyController`): `GET /companies/me` (any member), `PATCH /companies/me` (name + contact email, EXECUTIVE),
`POST /companies/me/logo` (EXECUTIVE, validated by `AvatarStorageService`, 10/h), `GET /companies/me/logo` (own company only).
**Tour flag**: `UserProfileResponse.onboardingCompleted`; `POST /auth/me/onboarding/complete`.

**Mail**: `EmailService` gained `sendRegistrationOtp` / `sendInvitation`. Set `MAIL_DEV_LOG=true` (property `app.mail.dev-log`) to write every email -
OTP and invite link included - to the application log instead of sending it (no SMTP needed). It is off by default and the application refuses to
start with it under the `prod` profile. Links use `app.public-base-url` (`PUBLIC_BASE_URL`, default `http://localhost:3000`).
Small shared pieces: `RateLimitGuard`, `AuthCookies` (login now uses it too), `TransactionHooks`.

Tests: 163 passing (new: `RegistrationServiceImplTest`, `InvitationServiceImplTest`, `EmailServiceImplTest`).

## Verified - Phase 21 (2026-10-03, this machine)

Backend started with `MAIL_DEV_LOG=true`; curl run (`request-otp` -> wrong/right OTP -> register -> company edit/logo -> invite -> preview -> accept -> revoke/resend ->
permissions -> rate limit): wrong OTP 422, right OTP 200 + token, bogus/used token 422, weak password and unsafe username 400, taken username 409,
register 201 with a working session, logo upload 201 / non-image 400, invitation accepted into the right company/level/department with
`onboardingCompleted=false`, second accept and revoked/old/made-up tokens all 404, employee invite/list/edit/logo 403, anonymous 401, another
company's executive cannot revoke (404) or read our logo, 4th OTP request in an hour 429. Left in the dev DB: several "E2E Registration Co …" /
"UI Wizard Co" companies with their users and 3 logo files under `uploads/avatars` - safe to delete by hand.

## Delete user needs the caller's password (Phase 22)

`DELETE /api/v1/users/{id}` now takes a JSON body `{"password": "<the caller's own password>"}`. `UserManagementServiceImpl.deleteUser`
re-authenticates first (422 `INVALID_PASSWORD`, before any other rule), then applies the existing rules (not yourself, tenant, hierarchy).
At most 5 attempts per caller per 15 minutes (`RateLimitGuard`, 429) so a hijacked session cannot guess the password through this endpoint.
A missing/blank body is a 400. Tests: 165 passing (new: wrong password, correct password, order of checks).

## Verified - Phase 22 (2026-10-03, this machine)

curl as binmit1: no body 400, blank 400, wrong password 422 and the user stays listed, employee 403, anonymous 401, correct password 204 and
the user is gone from `/users`, deleting yourself 422, other company's executive 404, 6th attempt in a window 429.

## Phase 27 - task checklist, department look, staff account recovery

* **Task checklist** (`V24__task_checklist.sql`, table `task_checklist_items`): `POST /tasks/{id}/checklist {text}`, `PATCH /tasks/{id}/checklist/{itemId} {done}`,
  `DELETE /tasks/{id}/checklist/{itemId}`; `CreateTaskRequest.checklist` (<= 30 lines, each <= 200 chars) creates lines together with the task and `TaskResponse.checklist`
  lists them. Rules in `TaskServiceImpl`: whoever `canManage` the task may add/tick/remove (404 for anyone who cannot even see it); lines can be added/removed while the task is
  ASSIGNED or ACCEPTED, but only **ticked while ACCEPTED**; ticking the last open line (or removing the last open one) **completes the task**; the manual `POST /complete` is refused
  with `CHECKLIST_INCOMPLETE` while a line is open, so a task with a checklist can only finish through the checklist. Tasks without lines still use the manual button.
* **Department look** (`V25__department_appearance.sql`: `departments.color`, `departments.icon`): `PATCH /departments/{id}` (executive, or the head of that department; 403 otherwise,
  404 across companies) replaces name, description, colour and icon; `POST /departments` accepts colour/icon too. Colour and icon must be one of the preset keys in
  `DepartmentAppearance` (400 `INVALID_APPEARANCE` otherwise; blank = default look); a name used by another active department of the company is a 409.
* **Staff account recovery** (`V26__email_change_requests.sql`): for EXECUTIVE/DEPARTMENT_HEAD/TEAM_LEAD within their management scope (same rule as delete/lock; never yourself):
  `POST /users/{id}/password-reset` emails the staff member the normal reset code (the same flow as "forgot password", so the manager never sees or sets a password; 422 if the user has no email);
  `POST /users/{id}/email-change {email}` mails a 6-digit code to the **new** address and `POST /users/{id}/email-change/confirm {otp}` applies it (code: SHA-256 only in the database,
  15 minutes, 5 attempts, only the latest request counts, the old address gets a notice mail). Rate limits: reset 10 per manager and 3 per target / 15 min; email change 10 per manager / 15 min and
  5 per target / hour; confirm 20 per manager / 15 min.
* **Health fix**: `management.health.mail.enabled=false`. With the mail indicator on, `/actuator/health` answered 503 whenever SMTP was unconfigured or unreachable although the app was fine.
* Local run: `run-local.ps1` at the repository root starts the backend and frontend (settings in the git-ignored `backend/.env.local`, template `backend/.env.example`).

Verified (2026-10-03, this machine): `mvn test` 187 tests pass (22 new: checklist auto-complete/lock/permissions, department edit permissions/conflict/preset validation, reset and email change
including wrong, expired and exhausted codes). Against the real database (Flyway applied V24-V26): created a task with a 2-line checklist, ticking before accept -> 422, manual complete with open lines -> 422,
ticking both lines -> task DONE, adding a line to a DONE task -> 422, another company -> 404; department patch with colour/icon -> 200, unknown colour -> 400, employee -> 403; password reset by an
employee -> 403, by an executive on themselves -> 422, email change for an unknown user -> 404.
Not tested: actual delivery of the reset / email-change mails (only the rejections were called, so no mail was sent to the seed users' addresses).

## Phase 28 (wave 1)

* **Task notifications** (`NotificationType` TASK_ASSIGNED / TASK_ACCEPTED / TASK_DECLINED / TASK_COMPLETED, no schema change): the assignee (or a department's heads) is notified when a task is assigned to someone else; the assigner is notified when it is accepted, declined or completed (including completion by ticking the last checklist line). Self-assigned work sends nothing.
* **Calendar**: an event that ends before it starts is rejected (`INVALID_EVENT_RANGE`, 422); `endAt` already existed, so business trips need no migration.
* **Registration**: `POST /auth/register/request-otp` answers `EMAIL_ALREADY_REGISTERED` (409) when an active account already uses the address (still rate-limited per IP and per address).
* **Password reset**: `forgot-password` / `reset-password` accept a username or the account's email in the existing `username` field; an email resolves only when exactly one active account has it, and the response stays identical for unknown accounts.

## Phase 28 (wave 2) - company profile

* Migration `V27__company_profile_banner.sql`: `companies.description` (1000 chars) and `companies.banner_path` (stored file name only, like `logo_path`).
* `PATCH /companies/me` now also takes `description` (full replace: blank clears it); `POST /companies/me/banner` (executive only, 2MB, rate-limited 10/hour, same image validation as the logo) and `GET /companies/me/banner` (any member of that company). `CompanyResponse` gained `description` and `bannerUrl`.

## Phase 28 (wave 3) - cross-department projects

Module `modules/projects`; migration `V28__create_projects.sql` (`projects`, `project_departments`, `project_members`, `project_folders`, `project_messages`, and `tasks.project_id`).

* **Flow**: an executive (any department) or a department head (own department) creates a project and may invite other departments. The invited department's head (or an executive) accepts or declines; after accepting, that head adds people **of their own department**. Members share the project's tasks, chat and Drive folders. A declined department can be invited again.
* **Rules live in `ProjectAccessService`** (used by the project screens and by the task module): `canManage` = executive or head of the owning department; participant = member or manager; `canView` = participant or head of any department in the project (so an invitation can be answered). Another company's project, or one the caller cannot see, is always 404; a viewer who may not work in it gets 403.
* **Tasks**: `CreateTaskRequest.projectId` (optional). A project task must go to a member; managers may assign to anyone in the project, a head to their own people, anyone to themselves. `GET /tasks/project/{id}` lists them for participants. `TaskResponse.projectId` added.
* **Drive**: `POST /projects/{id}/folders` links a folder from the department catalog. Only someone who may decide access to that folder (executive or its department's head) can link it (`DriveCatalogService.requireShareableFolder`); linking and adding a member then grant reader access through the folder owner's Drive connection (`grantReaderAccess`, best effort per person: people without a Drive connection are counted, not failed). Unlinking does not revoke Google permissions.
* **Chat**: `GET/POST /projects/{id}/messages` (last 200 lines, polling; participants only; 60 messages/minute per user).
* **Notifications**: `PROJECT_INVITED` (heads of the invited department), `PROJECT_RESPONDED` (project creator), `PROJECT_MEMBER_ADDED`.
* Verified against the dev SQL Server with a scripted end-to-end run (create, invite, 404 before invitation, accept once, add own people only, chat, project tasks, leave, delete) as well as unit tests (`ProjectServiceImplTest`, `ProjectAccessServiceImplTest`, new cases in `TaskServiceImplTest`). Linking a folder needs a real Google Drive connection and was not exercised end to end.

## Phase 37 - notifications and emails in the reader's language

The frontend is now bilingual (see frontend/README Phase 37); two things the server writes itself follow the reader's language too.

* **Migration `V29__notification_params.sql`**: `notifications.params` (NVARCHAR 2000, nullable) - a JSON object of strings holding the values a notification's text was built from. `title`/`body` stay (Vietnamese) as the fallback for rows that predate the column and for any client that cannot word a type. `NotificationService.notify(...)` takes the params map; `NotificationResponse` returns `params` (null for old rows, or when the stored JSON is unreadable - logged, never an error). Params that would not fit the column are dropped with a warning and the notification is still sent.
* **The contract** (what each type puts in `params`; the frontend words it in `notificationText.ts` - change both together):

  | Type | params |
  | --- | --- |
  | `TASK_ASSIGNED`, `TASK_ACCEPTED`, `TASK_DECLINED`, `TASK_COMPLETED` | `actor`, `title` |
  | `CALENDAR_EVENT_INVITE` | `actor`, `title` |
  | `FOLDER_ACCESS_REQUESTED` | `actor`, `folder` |
  | `MESSAGE_RECEIVED` | `actor`, and `attachmentOnly: "true"` when the message has no text (the body is then our placeholder, not the sender's words) |
  | `PROJECT_INVITED`, `PROJECT_MEMBER_ADDED` | `actor`, `project` |
  | `PROJECT_RESPONDED` | `department`, `project`, `accepted` (`"true"`/`"false"`) |

  Params carry only what the notification's text already shows its reader.
* **Emails** (`EmailServiceImpl`): the texts moved into `messages.properties` (Vietnamese, the default) and `messages_en.properties` (UTF-8; a message with arguments must not contain a lone apostrophe). The language of an email is the language of the request that caused it: `LocaleContextHolder`, filled by Spring from `Accept-Language`, which the frontend sets to the language of its interface. `spring.web.locale: vi` is used when a request has no header, and `spring.messages.fallback-to-system-locale: false` makes any language without a file (French...) get Vietnamese instead of the language of the server. Mail is sent inside the request, never from another thread, so the locale is always the right one. For an invitation or an email change the language is the **sender's** (the inviter's or the manager's interface), because the recipient's is unknown.
* **First administrator's job title**: `RegistrationServiceImpl` takes it from `registration.adminTitle` in the registrant's language ("Quản trị viên" / "Administrator"); it is an ordinary editable title afterwards.
* **Unchanged on purpose**: error messages in API error bodies stay English; names and texts people typed stay as typed; `DevDataSeeder` data (including the "Thông báo nội bộ" broadcast account) stays Vietnamese.
* **Tests**: `NotificationServiceImplTest` (params stored as JSON, dropped when too long, returned for new rows and null for old or unreadable ones), the notification verifications in the task/calendar/drive/message/project tests now check the params, `EmailServiceImplTest` (an English, a Vietnamese and a French request; the invitation and the email-changed notice; both property files have the same keys and arguments), `RegistrationServiceImplTest` (the administrator's title in both languages). All backend unit tests pass.
* **Verified against the dev SQL Server** (Flyway applied V29): assigning a task over the API stores `{"actor": ..., "title": ...}` and the notification list returns it next to the Vietnamese text, while older rows come back without `params`; the browser then showed that notification in English and in Vietnamese. A password-reset request with `Accept-Language: en` wrote the English mail to the dev log, `vi` and `fr` the Vietnamese one.
* **Not verified**: delivery through real SMTP (dev-log mode only); the request with no `Accept-Language` at all (the rate limit of the reset endpoint stopped the live attempt; the unit tests cover the Vietnamese fallback but not the `spring.web.locale` setting itself); the attachment-only message flag live (unit-level wiring only).

## Phase 37b - one email, one account

* Inviting an address that already belongs to an active account is refused (`EMAIL_ALREADY_IN_USE`, 409), the same rule as registering a company; accepting an invitation re-checks it (the address may have been registered since) and leaves the invitation pending. The check runs after the authority check, so a caller who may not invite cannot probe addresses. Before this, an invitation created a second account with the same email (e.g. a CEO of one company and an employee of another). Accounts that already share an email are left as they are; no migration, and no database UNIQUE constraint yet (existing duplicates would block it).
* Tests: two new cases in `InvitationServiceImplTest`; all backend unit tests pass. Not exercised live.

## Phase 38 - terms of service and the CRM module

### Terms of service (module `legal`, migration `V30__terms_of_service.sql`)

* **What it does**: nobody uses the product before accepting the newest terms. Registration and accepting an invitation need the box ticked (`acceptedTermsVersion` in `RegisterCompanyRequest` / `AcceptInvitationRequest`; a missing or old version is `TERMS_VERSION_MISMATCH`, 409, and nothing is created); everyone who already has an account is asked at their next sign-in, and again whenever a new version is published.
* **Enforced here, not in the browser**: `TermsAcceptanceFilter` answers every authenticated request of someone who has not accepted the newest version with 403 `TERMS_NOT_ACCEPTED`. Exempt: `/api/v1/auth/**` (so they can sign in, read who they are and sign out), `/api/v1/terms/**` and `/actuator/**`. `UserProfileResponse.termsAccepted` tells the frontend to show the terms window instead of the app.
* **Endpoints**: `GET /api/v1/terms/current?lang=vi|en` (public; anything else is Vietnamese), `POST /api/v1/terms/accept {version}` (signed in; only the newest version is accepted; repeating is harmless).
* **Evidence**: `terms_acceptances` keeps user, version and time and is never changed or deleted. No IP address is stored on purpose (data minimisation).
* **Publishing a new version**: add the texts as `src/main/resources/terms/v<N>/vi.txt` and `en.txt` (first line `# Title`, then `## Section`, `- list item`, plain paragraphs) and a migration that inserts `terms_versions (N, ...)`. The newest row wins; it is read once at start, so publishing means deploying. Every user is then asked again at their next sign-in. A published version without its text fails loudly (500), not silently.
* **The text is a draft for a lawyer to review before it goes to customers.** It states the roles (the company is the data controller, Orbit the processor), the ban on unlawful marketing and data trading, the logging and export rules and the limits of the encryption, in plain terms and without citing specific articles of law. Operator name, address and a contact channel are not in it because they are not known here; add them when the operator is decided.
* **Tests**: `TermsServiceImplTest`, `TermsAcceptanceFilterTest`, and the registration/invitation tests (an account is not created without the current version).

### CRM (module `crm`, migration `V31__create_crm.sql`)

* **Model**: a *dataset* is a table of customers a company keeps for one source (Facebook, Zalo, website, Excel file, event, referral, other). Each dataset has its own columns (text, number, date, email, phone; the type is fixed at creation - add a new column instead of changing one) and rows. A dataset belongs to a department or, with no department, to executives only. New datasets start with name, email and phone columns in the language of the request.
* **Who may do what** (`CrmAccessPolicy`, the single place for these rules; another company's dataset, or one the caller may not use, is "not found"):

  | | Executive | Head of the dataset's department | Others in that department |
  | --- | --- | --- | --- |
  | See the dataset, read and edit customers, add customers | yes (every dataset of the company) | yes | yes |
  | Rename, delete, add/rename/delete columns, import | yes | yes | no |
  | Delete a customer | yes | yes | only one they added themselves |
  | **Export to Excel** | **yes** | no | no |
  | Read the audit log | yes | no | no |

  Heads can create datasets only for their own department; executives anywhere (or executives-only).
* **Encryption per company** (`CrmCrypto`): each customer's values are one JSON object encrypted with AES-256-GCM using a key derived (HKDF-SHA256) from the master key `CRM_DATA_KEY` and the company id; the ciphertext is also bound to its company, so rows copied between companies do not decrypt. Duplicate detection uses keyed hashes (HMAC-SHA256, per company) of the dataset's first email and first phone column, so the database never holds an email or phone in the clear. **Honest limit**: whoever holds `CRM_DATA_KEY` can derive every company's keys, so this protects against a stolen database or backup and against people without access to the server's environment, not against its operator. Keep the key out of the repository, of the database and of backups of the database; **losing or changing it makes all stored customer data unreadable**. Searching therefore reads and decrypts the dataset (at most 50,000 customers) instead of using an index.
* **Import** (`CrmFileReader`, Apache POI 5.4): `.xlsx` (every visible sheet is a table), `.csv` (UTF-8, comma/semicolon/tab, quoted fields) and `.docx` (only tables). Two steps: `POST /crm/imports/preview` shows the tables, columns and first rows; `POST /crm/datasets/{id}/import` (multipart `file` + JSON `options`) maps file columns to existing or new columns and chooses what happens to customers already in the dataset (same email or phone): `SKIP` or `UPDATE` (blank cells change nothing). A cell that does not fit its column refuses its row (reported by row number and column name, never the value); the rest import; the import is all-or-nothing for the database. Repeats inside one file are created once. Limits (`app.crm.*`): 5 MB, 10,000 rows, 50 columns per file, 50,000 customers per dataset; 20 imports per hour per user. Files are never written to disk, formulas are never evaluated (the stored value is read), a file's real type is checked (zip signature), and zip-bomb limits are tightened. Phone numbers typed as numbers in Excel lose their leading 0 before they reach us; the template tells people to format the column as text.
* **Export** (`GET /crm/datasets/{id}/export`): executives only (`@PreAuthorize` plus the policy), at most 20,000 customers per file, 10 per hour per user, always written to the audit log; every cell is written as text, so a value that looks like a formula is never run when the file is opened.
* **Templates**: `GET /crm/templates/xlsx|docx` - a demonstration table with two invented customers and the rules for filling it in, in the language of the request; both read back through the importer (tested).
* **Audit log** (`crm_audit_log`, `GET /crm/audit`): dataset created/changed/deleted, columns added/renamed/deleted, customers deleted, imports and exports, with counts and ids only - never a customer's details.
* **Deleting is real**: deleting a customer or a dataset deletes the rows (they are personal data); deleting a column removes its values from every customer.
* **Settings** (`app.crm.*`): `CRM_DATA_KEY` is required with no default (the app does not start without it): generate it with `openssl rand -base64 32`, put it in `backend/.env.local` (dev; `run-local.ps1` now checks for it), `backend/prod.env.local` or the deployment environment (`deploy/.env.example`, `docker-compose.yml`). **Before the first public start of this version, put a key of its own in `prod.env.local`** - `run-public.ps1` takes any missing value from `backend/.env.local`, which would make the public site use the development key.
* **API errors the frontend translates**: `DUPLICATE_ROW`, `DATASET_FULL`, `TOO_MANY_COLUMNS`, `COLUMN_NAME_TAKEN`, `IMPORT_*`, `INVALID_MAPPING`, `EXPORT_TOO_LARGE`, `TOO_MANY_REQUESTS`; `INVALID_CELL` already carries a message in the language of the request that names the column.
* **Tests** (`unit/modules/crm`): access policy, crypto (round trip, other company/key/tampering, RFC 5869 vector), cell rules, file reader (xlsx, docx, csv, hidden sheets, limits, wrong types), rows, datasets and columns, import (mapping, duplicates, bad cells, limits, permissions), export (content, formula safety, audit) and templates. All backend unit tests pass.
* **Verified against the dev SQL Server (Flyway applied V30 and V31)**: terms gate (403 before accepting, 409 for an old version, 200 after); a dataset created by an executive is visible to its department, not to another company; employees can add and edit customers but get 403 on dataset creation, columns, import, export, audit and deleting a customer they did not add; invalid email, duplicate email, same phone written differently, unknown column; the stored `data` column holds ciphertext and no email or name appears in it; the downloaded Excel and Word templates imported with `SKIP`, `UPDATE`, repeated, and a fake `.xlsx` refused; export downloaded and audited; deleting a column removed its values; deleting the dataset left no rows.
* **Not verified**: the public database `orbit` (this version is not deployed there; V30 and V31 are pending - back it up first), huge files at the limits, concurrent imports into one dataset (a duplicate email is stopped by the unique index, which would surface as a 500 rather than a 409 in that race), and the terms checkbox on the registration and invitation forms end to end (unit-tested on the server, compiled and wired in the frontend, but the OTP flow was not run).

## Phase 39 - sign-in sessions on the server (2 hours idle, 7 days at most)

**What changed for people**: a sign-in no longer ends after 15 minutes. It lasts while the person keeps working and ends after **2 hours without a real action**, or **7 days after signing in** whatever they do, or when they sign out. While it lasts, opening the site goes straight to the dashboard with no password (the middleware forwards `/login` when a cookie is present). Once it has ended, the sign-in page remembers the username (if ticked) and asks for the password only. The server never signs anyone in from a username alone.

* **Two cookies, both httpOnly, Secure, SameSite=Lax**: `access_token` (the JWT, 15 minutes, carries the claims every request is authorised from - unchanged) and `orbit_session` (a random 256-bit token, 7 days). The `auth_sessions` table (`V32__create_auth_sessions.sql`) stores only the **SHA-256 hash** of the token, the user, `last_activity_at` and the absolute `expires_at`: a leaked table cannot be used as a cookie.
* **Renewal** (`JwtAuthenticationFilter`): when the access token is missing or expired and the session cookie matches a live session, `SessionService.resume` reads the person **fresh from the database** (position, authority, `is_active`) and the filter issues a new access token. So a changed position or a switched-off account is seen within 15 minutes, however long the sign-in lasts. A session cookie that matches nothing is cleared in the same response, so the browser stops presenting it and `/login` stops forwarding to the dashboard.
* **Idle clock = real actions only**: `POST /api/v1/auth/session/activity` (authenticated; 401 `SESSION_ENDED` when the session is gone or the request has no session cookie) moves `last_activity_at` to now. The browser calls it at most every 5 minutes and only after a mouse/keyboard/touch/scroll event. The tab's own polling (every 30 s) does **not** call it and does not count, so a forgotten open tab still ends at 2 hours. The server writes at most once a minute per session.
* **Ending a session** deletes its row, which is what makes it immediate: `POST /auth/logout` (public, so it works with an expired access token), password **change** (the caller's other sessions end, this browser stays), password **reset** (all end), account **deactivated** or **deleted** (all end). Reactivating changes nothing. Housekeeping: every sign-in sweeps that person's sessions that can never be used again.
* **Settings** (`application.yml`): `app.session.idle-timeout-minutes: 120`, `app.session.max-age-days: 7`, `app.jwt.access-token-ttl-minutes: 15`. The unused `app.jwt.refresh-token-ttl-days` was removed. `TimeConfig` adds a `Clock` bean so the rules are testable.
* **Code**: `SessionService`/`SessionServiceImpl` (identity), `AuthSessionEntity`/`AuthSessionRepository`, `SessionCookies` (replaces the static `AuthCookies`; used by login, registration and invitation accept), `CustomUserDetailsService.toPrincipal` (shared with login), `SessionProperties`.
* **Honest limits**: (1) a revoked or idle-dead session can still pass until its current access token expires - at most **15 minutes** (the JWT is not looked up per request on purpose). In practice "2 hours idle" is 2 hours plus up to 15 minutes. (2) Someone holding both cookies (a stolen browser profile) is signed in like the owner until signed out, idle for 2 hours, or 7 days. Changing the password or an executive deactivating the account ends it. (3) Several browsers can be signed in at once; there is no screen listing them yet. (4) Everyone signed in at the moment of deploying this version is signed out once (their cookies have no session).
* **Deploy**: Flyway adds `auth_sessions` on start (V32). Back the database up first.
* **Tests**: `SessionServiceImplTest` (16: token stored hashed, resume, exact 120-minute and 7-day boundaries, switched-off/removed/no-position accounts, activity slides the window and is written at most once a minute, ending), `JwtAuthenticationFilterTest` (6: valid JWT, renewal from the session, forged JWT, dead session clears the cookie, anonymous), `SessionCookiesTest` (3), and extended `AuthServiceImplTest` / `UserManagementServiceImplTest` (password change keeps this browser only, reset ends all, deactivate/delete end all, reactivate does not). All backend unit tests pass.
* **Verified live against the dev backend and SQL Server** (V32 applied by Flyway): both cookies and their attributes; the session cookie alone is enough (fresh access token issued) and the access token alone is enough while it lasts; a forged session token gives 401 and clears the cookie; 100 minutes idle still works, 125 minutes gives 401; the activity call moves the idle clock to now and is refused on a dead session or without a session cookie; past the 7-day limit gives 401 even right after activity; sign-out clears both cookies and a copied session cookie is dead afterwards; deactivating an account deletes its sessions and it cannot sign in, and reactivating restores it; the next sign-in sweeps dead sessions.
* **Not verified**: changing the password and resetting it through the HTTP API (unit-tested only - the dev seed passwords equal the usernames, so a change could not be undone through the API's own rules), two hours of real elapsed time (the idle and absolute limits were tested by moving timestamps in the dev database), several browsers at once, and the public server (V32 is not applied there yet).

## Phase 40 - security handoff fixes (white-box pentest: sign-in brute force, forged client address, seed secrets)

A white-box review found four issues; all four were confirmed against the code before fixing. Tenant isolation (CRM access policy, own-event/notes/messages/tasks scoping, identity only from the signed token) was reported sound and is untouched.

### #1 (high) - `/login` had no brute-force protection -> fixed (persistent)

* `LoginProtectionService` (identity), called by `AuthServiceImpl.authenticate(username, password, clientAddress)`: **before** the password is checked, the attempt is refused with **429 `TOO_MANY_REQUESTS`** ("Too many attempts. Please try again later.", the same text as every other limit, never how many attempts are left) when
  * the username has **5 failed attempts in 15 minutes** - counted in memory for every name, whether or not it is an account, so the 429 never tells an attacker a username is real; matched case-insensitively ("Admin" = "admin"), or
  * the client address has **30 failed attempts in 15 minutes** across all usernames (password spraying), or
  * the account's failures stored in the database say so (below) - this is what survives a restart.
* Only **failures** count (wrong password, unknown user, switched-off account alike - all still a plain 401 as before). A successful sign-in clears the username's count; a **password reset** clears it too (proving ownership by mail lifts a lock caused by someone else's guessing). The address count is never cleared by a success, so one valid account cannot be used to reset an attacker's allowance.
* **Persistence** (`V33__create_login_failures.sql`, `LoginFailureEntity`): failures of existing accounts are counted in `login_failures` (one row per account while it has recent failures, fixed 15-minute window, deleted on success). A separate table, not columns on `users`, so strangers' failed attempts do not rewrite the account's audit columns. Concurrent failures of one account are serialised by a row lock on the user (`findActiveByUsernameForUpdate`), so none is lost.
* **Not a lock-out**: the block lasts at most the 15-minute window. A progressive lock-out was considered and rejected: a lock that grows only for real accounts would reveal which usernames exist, and anyone who knows a username (a CEO's, for example) could keep that person out indefinitely. The per-address limit still applies to the attacker.
* `RateLimiter` gained `isExhausted` (look without counting), `record` and `clear`, and reads a `Clock` so the windows are testable; `RateLimitGuard.tooManyRequests()` is the one 429 every limit throws.

### #2 (medium) - per-address limits could be bypassed with a forged `X-Forwarded-For` -> fixed

* The two copies of `clientIp` (AuthController, RateLimitGuard) read the **first** `X-Forwarded-For` entry, which the client controls. There is now one, `RateLimitGuard.clientIp`, and it returns `request.getRemoteAddr()`.
* That address is resolved by Tomcat's `RemoteIpValve` (`server.forward-headers-strategy: native`): `X-Forwarded-For` is read **only when the request comes from a trusted proxy** (`server.tomcat.remoteip.internal-proxies`) and is walked **right to left**, so an address a client prepended is ignored. Trusted by default: loopback only (`TRUSTED_PROXIES` overrides it; the Docker deployment sets the compose network's range in `deploy/docker-compose.yml`). Never set it to `.*`.
* Public site topology: Cloudflare -> cloudflared -> Next.js (this PC) -> backend. Cloudflare appends the real client address to `X-Forwarded-For`, so the right-to-left walk lands on it - traffic from the internet cannot choose its address. Next.js, however, passes on whatever `X-Forwarded-For` it receives, so a caller on the same LAN who reached Next directly (port 3000) could still choose its address. **`run-public.ps1` now starts the public frontend with `-H localhost`** (loopback only - it listens on `[::1]:3000`; cloudflared dials `localhost:3000`), so the tunnel is its one caller. It must be the name `localhost`, not `127.0.0.1`: Next.js 14.2 turns `127.0.0.1` into `localhost` in a redirect target (`parseURL`) but not in the request's own URL (`initUrl`), so the two origins differ, the redirect is not made relative, and `/dashboard` without a session sent visitors to `https://localhost:3000/login`. That happened for a few minutes on 2026-10-08 with `-H 127.0.0.1`, was reverted at once, and the cause was then reproduced and fixed on a throwaway server before going public again. `middleware.ts` needed no change.

### #3 (low-medium) - in-memory limits reset on restart / are per instance

* For sign-in, solved by the database count (#1). The other public limits (forgot/reset password, registration OTP, invitation tokens) stay in memory: acceptable on the single-instance public site, to be moved to a shared store before running several instances (see `RateLimiter`'s javadoc).

### #4 (low) - a real email address and the broadcast account's password were committed

* `DevDataSeeder` reads them from settings (`app.dev-seed.recovery-email` / `app.dev-seed.broadcast-password`, i.e. `DEV_SEED_RECOVERY_EMAIL` / `DEV_BROADCAST_PASSWORD` in the git-ignored `backend/.env.local`; empty placeholders in `.env.example`). Without a password the broadcast account is simply not created (logged as a warning); without an email the seed accounts have no recovery address. Both were removed from `backend/README.md`.
* The broadcast account's password on the dev database was **rotated** (the old value no longer signs in). It was only ever in the dev database - the public database `orbit` has no `orbit_broadcast` account. The old value and the address remain in **git history** (rewriting pushed history is destructive and was not done); with the password rotated, the historical value is useless.

### Tests and verification

* **Unit** (all backend unit tests pass, 379): `LoginProtectionServiceImplTest` (9: limit then 429, unknown username gets the same answer and stores nothing, capitalisation, window expiry, per-username and per-address isolation, success clears the username but not the address, failures survive a restart, a failure after the window starts a new count), `AuthServiceImplTest` (blocked before the password is checked, failure counted and still 401, success clears, password reset clears), `RateLimiterTest` (5), `RateLimitGuardTest` (forged header ignored, one uniform 429).
* **Live, dev backend + SQL Server** (V33 applied by Flyway): 5 wrong passwords -> five 401, then **429 even with the right password**; another username unaffected; an unknown username gets five 401 then the identical 429; the failures are in `login_failures`; **after a backend restart the account is still blocked**; from the PC's LAN address (not a trusted proxy) 30 sprayed failures each with a different forged `X-Forwarded-For` -> the 31st is 429, while another address is unaffected; the leaked broadcast password worked before rotation and not after, the new one works. Dev counters were cleared afterwards.
* **Found while testing**: through the Next.js server reached directly from the LAN, 31 failures with different forged headers were all 401 - Next passes the header on. Closed for the public site by the `localhost` binding above. The **dev** frontend (`run-local.ps1`) still listens on all interfaces, as before; it holds weak seed accounts, so keep the PC's LAN trusted or bind it to `localhost` too.
* **Deployed to the public site** (2026-10-08, after the backup `BACKUP_PUBLIC_orbit_20261008_2157`, schema V31): Flyway applied V32 and V33; an unknown username got five 401 then 429 through Cloudflare; anonymous `/auth/me` and the activity call answer 401; documentation endpoints still redirect to `/login`. After the `localhost` binding (restart without rebuilding): port 3000 listens on `[::1]` only and the LAN address is refused; through Cloudflare `/dashboard` (with or without a query) without a session -> `307 /login`, `/login` with a session cookie -> `307 /dashboard`, `/`, `/en` and `/login` -> 200; the same cases were checked first on a throwaway `next start -H localhost` with Cloudflare's Host / X-Forwarded-Proto headers.
* **Not verified**: the per-address limit through Cloudflare with two different real addresses, the Docker deployment's `TRUSTED_PROXIES` value on a real Docker host, and many backend instances.
