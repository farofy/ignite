---
name: commit-convention
description: Generate production-grade Conventional Commits messages for enterprise repositories, emitted in both English and Vietnamese. Use whenever creating a git commit, writing or reviewing a commit message, running `git commit`, or when the user says "commit", "write a commit message", "tạo commit", "viết commit message", "commit giúp tôi".
---

# Enterprise Conventional Commit Generator

## Role

You are an expert in Git workflow and Conventional Commits, experienced in
building and reviewing large-scale enterprise repositories.

Your task is to produce production-grade commit messages following the
Conventional Commits specification: https://www.conventionalcommits.org

---

## Objective

Produce a concise, technically accurate commit message that fits the current
repository and can be used directly.

The commit message must:

- Conform to Conventional Commits.
- Reflect the actual change.
- Stay consistent with the repository.
- Be neutral and professional.
- Avoid emotive language.
- Avoid AI-style prose.
- Avoid marketing language.
- Suit long-lived enterprise projects.

Style references: Google, Meta, Airbnb, Spring Boot, Kubernetes, Linux
Foundation, Go.

---

## Process

### 1. Analyse the change

Before generating anything, analyse the full current diff.

Identify: added files, modified files, deleted files, renamed files.

Classify the change area: backend, frontend, API, database, infrastructure,
Docker, Kubernetes, CI/CD, build, config, script, security, logging,
monitoring, documentation, test, or another suitable module.

### 2. Analyse commit history

Read the repository's recent commit history with Git.

Prioritise commits in the same module, the same directory, or with a similar
scope.

Determine the existing conventions for: type, scope, subject line, terminology,
and tone.

If the repository already has a clear convention, that convention always wins.

Ignore low-quality commits such as `fix`, `update`, `temp`, `test`, `commit`,
`abc`, `1`, `2`, or similar placeholders.

### 3. Check for breaking changes

Defaults:

- A new file is **not** a breaking change.
- Do not add `BREAKING CHANGE:` without clear evidence.

Only mark a breaking change for genuinely incompatible changes: public API
changes, method signature changes, response structure changes, incompatible
schema changes, removal of backward compatibility, or changed runtime
behaviour.

Never infer a breaking change.

---

## Commit structure

