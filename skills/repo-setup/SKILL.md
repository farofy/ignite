---
name: repo-setup
description: Stand up a new GitHub repository to the team standard. Covers the branch model, rulesets (branch protection), the label set, tag and release convention, and required scaffolding. Use when creating a new repository, setting up rulesets or branch protection, defining labels, or when the user says "new repo", "set up rulesets", "branch protection", "create labels", "tạo repo mới", "đặt ruleset", "tạo label".
---

# Repo setup

Bring a new GitHub repository to the team standard. This skill carries the
values, the branch model, the rulesets and the label set, so setup is
self-contained and needs no outside repo.

Detect the org and repo from the remote with `gh repo view`, or ask when neither
is set. Every step is a `gh` command, so the setup is repeatable and auditable.

---

## 1. Branch model

The branch model varies by project. Ask the user which branches the repository
runs before protecting anything. Do not assume.

| Branch    | Role                                                |
| --------- | --------------------------------------------------- |
| `main`    | Production                                          |
| `staging` | UAT, closest to production, where the PO signs off  |
| `develop` | Where dev and QC work, changes flow up to `staging` |

Common models:

- `main` only - a small tool or library.
- `main` + `staging` - staging is UAT before production.
- `main` + `staging` + `develop` - a large application: develop for dev and QC,
  staging for UAT and the PO, main for production.

Pick the model before rulesets, and protect only the branches that exist. Pass
the chosen branches to `setup-branch-protections.sh --branches`.

---

## 2. Rulesets

One ruleset covers the protected branches. Each enforces the same core:

- `deletion` and `non_fast_forward`: no branch deletion, no force-push.
- `pull_request`: one approval, dismiss stale reviews on push.
- `required_status_checks`: the repo's own CI job names as the contexts, strict.
- No bypass actors.

Run [`setup-branch-protections.sh`](setup-branch-protections.sh), which this
skill carries. It creates the ruleset, or updates it in place when it exists:

```bash
./setup-branch-protections.sh <org>/<repo> --checks <ctx1>,<ctx2>
```

Pass the CI contexts the repo's workflow reports. Omit `--checks` on a repo with
no CI yet, then re-run once the workflow has run and the context names are known.
The defaults protect `main` and `staging` with one approval. See `--help` in the
script header for `--branches`, `--approvals`, `--code-owner` and `--name`.

---

## 3. Labels

Create the set from [`labels.json`](labels.json), which this skill carries, so it
never depends on an outside repo:

```bash
jq -c '.[]' labels.json | while read -r l; do
  gh label create "$(jq -r .name <<<"$l")" \
    --color "$(jq -r .color <<<"$l")" \
    --description "$(jq -r .description <<<"$l")" \
    --repo <org>/<repo> --force
done
```

To go faster when a repo you own already carries the set, clone it instead:

```bash
gh label clone <org>/<a-repo-you-own> --repo <org>/<repo>
```

The set is namespaced by scope, the pattern Kubernetes, Angular and Rust use. It
drives two things beyond triage:

- `changelog: breaking`, `changelog: bugfix` and `changelog: feature` feed the
  release notes.
- `impact:`, `priority:` and `severity:` classify blast radius, urgency and
  defect weight.

The set is broad: beyond `changelog:` and `impact:` it has `size:`, `area:`,
`target:`, `priority:`, `severity:`, `status:`, `quality:` and `type:`. A PR
applies the ones that describe the change (see `pr-convention`). It skips `type:`,
which repeats the title.

Every namespace fits any project except `area:`, which names the project's own
components. The `area:` entries in `labels.json` are examples. Replace them with
the new project's areas.

---

## 4. Tags and releases

SemVer with a `v` prefix (`v0.1.0`). Tag on a release, then cut a GitHub release
whose notes group commits by change type, so the `changelog:` labels have
somewhere to land.

```bash
git tag -a v1.2.3 -m "release 1.2.3"
git push origin v1.2.3
gh release create v1.2.3 --notes-file notes.md
```

Write `notes.md` with one `## Changelog` heading, a subsection per type
(Features, Bug fixes, Documentation updates), and one line per commit:

```text
* <hash>: <subject> (#<pr>) (@<author>)
```

Reference each author as a bare `@handle`, not a `[@handle](url)` link. GitHub
collects bare mentions into an auto-generated Contributors avatar grid at the end
of the release. Links are not collected, and a hand-written `## Contributors`
section renders a second time next to the auto grid, so the release shows two
Contributors blocks. Use bare mentions and add no Contributors section.

Keep a `CHANGELOG.md` at the repo root in the same grouped format, newest
version on top. The GitHub release covers one version. The file accumulates every
version for readers browsing the source.

Build the version's entries at release, from the commits merged since the
previous tag, so every hash is real. A feature PR adds no changelog line, since
its squash hash does not exist until merge. Cut the release in its own PR that
writes the version section, then tag that merge commit.

Never delete a published tag or release once others may depend on it. Move the
changelog forward with a new version instead. Re-cutting a tag is safe only on a
fresh repository with no consumers.

---

## 5. Scaffolding and settings

A new repo carries these before the first feature:

- `README.md`, `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`
- `.github/`: a PR template, issue templates, and `workflows/` for CI
- `CODEOWNERS` when review routing matters
- The commit hook and the commit-lint CI, so the commit standard holds from the
  first commit

Settings:

- The default branch chosen in section 1.
- Delete head branches on merge.
- Merge methods the branch model needs. A branch with `required_linear_history`
  cannot take a merge commit.

---

## Reference conventions

- The label set lives in `labels.json`, so setup needs no outside repo.
- GitHub rulesets, the current form of branch protection.
- Scoped labels, as Kubernetes, Angular and Rust apply them.
