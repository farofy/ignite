#!/usr/bin/env node
// Shared team bootstrap. Brings every machine to the same Claude Code toolset.
// Runs on Windows, Linux and macOS.
//
//   node setup.mjs               # sync (clear old skills, reinstall all bundles)
//   node setup.mjs --keep-extras # do not clear, only add, keep existing skills
//   node setup.mjs --dry-run     # print what would happen, change nothing
//   node setup.mjs --no-desktop  # skip the desktop control MCP (on by default)
//   node setup.mjs --pull        # fast-forward the clone, then sync (auto-refresh uses this)
//
// The standard skill set comes from four sources:
//   * Leonxlnx/taste-skill       (interface design)
//   * mattpocock/skills          (engineering: tdd, code-review, diagnosing-bugs)
//   * greensock/gsap-skills      (gsap animation: timeline, scrolltrigger, plugins)
//   * bradautomates/claude-video (video: /watch downloads, frames, transcript)
//
// Clearing never deletes. It moves the old skill directory to .backup-<timestamp>
// so the change is reversible. Idempotent: running it again is safe.

import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  copyFileSync,
  writeFileSync,
  readFileSync,
  renameSync,
  readdirSync,
  cpSync,
  chmodSync,
} from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const IS_WIN = process.platform === "win32";
const ARGV = process.argv.slice(2);
const DRY = ARGV.includes("--dry-run");
const PRUNE = !ARGV.includes("--keep-extras");
const HOME = homedir();
const ok = [],
  skip = [],
  fail = [];
const stamp = new Date().toISOString().replace(/[:.]/g, "-");

function run(label, cmd, { tolerate = false } = {}) {
  process.stdout.write(`\n▶ ${label}\n  $ ${cmd}\n`);
  if (DRY) {
    skip.push(`${label} (dry-run)`);
    return;
  }
  try {
    execSync(cmd, { stdio: "inherit", shell: true });
    ok.push(label);
  } catch (e) {
    if (tolerate) {
      skip.push(label);
      process.stdout.write(`  (skipped, probably already installed)\n`);
    } else {
      fail.push(label);
      process.stdout.write(`  ✗ error: ${e.message}\n`);
    }
  }
}
function backupDir(dir) {
  if (!existsSync(dir)) return null;
  const bak = `${dir}.backup-${stamp}`;
  process.stdout.write(`\n▶ Backing up (moving) ${dir}\n  -> ${bak}\n`);
  if (DRY) {
    skip.push(`backup ${dir} (dry-run)`);
    return bak;
  }
  try {
    renameSync(dir, bak);
    ok.push(`Backed up ${dir}`);
    return bak;
  } catch (e) {
    fail.push(`Backup ${dir}`);
    process.stdout.write(`  ✗ ${e.message}\n`);
    return null;
  }
}

// 0. Preconditions
if (Number(process.versions.node.split(".")[0]) < 22) {
  console.error(
    `\n✗ Node.js >= 22 required (found ${process.versions.node}). Upgrade and rerun.`,
  );
  process.exit(1);
}
try {
  execSync("claude --version", { stdio: "ignore", shell: true });
} catch {
  console.error(
    "\n✗ Claude Code CLI (`claude`) not found. Install it and rerun.",
  );
  process.exit(1);
}
console.log(`\n✓ Node ${process.versions.node}, Claude Code CLI found.`);
console.log(
  DRY
    ? "DRY-RUN. Nothing will change."
    : PRUNE
      ? "SYNC mode (clear old skills, reinstall)."
      : "ADD-ONLY mode (keep existing skills).",
);