```text
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

---

## Type rules

Always pick the most accurate type: `feat`, `fix`, `refactor`, `perf`, `docs`,
`test`, `build`, `ci`, `chore`, `infra`, `revert`.

When there is not enough information, use `chore`.

---

## Scope rules

**Scope is required.** Conventional Commits treats it as optional. This
standard does not. Every commit must carry a scope: `type(scope): description`.

If the repository already has a convention, follow it. Otherwise: lowercase,
short, reflecting the actual domain. For example `auth`, `payment`, `docker`,
`infra`, `cron`, `cache`, `websocket`, `security`, `logging`, `monitoring`.

When unsure, infer it from the main module or directory, preferring
lowercase-kebab-case.

For a change that genuinely spans the whole repository, still pick a real
broad scope such as `repo`, `setup`, or `build`. Never drop the scope.

---

## Short description rules

The short description must be in the present tense and start with a technical
verb: add, update, fix, remove, rename, refactor, improve, optimize. The verbs
`improve` and `optimize` name an action and are allowed here. The adjectives
`improved` and `optimal` grade the work and stay banned (see Banned vocabulary).

**Write it entirely in lowercase**: including product names and acronyms
(`github cli`, `claude code`, `url`, `pr`). Never capitalise the first letter.

It must not use emotive language, marketing language, AI-style prose, long
explanations, file paths, or state the obvious.

Banned words: awesome, amazing, powerful, smart, magic, clean, simple.

Length: aim for **50 characters or fewer** for the whole header, including type,
scope, the colon, the space, and the description. **72 is the hard limit.** The
commit hook warns above 50 and rejects above 72. Prefer a tighter description
over a longer one. Drop filler before adding characters.

The limit is on the commit you write. When a pull request is squash-merged,
GitHub appends ` (#<pr>)` to the subject on the target branch, which runs past
the limit. That suffix is expected. Do not rewrite a merge commit to strip it.
Merge with `gh pr merge --squash --subject --body-file` so the body and trailer
survive the squash, since the web UI drops them.

---

## Body rules

Include a body when the change is not self-evident from the subject: several
files touched, a reason a reviewer would question, a compatibility impact, or a
migration step. A trivial or self-explanatory change takes the subject alone.

When a body is used: at most 3 lines, concise, covering only what changed, why
it changed, compatibility impact if any, and migration steps if any.

Do not repeat the subject line, do not write documentation, do not add
unnecessary content.

---

## Footer rules

Add only when genuinely needed. Use the standard git trailer capitalisation
exactly as shown, `Co-authored-by` and not `Co-Authored-By`:

```text
Refs: #123
Reviewed-by: Name
Co-authored-by: Name <email>
```

Trailers go in the last paragraph, separated from the body by a blank line.

---

## Style

Commits must be neutral, technical, professional, maintainable, and suitable
for enterprise repositories and mature open-source projects.

Do not use emoji, conversational prose, AI-style prose, or hyperbole.

---

## Diction

Applies to the subject, the body, and any PR description.

### Imperative mood

The subject completes the sentence "This commit will \_\_\_". Write `add`, never
`added` or `adds`.

### Banned vocabulary

| Class             | Words                                                                                | Reason                                         |
| ----------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------- |
| Praise            | awesome, amazing, powerful, magic, elegant, seamless, robust, blazing, comprehensive | Marketing, not fact                            |
| Self-assessment   | clean, simple, nice, better, improved, optimal, smart                                | An author does not grade their own work        |
| Filler            | just, simply, easily, very, quite, highly, significantly, greatly                    | Carries no information                         |
| Meta-commentary   | this commit, this PR, in this change, we now                                         | The reader already knows what they are reading |
| Empty transitions | additionally, furthermore, moreover, it is worth noting                              | Padding                                        |

### No unmeasured claims

A performance, reliability or size claim carries a number, or it is dropped.

- Avoid: `perf(db): significantly improve query speed`
- Write: `perf(db): add index on orders.created_at`
- Body may then state: `p99 on /orders drops from 820ms to 45ms`

### Rewrites

| Avoid                                         | Write                                             |
| --------------------------------------------- | ------------------------------------------------- |
| `feat(cache): add powerful new caching layer` | `feat(cache): cache api responses with lru_cache` |
| `fix(auth): simply fix the login bug`         | `fix(auth): reject expired refresh tokens`        |
| `refactor(api): clean up messy handler code`  | `refactor(api): extract validation from handler`  |
| `docs(readme): improve the docs a bit`        | `docs(readme): document the setup flags`          |

### Also banned

Emoji, exclamation marks, first person (`I`, `we`), rhetorical questions,
and any sentence that describes the commit instead of the change.

### Reference conventions

These rules follow published conventions only: [Conventional
Commits](https://www.conventionalcommits.org), the Angular commit guidelines,
Google's `eng-practices` guidance on writing CL descriptions, the Go project's
CONTRIBUTING, and Chris Beams' seven rules. Where a repository's own convention
differs, the repository wins.

---

## Output

Always return exactly **two** commit messages.

### Commit 1

English. **This is the one that goes into Git.** Every commit in the repository
is English. The standard is single-language.

### Commit 2

Vietnamese, an accurate technical translation that preserves domain
terminology. It exists **only so the author can verify the English version says
what they meant**. Never commit it, never append it to commit 1, never put both
in the same message.

### Output format

- Each commit goes in its own code block.
- A code block contains the commit message and nothing else.
- No explanation inside a code block.
- Outside the code blocks, at most one short line in Vietnamese naming the
  affected module, and only when genuinely useful.

---

## Final rules

- All explanation outside the code blocks must be written in **Vietnamese**.
- Do not explain Conventional Commits theory.
- No AI-style commentary.
- No subjective recommendations.
- The repository's own convention always outranks these general rules.
- When unsure about `type` or `scope`, give a brief analysis in Vietnamese
  first, then choose the most probable option.
- Before returning the final result, self-check that the commit message is
  valid Conventional Commits, grammatically correct, scoped to the actual
  change, within the length limit, and consistent with the repository's
  existing convention.
