---
name: code-style
description: Keep formatting and lint consistent across a team and across languages by deferring to the project's own formatter and linter, and by setting up the language-standard tools plus a pre-commit hook and CI when none exist. A skill guides the agent, but the installed tools are what hold every human to the same style. Use when setting up formatting or linting, enforcing a consistent code style, before a first commit in a new repo, or when the user says "set up prettier", "add a formatter", "lint config", "format code", "code style", "định dạng code", "cài lint", "format cho dự án".
---

# Code style

Consistent style is enforced by tools, not by an agent reading rules. A formatter
lays out code the same way every time. A linter rejects the rest. This skill
makes sure those tools exist, are run, and are wired so **every human** on the
team is held to them, and not the agent alone.

The project's own config is the source of truth. Detect it and follow it. Never
impose a personal style over what the repository already sets.

---

## 1. Detect before doing anything

Read the repository first. One repo may hold several languages, so handle each.

| Signal                                                       | Meaning                                                          |
| ------------------------------------------------------------ | ---------------------------------------------------------------- |
| `.editorconfig`                                              | Cross-editor basics (indent, newline, charset). Honour it always |
| `.gitattributes`                                             | Line-ending policy (`* text=auto eol=lf`). Honour it always      |
| `.prettierrc`, `prettier` in `package.json`                  | JS/TS formatter present                                          |
| `.eslintrc*`, `eslint.config.*`                              | JS/TS linter present                                             |
| `[tool.ruff]`, `[tool.black]` in `pyproject.toml`, `.flake8` | Python tools present                                             |
| `rustfmt.toml`, `clippy.toml`                                | Rust tools present                                               |
| `.clang-format`                                              | C/C++ formatter present                                          |
| `.golangci.yml`                                              | Go linter present (gofmt is built in)                            |
| `.pre-commit-config.yaml`                                    | A pre-commit manager is already wired                            |
| A `format`/`lint` script in the manifest or Makefile         | Run that, do not guess                                           |

If tools already exist: run them, report the result, fix what they flag. Do not
replace a working setup with a different one because you prefer it.

---

## 2. Formatter and linter are different jobs

Both are needed for one shared style. Set up or run each.

| Language | Formatter (layout)           | Linter (rules)  |
| -------- | ---------------------------- | --------------- |
| JS, TS   | prettier                     | eslint          |
| Python   | ruff format, or black        | ruff, or flake8 |
| Go       | gofmt, gofumpt               | golangci-lint   |
| Rust     | rustfmt                      | clippy          |
| Java     | google-java-format, spotless | checkstyle      |
| Kotlin   | ktlint                       | ktlint, detekt  |
| C, C++   | clang-format                 | clang-tidy      |
| Shell    | shfmt                        | shellcheck      |

Pick the language's standard tool, not a niche one. When the ecosystem has a
clear default (gofmt, rustfmt), there is no choice to make.

---

## 3. What a shared style pins down

Layout from section 2 is the start. A team style also fixes these, each one
machine-checkable, so no reviewer has to police it by eye.

### Cross-editor and cross-OS baseline

`.editorconfig` sets indent, charset, final newline, and trailing whitespace,
and most editors honour it with no plugin. `.gitattributes` with
`* text=auto eol=lf` stops line endings from flipping between Windows and macOS.
This layer needs no per-language tool and comes first.

### Import order

One deterministic order, grouped and sorted, so imports stop churning in diffs.

| Language | Tool                                                           |
| -------- | -------------------------------------------------------------- |
| JS, TS   | eslint-plugin-import (`import/order`), or `simple-import-sort` |
| Python   | ruff, rule group `I` (replaces isort)                          |
| Go       | goimports, keeps the standard library in its own group         |
| Rust     | rustfmt (`group_imports`, `imports_granularity`)               |
| Java     | google-java-format, or checkstyle `ImportOrder`                |
| Kotlin   | ktlint                                                         |
| C, C++   | clang-format (`SortIncludes`, `IncludeCategories`)             |
| Shell    | no import system, nothing to order                             |

### Imports from the root, not deep relative

A deep `../../../` path breaks the moment a file moves. Prefer a root alias or an
absolute module path.

| Language | How to enforce                                                      |
| -------- | ------------------------------------------------------------------- |
| JS, TS   | `tsconfig` `paths` (`@/`), plus eslint `no-relative-parent-imports` |
| Python   | ruff `TID252`, ban-relative-imports                                 |
| Go       | the module path is absolute by design                               |
| Rust     | prefer `crate::` paths over deep `super::`, held in review          |
| Java     | package imports are absolute by design                              |
| Kotlin   | package imports are absolute by design                              |
| C, C++   | include paths via `-I`, not deep relative `../`, held in review     |
| Shell    | no import system, not applicable                                    |

