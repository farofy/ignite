---
name: pr-convention
description: Branch naming and pull request standard for every project: branch format, PR title, required description sections, two-PR flow, reviewer/assignee/label. Detects ticket prefix, target branch and organization from the repo itself. Asks when it cannot. Use whenever creating or preparing a pull request, naming a branch, running `gh pr create`, reviewing a PR title, or when the user says "create a PR", "raise a PR", "open a pull request", "tạo PR", "mở pull request", "đặt tên nhánh".
---

# Branch & Pull Request Standard

The standard lives **in this skill**, so it works on any project, including
repositories with no `CONTRIBUTING.md`. If the repository **does** have a
`CONTRIBUTING.md` or PR template, **that file wins**. Read it and follow it.

---

## 1. Default standard

### Branches

Short-lived branches cut from the integration branch. `<TICKET>` is the ticket
id (for example `PROJ-42`).

Conventional Commits covers commit messages and says nothing about branch
names, so these prefixes are a convention of this standard rather than a rule
from the specification. They spell the word out where the commit type is
abbreviated. A `feat` commit lands on a `feature/` branch and a `fix` commit on
a `bugfix/` branch. Every other type is its own prefix (`docs/`, `refactor/`,
`perf/`, `test/`, `ci/`, `build/`, `chore/`).

| Pattern                 | Use case                                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `<prefix>/<TICKET>`     | `feature/`, `bugfix/`, `docs/`, `refactor/`, `perf/`, `test/`, `ci/`, `build/`, `chore/`                                 |
| `<prefix>/<TICKET>_<M>` | Cherry-pick to the test branch. `M` is the delivery number, starting at `1`, incremented on each re-delivery after a fix |

Example: `build/PROJ-8`, then `build/PROJ-8_1` for the cherry-pick.

### PR title

```text
[COMPANY] [TARGET] <TICKET> <Imperative description>
```

- `COMPANY`: the organization that owns the ticket.
- `TARGET`: abbreviated target branch (`STG`, `DEV`, `MAIN`).
- Description: present tense, starts with a verb, no trailing period.
- **Sentence case**. Capitalise the first word only: `Configure npm publishing`.
  This differs from commit subjects, which are entirely lowercase.

Example: `[Acme] [STG] PROJ-3 Add bootstrap command`

### PR body

If the repository has a `.github/PULL_REQUEST_TEMPLATE.md`, fill that in and
skip this section. Otherwise use this structure, keeping every heading:

```markdown
## Description

State what changed and why, without repeating the title. Keep it short.

## Type of change

- [x] `build` - Build system or dependency change

## Changes

- `path/to/file` - what changed and why it was needed

## Testing

- [x] `npm test` - 16/16 pass
- [x] `npm run build` - emits `dist/`

## Checklist

- [ ] Tests added or updated
- [ ] Documentation updated for user-facing changes
- [ ] PR title follows the required format

## Notes

Implementation notes, compatibility notes, or follow-up work.

## Related PRs

| PR  | Branch                        | Description             |
| --- | ----------------------------- | ----------------------- |
| #15 | `build/PROJ-8` -> `staging`   | Lands on staging        |
| #16 | `build/PROJ-8_1` -> `develop` | Cherry-picks to develop |

## Linked issue

[PROJ-8](https://jira.example.com/browse/PROJ-8)
```

Rules for filling it in:

- **Type of change**: tick exactly one, the same type as the branch prefix and
  the commit. Append `!` for a breaking change. The `changelog:` label maps from
  this, not one to one (`feat` -> `changelog: feature`).
- **Changes**: list at file level, say what changed and why, never the path alone.
- **Testing**: paste real command output as evidence. Long output goes in a
  `<details><summary>` block. Use `N/A` only when the change has no runtime
  effect, such as documentation. **Never tick a check that was not run.**
- **Related PRs**: required for the two-PR flow. Cross-reference both PRs of
  the same ticket. Drop the section when there is only one PR.
- **Linked issue**: the ticket URL. Detect the tracker base URL from earlier
  PRs. If it cannot be detected, **ask the user**. Never invent one.
- Drop `Notes` when there is nothing to say. Keep every other heading.

#### The second pull request in a two-PR flow

The cherry-pick carries the same change as the source, so repeating its detail
creates two copies that drift apart. Defer to the source instead.

| Section          | Content                                                     |
| ---------------- | ----------------------------------------------------------- |
| `Description`    | One line: what is cherry-picked, from which branch to which |
| `Type of change` | `See #<source>.`                                            |
| `Changes`        | `See #<source>.`                                            |
| `Testing`        | **Own content, see below**                                  |
| `Checklist`      | `See #<source>.`                                            |
| `Related PRs`    | Full table, same in both PRs. Link the cherry-picked commit |
| `Linked issue`   | Full link, same ticket                                      |

`Testing` is the one section that never defers. The cherry-pick carries a risk
the source cannot cover, which is whether it applied cleanly on a different
branch. Record two things:

