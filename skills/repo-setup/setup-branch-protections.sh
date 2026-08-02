#!/usr/bin/env bash
# Stand up the branch-protection ruleset for a repository to the team standard.
# Blocks branch deletion and force-push, requires pull-request review and passing
# status checks on the protected branches. Idempotent: updates in place if the
# ruleset already exists. Needs gh authenticated with admin on the repo.
#
# Usage: setup-branch-protections.sh OWNER/REPO [options]
#   --branches a,b   Protected branches (default: main,staging)
#   --approvals N    Required approving reviews (default: 1)
#   --checks a,b,c   Required status check contexts (default: none)
#   --code-owner     Require review from code owners (default: off)
#   --name NAME      Ruleset name (default: protect-primary)

set -euo pipefail

[ $# -ge 1 ] || { echo "usage: setup-branch-protections.sh OWNER/REPO [options]" >&2; exit 1; }
repo=$1; shift
branches=main,staging; approvals=1; checks=; code_owner=false; name=protect-primary

while [ $# -gt 0 ]; do
  case $1 in
    --branches) branches=$2; shift 2 ;;
    --approvals) approvals=$2; shift 2 ;;
    --checks) checks=$2; shift 2 ;;
    --code-owner) code_owner=true; shift ;;
    --name) name=$2; shift 2 ;;
    *) echo "unknown option: $1" >&2; exit 1 ;;
  esac
done

body=$(branches=$branches approvals=$approvals checks=$checks code_owner=$code_owner name=$name \
  python3 - <<'PY'
import json, os
inc = [f"refs/heads/{b.strip()}" for b in os.environ["branches"].split(",") if b.strip()]
chk = [{"context": c.strip()} for c in os.environ["checks"].split(",") if c.strip()]
rules = [
    {"type": "deletion"},
    {"type": "non_fast_forward"},
    {"type": "pull_request", "parameters": {
        "required_approving_review_count": int(os.environ["approvals"]),
        "dismiss_stale_reviews_on_push": True,
        "require_code_owner_review": os.environ["code_owner"] == "true",
        "require_last_push_approval": False,
        "required_review_thread_resolution": False,
    }},
]
if chk:
    rules.append({"type": "required_status_checks", "parameters": {
        "strict_required_status_checks_policy": True,
        "required_status_checks": chk,
    }})
print(json.dumps({
    "name": os.environ["name"], "target": "branch", "enforcement": "active",
    "conditions": {"ref_name": {"include": inc, "exclude": []}},
    "rules": rules,
}))
PY
)

id=$(gh api "repos/$repo/rulesets" --jq ".[] | select(.name==\"$name\") | .id" 2>/dev/null | head -1)
if [ -n "$id" ]; then
  printf '%s' "$body" | gh api -X PUT "repos/$repo/rulesets/$id" --input - >/dev/null
  echo "updated ruleset $id ($name) on $repo"
else
  printf '%s' "$body" | gh api -X POST "repos/$repo/rulesets" --input - >/dev/null
  echo "created ruleset ($name) on $repo"
fi
echo "rules: deletion, non_fast_forward, pull_request(approvals=$approvals, code_owner=$code_owner), status_checks(${checks:-none})"
