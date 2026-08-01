#!/usr/bin/env node
// Compare every English file with its translation under docs/vi/.
//
// docs/vi/ is a local reading copy that is not published, so this script exits
// quietly when the directory is absent.
//
// Prose is never compared, since the two languages differ by design. What is
// compared is everything that must not change with language:
//
//   documents  backtick tokens and heading counts
//   code       the executable text, with comments and string literals removed
//
// The code rule matters most. A translation may reword any comment or message,
// but if the logic differs the two files would behave differently while looking
// equivalent, so that fails the build.
//
// Run: node scripts/check-mirrors.mjs

import { readdirSync, statSync, readFileSync, existsSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const VI = join(ROOT, "docs", "vi");

const DOC_SUFFIX = new Set([".md"]);
// Letters that only Vietnamese uses. A translation must hold at least one.
const VIETNAMESE =
  /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵĂÂĐÊÔƠƯÀÁẢÃẠẰẮẲẴẶẦẤẨẪẬÈÉẺẼẸỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌỒỐỔỖỘỜỚỞỠỢÙÚỦŨỤỪỨỬỮỰỲÝỶỸỴ]/u;
const SKIP = new Set([
  "LICENSE",
  "package.json",
  ".gitignore",
  "yarn.lock",
  "package-lock.json",
  "pnpm-lock.yaml",
  ".editorconfig",
  ".gitattributes",
  ".pre-commit-config.yaml",
  ".git-blame-ignore-revs",
  "skills/repo-setup/labels.json",
]);

const splitlines = (t) => {
  const a = t.split(/\r\n|\r|\n/);
  if (a.length && a[a.length - 1] === "") a.pop();
  return a;
};

// Every published file that is expected to carry a translation.
function sources() {
  const out = execSync("git ls-files", { cwd: ROOT, encoding: "utf8" })
    .split(/\s+/)
    .filter(Boolean);
  return out
    .sort()
    .filter((rel) => !SKIP.has(rel) && !rel.startsWith("docs/vi/"));
}

// Every file under docs/vi/ paired with the source file it mirrors.
function pairs() {
  const out = [];
  const walk = (dir, base) => {
    for (const name of readdirSync(dir).sort()) {
      const abs = join(dir, name);
      const rel = base ? `${base}/${name}` : name;
      const st = statSync(abs);
      if (st.isDirectory()) walk(abs, rel);
      else if (st.isFile()) out.push([join(ROOT, rel), abs, rel]);
    }
  };
  walk(VI, "");
  return out;
}

// Drop the leading blockquote, which is the translation banner.
const stripBanner = (text) =>
  splitlines(text)
    .filter((ln) => !ln.startsWith(">"))
    .join("\n");

// Backtick tokens, ignoring fenced code blocks.
function docTokens(text) {
  text = text.replace(/```[\s\S]*?```/g, "");
  return [...text.matchAll(/`([^`\n]+)`/g)].map((m) => m[1]).sort();
}

const docHeadings = (text) =>
  splitlines(text)
    .filter((ln) => ln.startsWith("#"))
    .map((ln) => ln.split(" ")[0]);

// Keys whose values are prose meant for a human reader. Inside an issue form a
// translated label is expected, so comparing those values would always fail.
const PROSE_KEYS = new Set([
  "name",
  "description",
  "label",
  "placeholder",
  "about",
  "title",
]);

// An issue form reduced to its field structure, with prose values dropped.
function formSkeleton(text) {
  const out = [];
  for (let line of splitlines(text)) {
    const stripped = line.replace(/^[- ]+/, "").trim();
    if (stripped.startsWith("#") || !stripped) continue;
    const key = stripped.split(":")[0].trim();
    if (PROSE_KEYS.has(key) && stripped.includes(":")) {
      line = line.split(":")[0] + ":";
    }
    out.push(line);
  }
  return out.join("\n").replace(/\s+/g, " ").trim();
}

// The executable text, with comments and string literals blanked out.
function codeSkeleton(text, suffix) {
  if (suffix === ".py") {
    text = text.replace(/"""[\s\S]*?"""/g, '""');
    text = text.replace(/#[^\n]*/g, "");
  } else if (suffix === ".mjs" || suffix === ".js") {
    text = text.replace(/\/\*[\s\S]*?\*\//g, "");
    text = text.replace(/\/\/[^\n]*/g, "");
  } else {
    text = text.replace(/(^|\s)#[^\n]*/gm, " ");
  }

  text = text.replace(/"(?:[^"\\\n]|\\.)*"/g, '""');
  text = text.replace(/'(?:[^'\\\n]|\\.)*'/g, '""');
  text = text.replace(/`(?:[^`\\]|\\.)*`/g, '""');

  // Compare logic tokens only. A formatter runs on the English side alone, so
  // whitespace, quote style and trailing commas must never count as a diff.
  text = text.replace(/\s+/g, "");
  return text.replace(/,([)\]}])/g, "$1");
}