// 0b. GitHub CLI (gh). pr-convention needs it to read labels and open PRs
const hasCmd = (c) => {
  try {
    execSync(IS_WIN ? `where ${c}` : `command -v ${c}`, {
      stdio: "ignore",
      shell: true,
    });
    return true;
  } catch {
    return false;
  }
};
if (hasCmd("gh")) {
  skip.push("gh CLI (already present)");
} else if (DRY) {
  console.log("\n▶ (dry-run) Would install GitHub CLI (gh)");
  skip.push("gh CLI (dry-run)");
} else {
  // Only package managers that do not need sudo. Linux is left to the user.
  const pm = IS_WIN
    ? {
        need: "winget",
        cmd: "winget install --id GitHub.cli -e --silent --accept-package-agreements --accept-source-agreements",
      }
    : process.platform === "darwin"
      ? { need: "brew", cmd: "brew install gh" }
      : null;
  if (pm && hasCmd(pm.need)) {
    run("Install GitHub CLI (gh)", pm.cmd, { tolerate: true });
  } else {
    console.log(
      "\n▶ ⚠ gh CLI missing and cannot be installed here. Install it, then rerun:",
    );
    console.log("    macOS  : brew install gh");
    console.log("    Windows: winget install --id GitHub.cli");
    console.log(
      "    Linux  : https://github.com/cli/cli/blob/trunk/docs/install_linux.md",
    );
    skip.push("gh CLI (install it manually)");
  }
}
// Signing in is interactive and personal. Remind, never run it.
if (!DRY && hasCmd("gh")) {
  try {
    execSync("gh auth status", { stdio: "ignore", shell: true });
  } catch {
    console.log("\n▶ ⚠ gh is not signed in. Run: gh auth login");
  }
}

// 0c. Self-update, only for the automated background refresh (--pull).
// Fast-forward only, and only with a clean tree on a tracked branch, so an
// automated pull cannot create a merge commit or discard local work. Runs before
// the sync below, so section 1b copies the freshly pulled skills.
if (ARGV.includes("--pull") && !DRY) {
  const at = (c) =>
    execSync(`git -C "${HERE}" ${c}`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
  let dirty = null,
    upstream = "";
  try {
    dirty = at("status --porcelain");
  } catch (e) {
    dirty = null;
  }
  try {
    upstream = at('rev-parse --abbrev-ref --symbolic-full-name "@{u}"');
  } catch (e) {
    upstream = "";
  }
  if (dirty === null) {
    console.log("\n▶ Skipping --pull: not a git clone.");
    skip.push("git pull (not a clone)");
  } else if (dirty) {
    console.log("\n▶ Skipping --pull: the working tree has local changes.");
    skip.push("git pull (dirty tree)");
  } else if (!upstream) {
    console.log("\n▶ Skipping --pull: no upstream branch.");
    skip.push("git pull (no upstream)");
  } else
    run("Fast-forward the ignite clone", `git -C "${HERE}" pull --ff-only`, {
      tolerate: true,
    });
}

// 1. Sync skills: back up, clear, then reinstall all bundles
if (PRUNE) {
  backupDir(join(HOME, ".claude", "skills")); // where Claude Code reads skills
  backupDir(join(HOME, ".agents", "skills")); // where the `skills` CLI keeps originals
}
// --agent claude-code installs for Claude Code alone. It avoids the "Failed"
// banner from agents such as PromptScript and keeps files out of ~/.junie and ~/.cursor.
run(
  "Install the DESIGN skills (Leonxlnx/taste-skill)",
  "npx -y skills add Leonxlnx/taste-skill --global --copy --agent claude-code -y",
);
run(
  "Install the ENGINEERING skills (mattpocock/skills)",
  "npx -y skills add mattpocock/skills --global --copy --agent claude-code -y",
);
run(
  "Install the ANIMATION skills (greensock/gsap-skills)",
  "npx -y skills add greensock/gsap-skills --global --copy --agent claude-code -y",
);
run(
  "Install the VIDEO skill (bradautomates/claude-video)",
  "npx -y skills add bradautomates/claude-video --global --copy --agent claude-code -y",
);

// 1a. The /watch skill needs ffmpeg and yt-dlp. Warn only, since installing them
// may need sudo, and leave the install to the user.
for (const dep of ["ffmpeg", "yt-dlp"]) {
  if (hasCmd(dep)) skip.push(`${dep} (already present)`);
  else
    console.log(
      `\n▶ ⚠ ${dep} missing. The /watch skill needs it. Install it, then rerun.`,
    );
}

// 1b. This repository's own skills (the skills/ directory)
// Runs AFTER the bundles so the clearing step cannot remove them.
// Skills are grouped into subdirectories (review/, convention/, vendor/).
// Claude Code reads skills one level deep, so copy each leaf skill directory
// (one holding a SKILL.md) flat into the destination, dropping the group level.
const teamSkills = join(HERE, "skills");
function skillDirs(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const abs = join(dir, e.name);
    if (existsSync(join(abs, "SKILL.md"))) out.push([e.name, abs]);
    else out.push(...skillDirs(abs));
  }
  return out;
}
if (existsSync(teamSkills)) {
  const found = skillDirs(teamSkills);
  const names = found.map(([n]) => n);
  if (DRY) {
    console.log(
      `\n▶ (dry-run) Would copy ${names.length} repo skills: ${names.join(", ")}`,
    );
    skip.push("Repo skills (dry-run)");
  } else
    try {
      const dest = join(HOME, ".claude", "skills");
      mkdirSync(dest, { recursive: true });
      for (const [n, abs] of found)
        cpSync(abs, join(dest, n), { recursive: true });
      ok.push(`Copied ${names.length} repo skills (${names.join(", ")})`);
      console.log(`\n▶ Repo skills -> ${dest}: ${names.join(", ")}`);
    } catch (e) {
      fail.push("Repo skills");
      console.log(`  ✗ ${e.message}`);
    }
}

