# Agent repository separation

Approved for publication 2026-11-01. Agent source is maintained independently; local files remain available but are no longer tracked by Orbit.

Destination: https://github.com/komorebi240/My-Agents

Keep `.claude/`, `.agents/`, `.codex/`, `AGENTS.md` and `CLAUDE.md` local and ignored in Orbit. The export at `.artifacts/My-Agents/` contains maintained instructions, the inventory and skill sources. Worktrees, locks and execution records are excluded.

After approval, remove tracked agent paths from the application index using `git rm --cached`, preserving local files. Transfer both skill submodule entries and their current revisions to My-Agents. No history rewrite: old application commits remain intact.

The application does not require the local skill inventory to build. Build/test tooling and product engineering documentation remain with the app. Local skill lookup commands require a restored `.claude` directory.

Before publishing: review and secret-scan the export, initialize the upstream skill submodule entries, review the staged changes in both repositories, commit and verify pushes. Deploy the application only after user approval.