### Naming

Casing follows the language idiom and is enforced by lint, not by review. Do not
invent a house casing the language does not already use.

| Language | Tool                                                                |
| -------- | ------------------------------------------------------------------- |
| JS, TS   | `@typescript-eslint/naming-convention`                              |
| Python   | ruff, rule group `N` (pep8-naming)                                  |
| Go       | revive, or the compiler for exported names                          |
| Rust     | the compiler's non-snake-case and non-camel-case lints, plus clippy |
| Java     | checkstyle                                                          |
| Kotlin   | ktlint, or detekt                                                   |
| C, C++   | clang-tidy `readability-identifier-naming`                          |
| Shell    | shellcheck flags some, casing mostly by convention                  |

### Unused imports and dead code

Turn on autofix so unused imports and variables clear on save or commit, not in
review.

| Language | Tool                                                                  |
| -------- | --------------------------------------------------------------------- |
| JS, TS   | eslint `no-unused-vars`, `unused-imports`                             |
| Python   | ruff `F401` for imports, `F841` for variables                         |
| Go       | goimports drops unused imports, the compiler rejects unused variables |
| Rust     | the compiler's `unused_imports` and `dead_code` lints                 |
| Java     | checkstyle `UnusedImports`, the IDE for unused locals                 |
| Kotlin   | detekt, or the compiler's unused warnings                             |
| C, C++   | compiler `-Wunused`, clang-tidy                                       |
| Shell    | shellcheck `SC2034` for unused variables                              |

### File and folder names

One casing scheme for file and folder names, matching the language idiom,
enforced by lint where a rule exists.

| Language | Tool or convention                                                  |
| -------- | ------------------------------------------------------------------- |
| JS, TS   | eslint `unicorn/filename-case`, one of kebab or camel               |
| Python   | `snake_case` by pep8, no strong linter, hold it in review           |
| Go       | lowercase package folders, no underscores, the `go` convention      |
| Rust     | files `snake_case`, the module follows the file, by convention      |
| Java     | the file name must match the public class, enforced by the compiler |
| Kotlin   | matches the class for a single-class file, by convention            |
| C, C++   | one scheme, by convention, held in review                           |
| Shell    | one scheme, by convention, held in review                           |

Layer folder names and where a file sits by role are an architecture concern.
See `architecture-review`, not this section.

---

## 4. When no tooling exists, set it up

Adding formatters, linters, a hook and a CI job changes the repository and its
dependencies. **Propose the exact list and get the user's agreement before
adding it.** Then set up three layers, because only all three make every human
consistent:

1. **Config** for the formatter and linter, one per language present. Prefer the
   tool's defaults over a long custom config. Fewer rules drift less.
2. **A pre-commit hook** so a badly formatted change cannot be committed. Use the
   [`pre-commit`](https://pre-commit.com) framework, which manages hooks for any
   language from one `.pre-commit-config.yaml`, rather than a JS-only manager.
3. **A CI job** that runs the same tools in check mode, so a commit made with
   `--no-verify` or through the web UI is still caught.

The hook and CI must run the **same** tools with the same config, so local and CI
cannot disagree.

> Caveat for machines with a global `git config core.hooksPath` set: it bypasses
> a repo's `.git/hooks`. The `pre-commit` framework can install into the active
> hooks path. Check `git config core.hooksPath` first and install accordingly.

---

## 5. Do not reformat the world

A formatting change that touches files the feature never touched buries the real
diff and rewrites blame for everyone.

- Format only the lines or files the change actually touches. Most formatters
  and the `pre-commit` framework support staged-files-only runs.
- A repo-wide first-time format is a **separate commit of its own**, `style:`
  type, with no logic change, so it can be reviewed and skipped in blame
  (`.git-blame-ignore-revs`).
- Never mix a reformat with a feature in one commit.

---

## 6. Architecture consistency is a different skill

Keeping new features designed the same way is not a formatting job. Use
`architecture-review` to check a change against the repository's layering, and
`codebase-design` to design a new module. This skill stops at style and lint.

---

## Reference conventions

- Each language's official formatter and its default rules
- [`.editorconfig`](https://editorconfig.org) for cross-editor basics
- [`pre-commit`](https://pre-commit.com) for language-agnostic hook management
- The repository's own config, which wins over every default above
