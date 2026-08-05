---
name: review-gate
description: Run every review skill on the current change and emit the proof that each one ran, as a checklist to show in chat. Use before a commit or pull request, after a reviewable change, or when the user says "prove the reviews", "review gate", "run all reviews", "chứng minh đã duyệt skill", "chạy hết review skill", "soát đủ skill".
---

# Review gate

Run every review skill on the current change, then emit the proof that each one
ran. The output is a checklist shown in chat after the change. Never tick a
skill that was not run. The checklist is evidence, not intent.

## 1. Resolve the change

Uncommitted work is `git add -N .` then `git diff HEAD`. A branch is
`git diff <base>...HEAD` against the integration branch it forked from. State
the range at the top of the output.

## 2. Run each skill, keep a one-line result

Run each review skill on the resolved change and record one line for it.

| Skill                 | Runs on                         | Records                           |
| --------------------- | ------------------------------- | --------------------------------- |
| `commit-convention`   | the commit message              | subject length, body wrap, footer |
| `pr-convention`       | branch, title, labels, reviewer | conforms, or the gap              |
| `comment-review`      | comments in the diff            | count and verdicts                |
| `code-style`          | formatting, lint, imports       | tools run and result              |
| `architecture-review` | structure of the change         | result, or `N/A` with the reason  |
| `ponytail-review`     | the diff                        | lean, or findings cut             |

A skill that does not apply is `N/A` with the reason, never a silent skip.

## 3. Emit the proof

```markdown
## Reviews

- [x] claude chat - presented to the user, approved before push or create
- [x] commit-convention - <result>
- [x] pr-convention - <result>
- [x] comment-review - <result>
- [x] code-style - <result>
- [x] architecture-review - <result, or N/A and the reason>
- [x] ponytail-review - <result>
```

Tick a line only after the skill ran and produced that result.

## 4. Gate

If any skill reports a finding that should block, say so and stop before the
commit or pull request. The gate passes only when every line carries a real
result or a justified `N/A`.
