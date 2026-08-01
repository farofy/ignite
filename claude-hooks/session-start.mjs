// ignite SessionStart hook. Installed to ~/.claude by setup.mjs, wired into
// settings.json. Two jobs: remind the model of the review skills, and keep the
// copied skills from going stale silently.
//
// Skills install as copies, so upstream or repo changes do not reach a machine
// until setup.mjs runs again. This hook warns when the installed copy is behind
// the repo, and starts a background re-sync at most once a week.
//
// ponytail: session-start triggered, not a daemon. A machine that never opens a
// session never refreshes, which is fine because it needs fresh skills only when
// a session starts.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { execSync, spawn } from "node:child_process";

process.stdout.write(
  "ignite review skills run at checkpoints, without being asked:\n" +
    "- Before a commit: comment-review on changed comments, code-style if format, lint, or imports changed.\n" +
    "- On a structural change or before a pull request: architecture-review.\n" +
    "- Commit message: commit-convention. Branch name or pull request: pr-convention.\n" +
    "They report findings and do not edit files on their own.\n",
);

const statePath = join(homedir(), ".claude", "ignite.json");
const DAY = 86400000;
const AUTO_UPDATE_DAYS = 7;
const NUDGE_DAYS = 14;
const daysSince = (iso) => (Date.now() - new Date(iso).getTime()) / DAY;

if (existsSync(statePath)) {
  try {
    const st = JSON.parse(readFileSync(statePath, "utf8"));
    const setup = join(st.repoDir, "setup.mjs");

    // Pulled the repo but did not re-run setup, so the copies are behind HEAD.
    let head = "";
    try {
      head = execSync('git -C "' + st.repoDir + '" rev-parse HEAD', {
        encoding: "utf8",
      }).trim();
    } catch (e) {}
    if (head && st.installedSha && head !== st.installedSha) {
      process.stdout.write(
        "\nignite: the repo moved since the last sync. Run: node " +
          setup +
          "\n",
      );
    } else if (st.installedAt && daysSince(st.installedAt) > NUDGE_DAYS) {
      process.stdout.write(
        "\nignite: last synced " +
          Math.floor(daysSince(st.installedAt)) +
          " days ago. Upstream skills may have moved. Consider: node " +
          setup +
          "\n",
      );
    }

    // Throttled background re-sync so upstream updates land without being asked.
    // --pull fast-forwards the clone first. --keep-extras makes it add-only, so
    // an offline run cannot move the installed skills aside and fail to restore.
    const last = st.lastAutoUpdate || st.installedAt;
    if (
      st.repoDir &&
      existsSync(setup) &&
      (!last || daysSince(last) > AUTO_UPDATE_DAYS)
    ) {
      st.lastAutoUpdate = new Date().toISOString();
      writeFileSync(statePath, JSON.stringify(st, null, 2) + "\n");
      spawn(process.execPath, [setup, "--pull", "--keep-extras"], {
        detached: true,
        stdio: "ignore",
      }).unref();
      process.stdout.write(
        "ignite: refreshing skills in the background. New skills apply next session.\n",
      );
    }
  } catch (e) {}
}