// 1c. Git hook rejecting bad commits, global through core.hooksPath
const hookSrc = join(HERE, "git-hooks");
if (existsSync(hookSrc)) {
  const hookDest = join(HOME, ".claude", "git-hooks");
  let current = "";
  try {
    current = execSync("git config --global core.hooksPath", { shell: true })
      .toString()
      .trim();
  } catch {
    /* not set */
  }
  if (current && current !== hookDest) {
    console.log(
      `\n▶ ⚠ core.hooksPath already points at ${current}\n  Not overwriting. Point it at ${hookDest} to use the ignite hook.`,
    );
    skip.push(`Git hook (core.hooksPath is set to ${current})`);
  } else if (DRY) {
    console.log(
      `\n▶ (dry-run) Would install the hook to ${hookDest} and set core.hooksPath`,
    );
    skip.push("Git hook (dry-run)");
  } else
    try {
      mkdirSync(hookDest, { recursive: true });
      for (const h of readdirSync(hookSrc)) {
        const dst = join(hookDest, h);
        copyFileSync(join(hookSrc, h), dst);
        chmodSync(dst, 0o755);
      }
      execSync(`git config --global core.hooksPath "${hookDest}"`, {
        stdio: "ignore",
        shell: true,
      });
      ok.push("Git hook rejecting bad commits");
      console.log(`\n▶ Git hook -> ${hookDest} (core.hooksPath set)`);
    } catch (e) {
      fail.push("Git hook");
      console.log(`  ✗ ${e.message}`);
    }
}

// 2. The ponytail plugin (code trimming)
run(
  "Add the ponytail marketplace",
  "claude plugin marketplace add DietrichGebert/ponytail",
  { tolerate: true },
);
run("Install the ponytail plugin", "claude plugin install ponytail@ponytail", {
  tolerate: true,
});

// 3. MCP chrome-devtools
run(
  "Remove any existing chrome-devtools entry",
  "claude mcp remove chrome-devtools -s user",
  { tolerate: true },
);
run(
  "Add the chrome-devtools MCP",
  "claude mcp add chrome-devtools -s user -- npx chrome-devtools-mcp@latest --isolated=true",
);