if (!existsSync(VI) || !statSync(VI).isDirectory()) {
  console.log("No docs/vi directory, so there is nothing to compare.");
  process.exit(0);
}

let failed = 0;
let checked = 0;

// A translation that was never written is the failure this check exists to
// catch. Walking docs/vi alone would never notice it.
for (const rel of sources()) {
  if (!existsSync(join(VI, rel))) {
    console.log(`FAIL  ${rel}: no translation under docs/vi/`);
    failed = 1;
  }
}

for (const [enPath, viPath, rel] of pairs()) {
  if (SKIP.has(rel)) continue;
  if (!existsSync(enPath)) {
    console.log(`FAIL  ${rel}: no English source for this translation`);
    failed = 1;
    continue;
  }

  const enRaw = readFileSync(enPath, "utf8");
  const viRaw = stripBanner(readFileSync(viPath, "utf8"));
  checked += 1;

  if (!VIETNAMESE.test(viRaw)) {
    console.log(
      `FAIL  ${rel}: the translation holds no Vietnamese, so it was never translated`,
    );
    failed = 1;
    continue;
  }

  const suffix = extname(enPath);
  if (DOC_SUFFIX.has(suffix)) {
    const problems = [];
    const enT = docTokens(stripBanner(enRaw));
    const viT = docTokens(viRaw);
    const viSet = new Set(viT);
    const enSet = new Set(enT);
    const onlyEn = [...new Set(enT)].filter((t) => !viSet.has(t)).sort();
    const onlyVi = [...new Set(viT)].filter((t) => !enSet.has(t)).sort();
    if (onlyEn.length) problems.push(`only in EN: ${onlyEn.join(", ")}`);
    if (onlyVi.length) problems.push(`only in VI: ${onlyVi.join(", ")}`);
    const enH = docHeadings(stripBanner(enRaw));
    const viH = docHeadings(viRaw);
    const sameH =
      enH.length === viH.length && enH.every((h, i) => h === viH[i]);
    if (!sameH) {
      problems.push(
        `heading levels differ: EN=${enH.join(" ")} VI=${viH.join(" ")}`,
      );
    }
    if (problems.length) {
      failed = 1;
      console.log(`FAIL  ${rel}`);
      for (const p of problems) console.log(`        ${p}`);
    } else {
      console.log(
        `ok    ${rel}  (${enT.length} tokens, ${enH.length} headings)`,
      );
    }
  } else {
    let a, b;
    if (rel.startsWith(".github/ISSUE_TEMPLATE/")) {
      a = formSkeleton(enRaw);
      b = formSkeleton(viRaw);
    } else {
      a = codeSkeleton(enRaw, suffix);
      b = codeSkeleton(viRaw, suffix);
    }
    if (a !== b) {
      failed = 1;
      console.log(
        `FAIL  ${rel}: code differs once comments and strings are removed`,
      );
      for (let i = 0; i < Math.min(a.length, b.length); i++) {
        if (a[i] !== b[i]) {
          console.log(`        first difference at character ${i}`);
          console.log(
            `        EN: ...${a.slice(Math.max(0, i - 40), i + 40)}...`,
          );
          console.log(
            `        VI: ...${b.slice(Math.max(0, i - 40), i + 40)}...`,
          );
          break;
        }
      }
    } else {
      console.log(`ok    ${rel}  (code identical, ${a.length} chars compared)`);
    }
  }
}

console.log();
if (failed) {
  console.log("Mirrors are out of step");
  process.exit(1);
}
console.log(`All ${checked} mirrors in step`);
