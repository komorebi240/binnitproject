# Next.js Critical remediation — 2026-10-29

## Outcome

Next.js and eslint-config-next are pinned to 15.5.28, upgraded from the previous 14.2.35 runtime.
React remains 18.3.1. The package manifest, installed version and lockfile agree.
The official [15.5.28 release](https://github.com/vercel/next.js/releases/tag/v15.5.28)
includes the later image-optimization security fix as well as the earlier Windows fix.

Production audit after the change: **0 Critical, 6 High, 8 Moderate, 2 Low**.
Full dependency audit: **0 Critical, 6 High, 9 Moderate, 8 Low**.
This closes the Critical finding, not every dependency finding. Remaining findings stay open for step 3.

## Exposure and containment

The Orbit Cloudflare tunnel and a public Next server were running directly on Windows.
Both were stopped before upgrading; the backend was left alone.
The Windows advisory had overlapping deployment conditions; disabling image optimization alone
did not resolve it. No exploit or compromise investigation was performed.

The old .next and .next-verify build outputs were removed after stopping the old frontend.
A fresh patched production build now exists in .next. A separate patched .next-e2e build was tested.
After the user's explicit reactivation approval, the patched frontend and Orbit tunnel were restarted.
Public checks passed: marketing/login 200, anonymous dashboard 307, image optimizer 404,
and unauthenticated API 401. CSP frame-ancestors, nosniff and SAMEORIGIN headers remain present.
No commit, push, database migration or backend restart was performed.

## Necessary compatibility changes

- The login server page awaits Next 15's asynchronous searchParams.
- The invitation client page gets its route token through useParams, preserving React 18 compatibility.
- Image optimization remains disabled; security headers, API proxy and cookie policy are preserved.
- Obsolete comments claiming the framework upgrade was still pending were removed from next.config.mjs.

## Verification

| Check | Result |
| --- | --- |
| Production dependency Critical gate | Passed, Critical = 0 |
| Full dependency audit | Critical = 0; remaining findings recorded above |
| Frontend unit/component tests | 32 suites, 1,475 passed |
| Browser smoke/regressions | 12 passed across desktop/mobile Chromium |
| Tooling regression tests | 9 passed |
| TypeScript | Passed |
| Lint | Passed with existing warnings |
| E2E production build | Passed |
| Fresh public production build | Passed; not reactivated publicly |
| Skill inventory | 19 valid |

Added browser cases verify invitation token handling, security headers and the disabled image endpoint.
Existing cases verify marketing locales, login query handling, anonymous redirect and synthetic login errors.
They do not establish full authenticated product coverage or prove there was no prior exploitation.

Local evidence stays under ignored .artifacts/tooling/ and .artifacts/security/;
the full post-fix audit is .artifacts/frontend-audit-after-hotfix-all.json.

## Agent/process improvements

- audit-frontend reads npm's production audit and fails on Critical findings, network errors or incomplete reports.
- CI runs that gate before frontend tests/build. It does not suppress unresolved High findings.
- Regression tests reject malformed, incomplete and inconsistent audit reports.
- Operating instructions now require interrupting the plan for unresolved Critical findings and reviewing cleanup
  and open risks before finishing each stage. Passing tests is not a claim of a clean working tree or a clean audit.
- The user note and earlier uncommitted tooling work were preserved. No directory restructuring or mass formatting occurred.

Step 3 has not started. Patched public service reactivation is complete;
dependency High/Moderate/Low remediation and database integration remain separate work.
