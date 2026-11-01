# Dependency audit baseline

**Backend update (2026-10-31):** Tomcat 10.1.61, Jackson BOM 2.21.7 and Commons Lang 3.18.0.
Raw audit: 2 Critical Spring matches and 1 Moderate Log4j match; three exact conditional
non-applicable decisions, zero unreviewed/actionable repository findings. See the
[full applicability review and CI policy](dependency-review-2026-10-31.md).

**Frontend status after the hotfix:** Next.js 15.5.28; production audit has 0 Critical,
6 High, 8 Moderate and 2 Low findings. Full audit has 0 Critical, 6 High, 9 Moderate and 8 Low.
See [verified hotfix report](security-hotfix-2026-10-29.md).
The counts and Critical triage below preserve the original pre-fix snapshot, not the current state.

Recorded 2026-10-29 while adding development-only test dependencies.
No automatic vulnerability fixes, dependency overrides, downgrades or major upgrades were applied.

| Scope                        | Critical | High | Moderate | Low | Total |
| ---------------------------- | -------- | ---- | -------- | --- | ----- |
| npm audit --omit=dev         | 1        | 6    | 7        | 2   | 16    |
| npm audit (all dependencies) | 1        | 9    | 8        | 8   | 26    |

These are npm's affected-package findings, not a count of independently exploitable application flaws.
All production package versions referenced by the findings match the previous committed lockfile.
The full audit did not list any affected package path newly introduced by the test dependencies.
Full local JSON outputs are in ignored .artifacts/frontend-audit.json and frontend-audit-all.json.

The production critical finding is associated with Next.js; high findings include Zod and transitive
dependencies. Existing mitigations do not establish that every advisory is unreachable.
Several suggested fixes cross major versions, and the Excalidraw suggestion includes a downgrade;
do not run npm audit fix --force as a substitute for reviewing compatibility and attack paths.

Treat remediation as the next dependency/security work item: review individual advisory ranges and
affected features, select supported upgrades, test product behavior, then rerun the audit.
This file records open findings; it is not a suppression list or a security sign-off.

## Critical finding triage

The audit's one critical package (Next.js 14.2.35) aggregates multiple critical advisories:

- [GHSA-p293-qw3h-jr36](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36):
  unauthenticated RCE on Windows-hosted Next.js servers. The affected range includes this version.
  The project uses App Router and its public launcher runs Next directly on Windows;
  deployment conditions overlap the advisory. Upstream reports no known workaround and recommends immediate upgrade.
  Image optimization being disabled does not address this separate advisory.
- [GHSA-2xp9-vwfh-vxw4](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4):
  image optimization AVIF RCE. Local config disables optimization and no sharp package is installed.
- [GHSA-2464-fhr4-w9xw](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw):
  image optimization RCE on glibc Linux. This has separate platform/library conditions.

Treat the Windows advisory as an immediate remediation priority, rather than deferring it as routine cleanup.
The Windows fix starts at 15.5.24/16.3.3, but those versions do not close all later image advisories;
choose a current patched release after checking the complete advisory set and compatibility.
No exploit was attempted. This review does not establish compromise or the currently running production build/version.
