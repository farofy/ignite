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

The standard runs three branches, with `staging` as the default.

| Branch    | Role                                                                                      |
| --------- | ----------------------------------------------------------------------------------------- |
| `staging` | UAT, the closest to production. Feature PRs open here, releases go from here. The default |
| `develop` | Dev. Changes cherry-pick here from `staging`                                              |
| `main`    | Production. `staging` merges here                                                         |

A large application uses all three. A small tool or library may run on `main`
alone. Pick the model before rulesets, and protect only the branches that exist.

---

## 2. Rulesets

One ruleset per protected branch, created from the payload below. Every protected
branch enforces the same core:

- `deletion` and `non_fast_forward`: no branch deletion, no force-push.
- `pull_request`: one approval, dismiss stale reviews on push, require review
  thread resolution.
- `required_status_checks`: the new repo's own CI job names as the contexts.
- `staging` and `develop` add `required_linear_history`. `main` does not.
- No bypass actors.

Create one per branch with this payload, changing `name`, the ref, and the
check contexts:

```json
{
  "name": "main",
  "target": "branch",
  "enforcement": "active",
  "conditions": {
    "ref_name": { "include": ["refs/heads/main"], "exclude": [] }
  },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 1,
        "dismiss_stale_reviews_on_push": true,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": true
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": false,
        "required_status_checks": [{ "context": "verify (22)" }]
      }
    }
  ]
}
```

```bash
gh api repos/<org>/<repo>/rulesets -X POST --input ruleset-main.json
```

For `staging` and `develop`, add `{ "type": "required_linear_history" }` to
`rules`.

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
