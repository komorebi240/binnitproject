---
name: bug-fix
description: Diagnose and repair defects through reproduction, a failing regression test, root-cause analysis, minimal safe change, and verification.
---

# Bug fix

Use for reported defects, regressions, incorrect behavior, or production incidents.

## Required workflow

1. Reproduce the bug and record expected versus actual behavior.
2. Write a regression test that fails before the fix, unless a test is demonstrably impossible; explain any exception.
3. Trace root cause rather than masking symptoms.
4. Implement the smallest safe fix; avoid unrelated refactoring.
5. Run the regression, related tests, full suite/build as applicable; review security impact and remove debug code.
6. Report root cause, fix, tests run, and remaining risks.