// 3c. Desktop control MCP, installed by default
// Full mouse, keyboard and screen control of the machine. On by default. It
// reaches the whole desktop, so skip it with --no-desktop. Each platform needs
// its own server. Prerequisites are checked, never installed with sudo.
if (!ARGV.includes("--no-desktop")) {
  // Windows and macOS run their server through uvx, so uv is the shared prereq.
  // uv lands outside this process PATH, so a new shell is needed to see it.
  // One rerun then finishes.
  const ensureUv = () => {
    if (hasCmd("uv")) return true;
    run(
      "Install uv (the desktop MCP needs it)",
      IS_WIN
        ? 'powershell -ExecutionPolicy Bypass -c "irm https://astral.sh/uv/install.ps1 | iex"'
        : "curl -LsSf https://astral.sh/uv/install.sh | sh",
      { tolerate: true },
    );
    return hasCmd("uv");
  };
  const rerunNote = (os) => {
    console.log(
      "\n▶ uv installed but not yet on PATH. Open a new shell, then rerun setup.",
    );
    skip.push(`${os} desktop MCP (rerun in a new shell)`);
  };

  if (IS_WIN) {
    // Windows-MCP (CursorTouch) drives apps by UI element name, not coordinates.
    if (ensureUv()) {
      run(
        "Remove any existing windows-mcp entry",
        "claude mcp remove windows-mcp -s user",
        { tolerate: true },
      );
      run(
        "Add the Windows desktop MCP (CursorTouch/Windows-MCP)",
        "claude mcp add windows-mcp -s user -- uvx windows-mcp serve",
      );
    } else rerunNote("Windows");
  } else if (process.platform === "darwin") {
    // MacOS-MCP (CursorTouch). Needs Accessibility and Screen Recording grants.
    if (ensureUv()) {
      run(
        "Remove any existing macos-mcp entry",
        "claude mcp remove macos-mcp -s user",
        { tolerate: true },
      );
      run(
        "Add the macOS desktop MCP (CursorTouch/MacOS-MCP)",
        "claude mcp add macos-mcp -s user -- uvx macos-mcp",
      );
      console.log(
        "\n▶ macOS needs Accessibility and Screen Recording permission. Grant both to your terminal in System Settings > Privacy and Security.",
      );
    } else rerunNote("macOS");
  } else {
    // computer-use-linux (agent-sh). The npm install is user level. Its system
    // packages and one-time setup need root, so they are left to the user.
    run(
      "Install the Linux desktop MCP (agent-sh/computer-use-linux)",
      "npm install -g @agent-sh/computer-use-linux",
      { tolerate: true },
    );
    if (hasCmd("computer-use-linux")) {
      run(
        "Remove any existing computer-use-linux entry",
        "claude mcp remove computer-use-linux -s user",
        { tolerate: true },
      );
      run(
        "Add the Linux desktop MCP",
        "claude mcp add computer-use-linux -s user -- computer-use-linux mcp",
      );
    }
    console.log(
      "\n▶ Linux needs system packages and a one-time setup, both root level. Run yourself:",
    );
    console.log(
      "    sudo apt install ydotool at-spi2-core   # or your distro equivalent",
    );
    console.log(
      "    computer-use-linux setup                # enable AT-SPI and ydotoold",
    );
    console.log(
      "    computer-use-linux doctor               # check readiness",
    );
    skip.push("Linux desktop MCP system setup (run it yourself)");
  }
}

// 4. Ponytail defaults to lite
const ponyDir = IS_WIN
  ? join(process.env.APPDATA || join(HOME, "AppData", "Roaming"), "ponytail")
  : join(HOME, ".config", "ponytail");
if (DRY) {
  console.log(
    `\n▶ (dry-run) Would write lite to ${join(ponyDir, "config.json")}`,
  );
  skip.push("ponytail lite (dry-run)");
} else
  try {
    mkdirSync(ponyDir, { recursive: true });
    writeFileSync(
      join(ponyDir, "config.json"),
      JSON.stringify({ defaultMode: "lite" }, null, 2) + "\n",
    );
    ok.push("Ponytail defaultMode = lite");
    console.log(`\n▶ Ponytail lite -> ${join(ponyDir, "config.json")}`);
  } catch (e) {
    fail.push("Ponytail config");
    console.log(`  ✗ ${e.message}`);
  }

