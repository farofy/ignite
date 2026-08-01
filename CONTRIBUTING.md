# Contributing

Thanks for taking the time to contribute. This guide covers the workflow, the
commit format and what the automated checks expect.

## Before you start

- Search existing issues and pull requests first.
- Keep a change focused on one concern.
- Update the documentation when behaviour or configuration changes.
- Prefer small pull requests.

## Branches

This repository has a single long-lived branch, `main`. Fork the repository,
branch from `main`, and open a pull request back to `main`.

Branches follow `<prefix>/<issue>`. Conventional Commits says nothing about
branch names, so this is a convention of this repository rather than a rule from
the specification. Prefixes spell the word out where the commit type is
abbreviated, so a `fix` commit lands on a `bugfix/` branch. `<issue>` is the
GitHub issue number, which serves as the ticket id here.

| Prefix      | Commit type | Use case                                 |
| ----------- | ----------- | ---------------------------------------- |
| `feature/`  | `feat`      | New capability                           |
| `bugfix/`   | `fix`       | Bug fix                                  |
| `docs/`     | `docs`      | Documentation only                       |
| `refactor/` | `refactor`  | Internal change with no behaviour change |
| `perf/`     | `perf`      | Performance improvement                  |
| `test/`     | `test`      | Test addition or fix                     |
| `ci/`       | `ci`        | Workflow or automation change            |
| `build/`    | `build`     | Build or dependency change               |
| `chore/`    | `chore`     | Maintenance                              |

Example: `bugfix/42` for a branch resolving issue 42.

Open an issue before starting if none exists. It gives the branch its number and
the change a place to be discussed.

## Commit messages

Commits follow [Conventional Commits](https://www.conventionalcommits.org) with
three additional rules that `git-hooks/commit-msg` enforces:

```text
<type>(<scope>): <description>
```

1. **Scope is required.** The specification treats it as optional, this
   repository does not. For a change spanning the repository, use a broad but
   real scope such as `repo` or `setup`.
2. **The description is entirely lowercase**, including product names and
   acronyms. Write `install github cli`, never `install GitHub CLI`.
3. **The whole subject stays within 72 characters.**

Valid types: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `build`, `ci`,
`chore`, `infra`, `revert`.

Append `!` after the type for a breaking change, for example `feat(api)!:`.

Trailers go in the last paragraph, using standard git capitalisation:

```text
Refs: #123
Reviewed-by: Name
Co-authored-by: Name <email>
```

Examples:

```text
feat(hooks): reject uppercase commit subjects
fix(setup): scope skill install to claude code
docs(readme): document the dry-run mode
```

## Writing style

The same rules apply to code, comments, documentation, commit messages, pull
requests, error strings and log lines. `scripts/check-diction.mjs` enforces them.

- No praise or self-assessment: `awesome`, `powerful`, `seamless`, `clean`,
  `simple`, `better`, `optimal`.
- No filler: `just`, `simply`, `easily`, `very`, `significantly`, `greatly`.
- No self-reference such as `this commit` or `this PR`.
- A performance or reliability claim carries a number, or it is dropped.
- Short sentences ending in a period. No em dash or semicolon joining clauses.
- ASCII punctuation only. CLI status glyphs are the one exception, because they
  carry information rather than decoration.

## Running the checks locally

Run these before opening a pull request. CI runs the first two and adds format
and commit-range checks:

```bash
sh git-hooks/test-commit-msg.sh     # 21 cases covering the commit hook
node scripts/check-diction.mjs
node --check setup.mjs
```

`scripts/check-mirrors.mjs` compares English files against translations under
`docs/vi/`. That directory is a local reading aid and is not published, so the
script exits quietly when it is absent.

## Pull requests

Fill in the template. Every section has a purpose:

- **Description** states what changed and why.
- **Changes** lists the change per file, never the path alone.
- **Testing** holds real command output. Never tick a check that was not run.
  Use `N/A` only when the change cannot affect runtime, such as documentation.

Before requesting review:

1. Rebase onto the latest `main`.
2. Confirm the three checks above pass.
3. Update the documentation for user-facing changes.

## Review

- At least one maintainer approval is required before merge.
- Address review comments, or explain why a change is not needed.
- Squash merge is the default. Because the pull request title becomes the
  squash subject only when the pull request holds a single commit, prefer one
  commit per pull request. Otherwise the person merging must replace the
  pre-filled subject with a valid Conventional Commit.

## Reporting problems

Use GitHub issues for bugs and feature requests, with enough detail to
reproduce. For security reports, follow [SECURITY.md](SECURITY.md).
