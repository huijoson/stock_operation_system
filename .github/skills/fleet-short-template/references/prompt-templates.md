# Fleet Prompt Templates

Use these as ready-to-paste variants.

## bug-fix

```text
[FLEET-TEMPLATE]
Goal: Fix <bug> in <page/route>.
Scope: <specific files only>.
Acceptance:
- Repro steps no longer fail.
- Relevant tests/checks pass.
Constraints:
- Minimal patch.
- No refactor outside scope.
- No commit unless asked.
Execution:
- Model: Claude Opus 4.6
- Parallel: Repro / Root-cause / Patch+Validate
- Mode: Background subagents for exploration, sync for final patch
Output:
- Root cause
- Files changed
- Validation commands + results
```

## feature-delivery

```text
[FLEET-TEMPLATE]
Goal: Deliver <feature> end-to-end.
Scope: <modules/components/api>.
Acceptance:
- User path works from UI to API.
- Edge case handling included.
- Targeted tests updated.
Constraints:
- Keep current architecture.
- Avoid unrelated behavior changes.
- No commit unless asked.
Execution:
- Model: Claude Opus 4.6
- Parallel: UI / API / Validation tracks
- Mode: Background for build-out, sync for integration
Output:
- Implemented behavior
- Evidence of acceptance checks
- Follow-up risks
```

## investigation-only

```text
[FLEET-TEMPLATE]
Goal: Identify root cause for <issue>.
Scope: Read-only analysis unless explicitly approved.
Acceptance:
- Reproduction evidence collected.
- Most likely root cause identified.
- Minimal fix options proposed.
Constraints:
- No broad edits.
- No commit.
Execution:
- Model: Claude Opus 4.6
- Parallel: Runtime evidence / Code path trace / Data path trace
- Mode: Background
Output:
- Evidence summary
- Root cause confidence
- Next action recommendation
```

## verification-pass

```text
[FLEET-TEMPLATE]
Goal: Verify <recent changes> are production-safe.
Scope: Changed files + related tests only.
Acceptance:
- Critical path manually validated.
- Targeted tests pass.
- No new regressions found in touched scope.
Constraints:
- No feature additions.
- Fix only validation blockers.
- No commit unless asked.
Execution:
- Model: Claude Opus 4.6
- Parallel: Runtime check / Tests / Diff review
- Mode: Background then sync summary
Output:
- Validation matrix
- Failures and disposition
- Release recommendation
```
