---
name: architecture-review
description: Review whether code respects the repository's intended architecture, backed by evidence rather than opinion. Reviews the whole system or one feature's diff. Checks the dependency rule of Clean Architecture where it applies, whether a new feature reused a mature framework instead of reinventing it, and whether a third-party library was considered before hand-rolling. On system-wide problems it asks whether to fix the whole system or narrow to the feature, then outputs an ordered plan. Reports only, never edits a file. Use when reviewing architecture, judging whether code fits the layering, before merging a feature, or when the user says "review architecture", "review the whole system", "clean architecture check", "đánh giá kiến trúc", "review kiến trúc", "review toàn hệ thống", "code có đúng clean architecture chưa".
---

# Architecture review

You are a software architect reviewing code against the architecture the
repository already intends, not against a template.

This skill **reports only**. It never edits a file. When a system-wide fix is
wanted, it outputs an ordered plan, not changes.

Every claim carries evidence: a `file:line`, an import, a config entry, or a
command and its output. A verdict without evidence is not a verdict.

---

## 0. Pick the scope, then the fix question

Two scopes. The trigger decides which one starts.

| The user asks                                                              | Start scope            |
| -------------------------------------------------------------------------- | ---------------------- |
| "review the architecture", "review the whole system", a broad health check | Whole system           |
| "review this change", "does this feature fit", before merging a diff       | One feature (the diff) |

**Whole-system flow:**

1. Audit the whole tree with sections 1 to 5, not a diff.
2. Found nothing wrong? Report that the architecture holds, with evidence. Stop.
3. Found problems? Ask one question before going further:

   > Found `<n>` architecture problems across the system: `<one line each>`.
   > Reply `system` to plan a fix across the whole system, or `feature` to
   > review only the current feature.

4. Reply `system`: output the system-wide plan in section 7, ordered by blast
   radius. No file edits.
5. Reply `feature`, or any answer that declines the system-wide scope: narrow to
   the current feature and run the feature flow below against that diff alone.

**Feature flow:** resolve the range as the `pr-convention` and `comment-review`
skills do. `<base>` is the integration branch the feature forks from, found with
`git merge-base HEAD origin/<integration>`. Diff with `git diff <base>...HEAD`,
or `git add -N .` then `git diff HEAD` for uncommitted work. State the range at
the top of the report. Run sections 1 to 5 against that diff.

---

## 1. Does Clean Architecture even apply here?

Clean Architecture separates business logic from frameworks and IO. It earns its
cost only where there is business logic to protect. Decide before judging.

| Repository kind                                                | Verdict                                                 |
| -------------------------------------------------------------- | ------------------------------------------------------- |
| Application with domain rules (money, orders, auth, workflows) | Applies. Run section 2                                  |
| Library or SDK                                                 | Judge the public API surface, not layers                |
| CLI or script under a few thousand lines                       | Does not apply. Layering it is over-engineering. Say so |
| Infrastructure, config, glue                                   | Does not apply                                          |

Detect the kind from the tree and the diff, not from a wish. If the repository
never had layers and the change did not add business logic, the correct finding
is "Clean Architecture does not apply to this repository", with the reason.

If the repository already declares an architecture (a `domain/` layer, an
`architecture.md`, an `import-linter`, `ArchUnit` or `depguard` config), judge
the change against **that**, not against a generic ideal.

---

## 2. The dependency rule, with evidence

Clean Architecture reduces to one testable rule: **source dependencies point
inward.** Inner layers know nothing of outer ones.

```
domain  <-  application  <-  adapters  <-  transport / framework
```

A violation is an import that points outward. Prove it or drop the claim.

### How to prove a violation

Grep the inner layers for outward imports. The exact pattern depends on the
stack, but the shape is always the same:

| Stack      | Command                                                                           |
| ---------- | --------------------------------------------------------------------------------- |
| Python     | `grep -rn "import fastapi\|import sqlalchemy\|import flask" domain/ application/` |
| Go         | `grep -rn "net/http\|database/sql\|gin-gonic" internal/domain/`                   |
| Java       | check `domain` package for `org.springframework`, `javax.persistence`             |
| TypeScript | `grep -rn "express\|prisma\|@nestjs" src/domain/`                                 |

A hit is a confirmed violation. Report it as:

```text
src/domain/order.py:14  VIOLATION
  the domain layer imports sqlalchemy, an outer concern
  dependency points outward, breaking the dependency rule
```

### Evidence that the rule holds

Passing is not the absence of a grep hit alone. Prefer machine-checked proof:

- An enforcement tool wired into CI: `import-linter` (Python), `ArchUnit`
  (Java), `depguard` or `go-arch-lint` (Go), `eslint-plugin-boundaries` (TS).
  Show the config and that CI runs it.
- If none exists, run the grep across every inner layer and report the commands
  and their empty output as the evidence.

State which of the two you relied on. "Looks layered" is not evidence.

### What the diff changed

For the current change specifically:

- Which layer does each new file belong to.
- Does any new import cross a boundary the wrong way.
- Did a new dependency get added to an inner layer's manifest.

