#!/usr/bin/env node
// Catch AI writing tells in documentation and code.
//
// Only prose is inspected. Fenced blocks and backtick spans are stripped, so a
// rule that quotes a banned character inside backticks does not flag itself.
//
// Run: node scripts/check-diction.mjs

import { readdirSync, statSync, readFileSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const EXTS = new Set([".md", ".mjs", ".yml", ".sh", ".py"]);
const EXTRA = new Set(["git-hooks/commit-msg"]);

// Build patterns from code points so this file holds none of the characters it
// bans, and cannot trip its own rules.
const charRe = (cp) => new RegExp(String.fromCodePoint(cp));

// Unicode punctuation: wrong everywhere, including inside code.
const PUNCT = [
  ["em-dash", charRe(0x2014), "Split into two sentences, or use a colon."],
  ["en-dash", charRe(0x2013), "Use an ASCII hyphen."],
  ["ellipsis", charRe(0x2026), "Use three ASCII dots, or drop it."],
];

// Prose only (.md). In code, a semicolon is syntax.
const PROSE = [
  ["semicolon", /[a-z]; [a-z]/, "Split into two sentences."],
  ["not-only", /\bnot (only|just)\b/i, "State the point directly."],
];

// Arrows belong in tables, lists and CLI output. Not in prose.
const ARROW = charRe(0x2192);

const blank = (m) => m.replace(/[^\n]/g, " ");

function stripCode(text) {
  text = text.replace(/```[\s\S]*?```/g, blank);
  text = text.replace(/`[^`\n]*`/g, blank);
  return text;
}

function isStructural(line) {
  const s = line.trim();
  return (
    s.startsWith("|") ||
    s.startsWith("- ") ||
    s.startsWith("* ") ||
    s.startsWith("#") ||
    /^\d+\.\s/.test(s)
  );
}

function* files(dir = ROOT, base = "") {
  for (const name of readdirSync(dir).sort()) {
    if (name === ".git" || name === "node_modules") continue;
    const abs = join(dir, name);
    const rel = base ? `${base}/${name}` : name;
    // Vendored third-party reference skills are not team-authored, so the prose
    // rules do not apply. Source: ciembor/agent-rules-books (MIT).
    if (rel.startsWith("skills/vendor/")) continue;
    const st = statSync(abs);
    if (st.isDirectory()) {
      yield* files(abs, rel);
    } else if (st.isFile() && (EXTS.has(extname(abs)) || EXTRA.has(rel))) {
      yield [abs, rel];
    }
  }
}

let hits = 0;
for (const [path, rel] of files()) {
  const prose = stripCode(readFileSync(path, "utf8"));
  const isMd = extname(path) === ".md";
  const rules = isMd ? PUNCT.concat(PROSE) : PUNCT;
  const lines = prose.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const [name, pat, fix] of rules) {
      if (pat.test(line)) {
        console.log(`${rel}:${i + 1}: ${name} -- ${fix}`);
        hits++;
      }
    }
    if (isMd && ARROW.test(line) && !isStructural(line)) {
      console.log(
        `${rel}:${i + 1}: arrow-in-prose -- Use only in tables, lists and CLI output.`,
      );
      hits++;
    }
  }
}

console.log();
if (hits) {
  console.log(`${hits} issues to fix`);
  process.exit(1);
}
console.log("No issues");
