---
name: git-github
description: Manage repository changes safely, preserving user work and requiring explicit approval for commits, pushes, or protected-branch operations.
---

# Git and GitHub

Use for Git inspection, branching, commits, pushes, PR-related preparation, or history-sensitive changes.

## Workflow

Before changes inspect `git status`, current branch, and recent commits. Preserve uncommitted user work; never discard or overwrite it. Prefer `main`, `develop`, `feature/*`, `fix/*`, `refactor/*`, `chore/*`, and `security/*` naming when compatible with project practice. Use conventional commits such as `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `security:`, `chore:`, and `perf:`.

Do not commit or push automatically. Once implementation is approved, ask: **"Code đã được duyệt. Bạn có muốn tôi commit và push lên GitHub không?"** After explicit approval, review status/diff, run applicable tests/build, scan for secrets and excluded files, then commit and push. Do not force-push protected branches or bypass CI/checks.