// 5. Shared CLAUDE.md, always overwriting
// The shared file is the standard, so a rerun must bring every machine back to
// it. Any existing file is copied aside first, since it may hold personal notes.
const claudeDir = join(HOME, ".claude");
const target = join(claudeDir, "CLAUDE.md");
const srcMd = join(HERE, "CLAUDE.md");
if (DRY) {
  console.log(
    `\n▶ (dry-run) Would overwrite ${target}, backing up any existing file`,
  );
  skip.push("CLAUDE.md (dry-run)");
} else
  try {
    mkdirSync(claudeDir, { recursive: true });
    if (existsSync(target)) {
      const bak = join(claudeDir, `CLAUDE.md.backup-${stamp}`);
      copyFileSync(target, bak);
      console.log(`\n▶ Existing CLAUDE.md backed up to ${bak}`);
    }
    copyFileSync(srcMd, target);
    ok.push("Installed the shared CLAUDE.md");
    console.log(`\n▶ Installed ${target}`);
  } catch (e) {
    fail.push("CLAUDE.md");
    console.log(`  ✗ ${e.message}`);
  }

// 6. Claude Code hooks: session reminder, staleness check, review-usage log
// Skills are copied at install time, so upstream or repo changes do not reach a
// machine until setup runs again. The SessionStart hook prints the review-skill
// checkpoints, warns when the install is behind the repo, and re-syncs weekly in
// the background. The PostToolUse hook records each review skill the model runs,
// so the commit-msg hook can report which ran. State and log live beside them.
const settingsPath = join(claudeDir, "settings.json");
const hookDst = join(claudeDir, "ignite-hook.mjs");
const reviewLogDst = join(claudeDir, "ignite-review-log.mjs");
const statePath = join(claudeDir, "ignite.json");
let installedSha = "";
try {
  installedSha = execSync(`git -C "${HERE}" rev-parse HEAD`, {
    encoding: "utf8",
  }).trim();
} catch (e) {}
if (DRY) {
  console.log(
    `\n▶ (dry-run) Would install the Claude Code hooks and write ${statePath}`,
  );
  skip.push("Claude Code hooks (dry-run)");
} else
  try {
    copyFileSync(join(HERE, "claude-hooks", "session-start.mjs"), hookDst);
    copyFileSync(join(HERE, "claude-hooks", "review-log.mjs"), reviewLogDst);
    writeFileSync(
      statePath,
      JSON.stringify(
        { repoDir: HERE, installedSha, installedAt: new Date().toISOString() },
        null,
        2,
      ) + "\n",
    );
    const settings = existsSync(settingsPath)
      ? JSON.parse(readFileSync(settingsPath, "utf8"))
      : {};
    settings.hooks = settings.hooks || {};
    // Replace only our own entries, leaving any other hooks untouched.
    const addHook = (event, entry) => {
      const arr = Array.isArray(settings.hooks[event])
        ? settings.hooks[event]
        : [];
      const kept = arr.filter(
        (group) => !JSON.stringify(group).includes("ignite-"),
      );
      kept.push(entry);
      settings.hooks[event] = kept;
    };
    addHook("SessionStart", {
      hooks: [{ type: "command", command: `node "${hookDst}"` }],
    });
    addHook("PostToolUse", {
      matcher: "Skill",
      hooks: [{ type: "command", command: `node "${reviewLogDst}"` }],
    });
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
    ok.push("Claude Code hooks (reminder, update check, review log)");
    console.log(`\n▶ Installed the Claude Code hooks in ${settingsPath}`);
  } catch (e) {
    fail.push("Claude Code hooks");
    console.log(`  ✗ ${e.message}`);
  }

// Summary
console.log("\n" + "-".repeat(40));
console.log(
  `✓ Done: ${ok.length}   ⏭  Skipped: ${skip.length}   ✗ Failed: ${fail.length}`,
);
if (ok.length) console.log("\nCompleted:\n  - " + ok.join("\n  - "));
if (skip.length) console.log("\nSkipped:\n  - " + skip.join("\n  - "));
if (fail.length)
  console.log("\n⚠ Failed (see the log above):\n  - " + fail.join("\n  - "));
if (PRUNE && !DRY)
  console.log(
    "\nNote: old skills were MOVED to *.backup-* directories. Delete them once satisfied.",
  );
console.log(
  "\nOpen a NEW Claude Code session to apply this. Check with `claude plugin list`, `claude mcp list`, then type /tdd and /design-taste-frontend",
);
process.exit(fail.length ? 1 : 0);
