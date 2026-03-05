---
name: fleet-short-template
description: Generate concise, repeatable fleet-mode prompt templates for parallel subagent execution. Use when the user wants a short reusable structure instead of repeating long instructions for bug fixing, feature work, investigation, validation, or research in /fleet mode.
---

# Fleet Short Template

Generate a copy-paste prompt with fixed sections so /fleet runs consistently and with less token overhead.

## Workflow

1. Confirm the user will run `/fleet` first.
2. Capture exactly five inputs:
   - Goal (one sentence)
   - Scope (files/modules allowed to change)
   - Acceptance checks (2-4 verifiable outcomes)
   - Constraints (forbidden changes, safety rules)
   - Execution preference (parallel depth, model, sync/background)
3. Produce a compact template using the format below.
4. If inputs are missing, keep placeholders and mark them clearly.
5. Keep output short and ready to paste.

## Canonical short template

```text
[FLEET-TEMPLATE]
Goal: <one-sentence objective>
Scope: <allowed files/modules only>
Acceptance:
- <check 1>
- <check 2>
Constraints:
- Minimal changes
- No unrelated files
- No commit unless asked
Execution:
- Model: Claude Opus 4.6
- Parallel: <how many independent tracks>
- Mode: <sync/background preference>
Output:
- What changed
- Validation results
- Remaining risks/blockers
```

## Template variants

Read `references/prompt-templates.md` and pick one variant:
- `bug-fix` for runtime errors and regressions
- `feature-delivery` for end-to-end implementation
- `investigation-only` for root-cause and evidence collection
- `verification-pass` for focused validation and release confidence

## Guardrails

- Do not restate long generic instructions.
- Do not include unnecessary background text.
- Prefer explicit acceptance checks over vague goals.
- Prefer narrow scope over project-wide edits.