```markdown
- [x] N/A - identical to #15 (no changes from the staging branch)
- [x] No conflicts with existing changes on develop
```

Write `See #<source>.` only where the content would be identical. Never use it
to avoid work on a section that has something of its own to say.

### Present before you create

Before running `gh pr create`, show the user the full pull request and wait for
their explicit approval. Include:

- the title, with its ticket id,
- the base and head branches,
- the labels,
- the reviewer and the assignee, each named,
- the complete body, not a summary.

When the ticket id, the reviewer, the assignee, or a label is not clear, ask the
user rather than guessing. Never invent a ticket id. Never open the pull request
before the user approves it. The cherry-pick pull request follows the same rule.

### Reviewer, assignee and label

Every PR must have all **three** before it is created:

| Item         | Rule                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------- |
| **Assignee** | The PR author self-assigns (`@me`). If the implementer differs from the author, assign the implementer. |
| **Reviewer** | At least one. This is a **real person**. The user must confirm. Never guess a name.                     |
| **Label**    | Every label that describes the PR. See Choosing labels.                                                 |

#### Choosing labels

Run `gh label list` first and **choose only from what it returns**. The
`repo-setup` skill creates the set.

A PR carries no `type:` label. The Conventional Commit type is already in the
title, so the label would repeat it. It does carry `target:`, which mirrors the
base branch and the title. In the two-PR flow that keeps the staging PR and the
develop PR distinct at a glance.

What a PR carries, set by the agent from the change itself:

| Namespace    | Meaning                                   | Values                                                                                  |
| ------------ | ----------------------------------------- | --------------------------------------------------------------------------------------- |
| `changelog:` | How the change reads in the release notes | `changelog: feature`, `changelog: bugfix`, `changelog: breaking`                        |
| `impact:`    | Blast radius of the change                | `impact: user-facing`, `impact: internal`, `impact: performance`, `impact: reliability` |
| `area:`      | Component touched, defined per project    | `area: skills`, `area: ci`, `area: hooks`, `area: docs`, and the rest of the set        |
| `target:`    | Target branch, mirrors the base and title | `target: staging`, `target: develop`, `target: main`                                    |

#### Commit type to `changelog:` label

The changelog label drives the release notes, so it maps from the change, not one
to one from the commit type. Confirm the label exists in `gh label list` first:

| Commit type                                        | `changelog:` label           |
| -------------------------------------------------- | ---------------------------- |
| `feat`                                             | `changelog: feature`         |
| `fix`, `perf`                                      | `changelog: bugfix`          |
| a breaking change (`!`)                            | `changelog: breaking`        |
| `docs`, `refactor`, `test`, `build`, `ci`, `chore` | none, or `release-note-none` |

`changelog:`, `impact:`, `area:` and `target:` describe almost every PR, so apply
all four. Read `area:` from the changed paths and `target:` from the base branch.
Add `priority:` when urgency matters, `severity:` for a bug, or `quality:` for an
error-handling or logging change. A security fix takes `changelog: bugfix`,
`impact: reliability`, `severity: critical` and `priority: high`. The label count
follows the change. It is not a fixed number.

If no label matches, pick the closest by meaning. If nothing is close, **ask the
user**. Do not create a label.

#### What the agent leaves alone

`status:` tracks workflow state and the process sets it, not the PR author.
`type:` repeats the Conventional Commit type in the title, so it is not applied.
Everything else is fair game when the change calls for it.

When the repository has no namespaced labels, fall back to the closest plain
labels by meaning (`enhancement` for a feature), still **1-3 maximum**.

**Never create new labels**: that changes repository configuration. If no
suitable label exists, ask the user to pick from the existing list, or ask
permission to create one.

### Two-PR flow

When the repository has **both a test branch and an integration branch**, one
change ships as two PRs. The promotion direction varies by team, so **confirm
with the user which branch takes the first PR and which receives the cherry-pick
before opening either PR**. Never assume it from the branch names.

The common default, to confirm before applying:

1. `<prefix>/<TICKET>` → test branch (the first PR, for example `staging`).
2. `<prefix>/<TICKET>_<M>` → integration branch (cherry-picked from PR 1, for
   example `develop`).

If testing finds a bug: fix on `<prefix>/<TICKET>`, create
`<prefix>/<TICKET>_<M+1>`, cherry-pick again. A release promotes the first-PR
branch to the production branch, not the cherry-pick target.

If the repository has only one main branch, open **a single PR** and skip the
cherry-pick entirely.

### Review & merge

- At least one approval before merge.
- Squash merge is the default for integration and test branches.

**The PR title must not become the squash commit message.** It carries the
`[COMPANY] [TARGET]` prefix and is not a valid Conventional Commit.

Required repository settings:

```bash
gh api -X PATCH repos/<owner>/<repo> \
  -f squash_merge_commit_title=COMMIT_OR_PR_TITLE \
  -f squash_merge_commit_message=COMMIT_MESSAGES
```