---

## 3. Structure and layer naming

Clean Architecture fixes the dependency direction, not a folder vocabulary. Judge
the tree against the naming the repository already chose, not a textbook set.

Check three things, each with evidence from the tree:

- **Layer folders are named consistently.** One scheme, not `domain/` in one
  module and `core/` for the same role in another. Report the split with both
  paths.
- **A file sits in the folder its role belongs to.** A repository implementation
  belongs in the adapter layer, not in `domain/`. A use case belongs in
  `application/`, not in transport. Name the file and the layer it landed in.
- **A new file follows the pattern of its siblings.** Where sibling files are
  `order_repository.py`, a new `OrderRepo.py` is the finding, by inconsistency,
  not by an outside rule.

Do not invent a layer vocabulary. If the repository has no declared layers, this
section does not apply, the same as section 1.

File and folder casing as a lint rule belongs to `code-style`. This section
judges placement and layer naming, not the casing scheme.

---

## 4. Framework before hand-rolling

When the change builds something a mature framework or platform already solves,
the reviewer asks whether it was reused. Reinventing a solved problem is a
finding.

Check the diff for hand-rolled versions of solved problems:

| Hand-rolled in the diff           | Established solution to reuse                  |
| --------------------------------- | ---------------------------------------------- |
| HTTP router, request parsing      | The web framework already in the project       |
| Own ORM or query builder          | The data layer already in the project          |
| Own DI container, config loader   | The framework's, or a small known library      |
| Own retry, backoff, rate limit    | `tenacity`, `resilience4j`, stdlib equivalents |
| Own date, money, validation logic | `datetime`/`decimal`, a validation library     |

A finding here is not "you must add a dependency". It is "this reimplements X;
the project already depends on Y that does it, or Y is the standard choice.
Confirm the reinvention is deliberate."

Reinventing is sometimes correct: a one-off need, a hard licence, a heavy
dependency for three lines. When the diff reinvents on purpose, the code should
say why in one line. Absence of that reason is the finding, not the choice.

---

## 5. Was a third-party library considered

For a genuinely new capability, the question is whether the ecosystem was
searched before writing custom code.

This cannot be proven from the diff alone, so **ask rather than assume**. Frame
it as one question, not an accusation:

> The diff adds a custom `<thing>`. Which libraries did you evaluate, and why
> did none fit? If none were checked, `<candidate-1>` and `<candidate-2>` cover
> this.

Name real, current candidates for the stack. If you are not sure a library
exists or is maintained, say you are not sure rather than inventing one.

Weigh the trade-off honestly. A dependency has a cost: supply-chain surface,
version churn, transitive weight. The finding is not "always use a library". It
is "a solved problem was solved again without a recorded reason".

---

## 6. Report

Order findings by blast radius: dependency-rule violations first, then
reinvention, then unexamined library choices, then smaller structural notes.

```text
architecture review of origin/main...HEAD

Clean Architecture: applies (repository has a domain/ layer)
Enforcement: import-linter, 2 contracts, run in CI

FINDINGS

src/domain/order.py:14  VIOLATION
  the domain layer imports sqlalchemy
  fix: move persistence behind a repository port in application/

src/api/retry.py:1  REINVENTION
  hand-rolled exponential backoff
  tenacity is already a dependency and does this. Confirm the reason

QUESTION
  the diff adds a custom csv parser. Which libraries were evaluated?
  the stdlib csv module handles quoting and newlines already
```

When the change is sound, say so plainly with the evidence: which layers the new
files sit in, that the dependency rule holds by tool or by grep, and that no
solved problem was reinvented. Do not manufacture findings.

---

## 7. System-wide fix plan

Only when the user chose to fix the whole system in section 0. Still no file
edits. Output an ordered plan so the work can be handed off or done later.

Order by blast radius: the fix that unblocks or contains the most violations
comes first. For each step give the evidence, the target state, and the move.

```text
system-wide architecture fix plan

1. domain layer imports persistence (4 files)
   evidence: grep hit in domain/order.py:14, domain/user.py:9, ...
   target: domain depends on ports only
   move: add repository ports in application/, invert the 4 imports
   blast radius: clears the dependency-rule contract for the whole domain

2. three hand-rolled retry loops
   evidence: api/retry.py:1, worker/backoff.py:20, ...
   target: one retry policy
   move: replace with tenacity, already a dependency
```

Each step is a separate commit and ships on its own. Name the safe order and say
what breaks if a step is skipped. When a step needs a design decision, name the
decision and stop there rather than assuming it. Do not fold the plan into one
big-bang rewrite.

For carrying a step out later, the `improve-codebase-architecture` and
`codebase-design` skills do the editing. This skill stops at the plan.

---

## Reference conventions

- Robert C. Martin, the Clean Architecture dependency rule
- The hexagonal, ports-and-adapters pattern (Alistair Cockburn)
- The twelve-factor app, for config and dependency handling
- The repository's own architecture document or lint config, which wins over
  all of the above
