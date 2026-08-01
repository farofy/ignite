// ignite review-usage log. Installed to ~/.claude by setup.mjs. Two roles:
// - PostToolUse on the Skill tool (payload on stdin): append the invoked skill to
//   the log, keyed by git root and HEAD, so a commit can tell which reviews ran
//   for the changes it is about to record.
// - node ignite-review-log.mjs --commit-check (called by the commit-msg git
//   hook): print which review skills ran for the pending commit. Never blocks.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { execSync } from "node:child_process";

const REVIEW_SKILLS = ["architecture-review", "code-style", "comment-review"];
const LOG = join(homedir(), ".claude", "ignite-reviews.json");

const git = (args, cwd) => {
  try {
    return execSync("git " + args, {
      cwd,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
  } catch (e) {
    return "";
  }
};
const load = () => {
  try {
    return JSON.parse(readFileSync(LOG, "utf8"));
  } catch (e) {
    return [];
  }
};

if (process.argv.includes("--commit-check")) {
  const cwd = process.cwd();
  const root = git("rev-parse --show-toplevel", cwd) || cwd;
  const head = git("rev-parse HEAD", cwd);
  const ran = new Set(
    load()
      .filter((e) => e.root === root && e.head === head)
      .map((e) => e.skill),
  );
  const did = REVIEW_SKILLS.filter((s) => ran.has(s));
  const missing = REVIEW_SKILLS.filter((s) => !ran.has(s));
  process.stdout.write("\nignite reviews for this commit:\n");
  process.stdout.write(
    "  ran: " + (did.length ? did.join(", ") : "none") + "\n",
  );
  if (missing.length)
    process.stdout.write(
      "  not run: " +
        missing.join(", ") +
        " (run them if the change needs them)\n",
    );
  process.exit(0);
}

let ev = {};
try {
  ev = JSON.parse(readFileSync(0, "utf8"));
} catch (e) {
  ev = {};
}
const name = ev.tool_input && (ev.tool_input.skill || ev.tool_input.name);
if (ev.tool_name === "Skill" && name) {
  const cwd = ev.cwd || process.cwd();
  const root = git("rev-parse --show-toplevel", cwd) || cwd;
  const head = git("rev-parse HEAD", cwd);
  const log = load();
  log.push({ root, head, skill: name, at: new Date().toISOString() });
  try {
    mkdirSync(dirname(LOG), { recursive: true });
    writeFileSync(LOG, JSON.stringify(log.slice(-500), null, 2) + "\n");
  } catch (e) {}
}
process.exit(0);