`COMMIT_OR_PR_TITLE` uses the commit subject when the PR has **exactly one
commit**, and falls back to the PR title when it has more. So:

| PR contents | Squash subject     | Action                                                |
| ----------- | ------------------ | ----------------------------------------------------- |
| 1 commit    | The commit subject | Nothing: already conventional                         |
| 2+ commits  | The PR title       | **Edit the squash message box by hand at merge time** |

Prefer one commit per PR. When a PR carries several commits, whoever merges must
replace the pre-filled subject with a Conventional Commits message written per
the `commit-convention` skill.

---

## 2. Detect project-specific values

Never ask for anything that can be derived. Detection order:

| Value              | How to detect                                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Ticket prefix      | `git branch -r` and `git log --oneline -50`, look for `[A-Z]{2,}-\d+`                                                                |
| Target branch      | `git branch -r`: check for `staging`, `develop`, `main`/`master`                                                                     |
| `COMPANY`          | Organization in the remote: `git remote get-url origin` → `github.com/<org>/…`                                                       |
| `TARGET`           | Derived from the target branch: `staging`→`STG`, `develop`→`DEV`, `main`→`MAIN`                                                      |
| Number of PRs      | Integration and test branches present: 2 PRs. Only `main`: 1 PR                                                                      |
| Available labels   | `gh label list`: choose only from this list                                                                                          |
| Suggested reviewer | `CODEOWNERS` (root, `.github/`, `docs/`); otherwise `gh pr list --state merged --limit 20 --json reviews` to see who usually reviews |
| Assignee           | `gh api user --jq .login` → defaults to `@me`                                                                                        |

---

## 3. Ask when detection is not conclusive

**Run this check before every PR.** Walk the whole checklist. If any item cannot
be detected, conflicts, or **can only be guessed rather than confirmed**, **ask
the user**. Do not guess, do not borrow values from another project, do not
silently skip.

Checklist for every PR:

- [ ] Ticket prefix and number
- [ ] Branch name matches the pattern
- [ ] Target branch
- [ ] `COMPANY` and `TARGET` in the title
- [ ] Number of PRs to create (1 or 2)
- [ ] Assignee
- [ ] Reviewer
- [ ] Labels: one `changelog:` and one `impact:`
- [ ] Test results: actually run, or explicitly not run

How to ask:

- Batch **all** questions into **one** round, each with a proposed answer so the
  user only has to confirm. Never drip-feed questions one at a time.
- State what was detected and why it is not certain.

Never fabricate, always ask:

- **Ticket number**: do not infer it from a branch name that does not follow
  the pattern.
- **Test results**: report only what actually ran. If nothing ran, say so.
- **Reviewer**: requesting review notifies a real person. Proposing a name from
  `CODEOWNERS` or review history is fine, but the user must confirm before it is
  assigned.

---

## 4. Pre-flight checks

- Does the current branch name match the pattern → if not, report it and propose
  a correct name.
- Is the target branch correct.
- Has the branch been pushed to the remote.
- Is the change scoped to one concern → if it mixes several, say so.
- Are assignee, at least one reviewer, and all three labels present.

---

## 5. Confirm before creating

Creating a PR is an outward action. **Print the title, body, and
reviewer/assignee/label for the user and wait for approval** before running:

```bash
gh pr create \
  --base <target-branch> \
  --title "[COMPANY] [TARGET] <TICKET> <description>" \
  --body-file <file> \
  --assignee @me \
  --reviewer <user1>[,<user2>] \
  --label <label>
```

---

## Diction

Applies to the PR title and every section of the body.

| Class             | Banned words                                                                         |
| ----------------- | ------------------------------------------------------------------------------------ |
| Praise            | awesome, amazing, powerful, magic, elegant, seamless, robust, blazing, comprehensive |
| Self-assessment   | clean, simple, nice, better, improved, optimal, smart                                |
| Filler            | just, simply, easily, very, quite, highly, significantly, greatly                    |
| Meta-commentary   | this commit, this PR, in this change, we now                                         |
| Empty transitions | additionally, furthermore, moreover, it is worth noting                              |

- A performance or reliability claim carries a number, or it is dropped.
- No emoji, exclamation marks, first person, or rhetorical questions.
- `Description` states what changed and why. It does not sell the change.
- `Changes` lists facts per file, not adjectives.

| Avoid                                  | Write                                            |
| -------------------------------------- | ------------------------------------------------ |
| `Cleanly refactor the messy auth flow` | `Extract token validation from the auth handler` |
| `Significantly improve build speed`    | `Cache node_modules between CI runs`             |

Follows published conventions only: Conventional Commits, the Angular commit
guidelines, Google's `eng-practices`, and Chris Beams' seven rules. A
repository's own convention outranks these.

---

## Prohibited

- Fabricating ticket numbers, Jira ids, test results, or evidence.
- Emoji, marketing language, or AI-style prose in the title or body.
- Running `gh pr create` before the user approves.
- Renaming a branch or force-pushing without asking.
