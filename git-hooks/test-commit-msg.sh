#!/bin/sh
# Self-test for git-hooks/commit-msg. Run: sh git-hooks/test-commit-msg.sh
# CI runs this so a broken hook cannot land unnoticed.

HOOK="$(dirname "$0")/commit-msg"
TMP=$(mktemp)
PASS=0
FAIL=0

check() { # $1 = pass|block  $2 = label  $3 = message
  printf '%s\n' "$3" > "$TMP"
  if sh "$HOOK" "$TMP" >/dev/null 2>&1; then got=pass; else got=block; fi
  if [ "$got" = "$1" ]; then
    PASS=$((PASS + 1))
    printf '  ok    %-42s [%s]\n' "$2" "$got"
  else
    FAIL=$((FAIL + 1))
    printf '  FAIL  %-42s [got %s, want %s]\n' "$2" "$got" "$1"
  fi
}

# Build subjects of exactly 72 and 73 characters, all lowercase.
P='feat(skills): '
LEN72="$P$(printf 'a%.0s' $(seq 1 $((72 - ${#P}))))"
LEN73="$P$(printf 'a%.0s' $(seq 1 $((73 - ${#P}))))"

echo "Valid:"
check pass  "scope present, lowercase" "feat(setup): add cross-platform bootstrap"
check pass  "breaking change"          "feat(api)!: drop legacy endpoint"
check pass  "scope with a hyphen"      "refactor(commit-convention): clarify rules"
check pass  "over 50, warns not blocks" "feat(setup): add the cross-platform desktop control bootstrap"
check pass  "exactly 72 characters"    "$LEN72"

echo "Skipped (not ordinary commits):"
check pass  "merge"                     "Merge branch 'feature/x' into main"
check pass  "revert"                    "Revert \"feat(a): b\""
check pass  "fixup"                     "fixup! feat(a): b"
check pass  "squash"                    "squash! feat(a): b"

echo "Must be rejected:"
check block "no type"                  "update stuff"
check block "invalid type"             "feature: add x"
check block "missing scope"            "feat: add something"
check block "no space after the colon" "feat(setup):missing space"
check block "uppercase in description" "feat(setup): add GitHub CLI"
check block "capitalised first word"   "feat(setup): Add something"
check block "73 characters"            "$LEN73"
check block "uppercase scope"          "feat(Setup): add something"
check block "empty description"        "feat(setup): "

echo "Footer (co-author trailer capitalisation):"
CA_OK="$(printf 'feat(setup): add x\n\nCo-authored-by: Ann <ann@example.com>')"
CA_TITLE="$(printf 'feat(setup): add x\n\nCo-Authored-By: Ann <ann@example.com>')"
CA_LOWER="$(printf 'feat(setup): add x\n\nco-authored-by: Ann <ann@example.com>')"
check pass  "co-author trailer, correct"       "$CA_OK"
check block "co-author trailer, title case"    "$CA_TITLE"
check block "co-author trailer, lowercase"     "$CA_LOWER"

rm -f "$TMP"
echo
echo "Result: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
