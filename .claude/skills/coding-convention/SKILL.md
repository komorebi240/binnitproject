---
name: coding-convention
description: Apply the project's established formatting, naming, linting, and code-quality conventions during implementation or cleanup.
---

# Coding convention

Use for code creation, edits, formatting, or style cleanup.

## Workflow

1. Inspect existing nearby code plus formatter, linter, editorconfig, and language-specific configuration; project convention wins.
2. Use formatter-supported indentation, UTF-8, LF line endings, and no trailing whitespace.
3. Use `UpperCamelCase` classes/types, `lowerCamelCase` methods/variables, `UPPER_SNAKE_CASE` constants, and `is/has/can/should` booleans unless the language/project convention differs.
4. Choose descriptive names, avoid wildcard imports unless required, remove unused imports, and keep functions focused.
5. Run the configured formatter/linter when available; do not invent commands.

For Java, follow the project's Java conventions. For JavaScript/TypeScript, honor ESLint/Prettier when present. Avoid new local styles where an existing convention exists.
