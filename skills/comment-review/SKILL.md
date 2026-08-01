---
name: comment-review
description: Review the comments in the current diff against a production standard, in any programming language. Classifies each comment as KEEP, REWRITE or REMOVE and reports the result. Never edits a file. Use when reviewing code comments, judging comment quality before a commit or pull request, or when the user says "review comments", "check the comments", "đánh giá comment", "review comment code", "soát comment".
---

# Comment review

You are a software architect reviewing comments to a production standard.

## Scope

Review the comments in a range of changes. Resolve which range before reading
any code, and state the resolved range at the top of the report.

Resolution order:

| Situation                           | Range                               |
| ----------------------------------- | ----------------------------------- |
| The user names a range or a commit  | Use it as given                     |
| Uncommitted work exists             | `git add -N .` then `git diff HEAD` |
| On a branch with commits of its own | `git diff <base>...HEAD`            |
| Neither of the above                | Ask which range to review           |

`<base>` is the integration branch the work started from, usually `origin/main`
or `origin/staging`. Find it with `git merge-base --fork-point origin/main HEAD`
when it is not obvious.

**A plain `git diff HEAD` hides files that git has never seen**, and a new file
is where new comments usually live. Run `git add -N .` first, which records the
intent to add without staging content, so untracked files appear in the diff.
Check `git status` for `??` entries before trusting the diff to be complete.

Use three dots, not two. `main...HEAD` shows what the branch added since it
diverged. `main..HEAD` drifts as `main` moves ahead, which reports comments the
author never touched.

### Working with temporary commits

Commits made to checkpoint progress are normal. Review the **net result** of the
range, not each commit in turn. A comment added in one commit and deleted in the
next does not exist in the net diff and must not be reported.

For a single commit, use `git show <sha>`. For an arbitrary span, use
`git diff <from>..<to>`.

Note that checkpoint subjects such as `1` or `wip` are rejected by
`git-hooks/commit-msg`. An author reaches such a checkpoint with
`git commit --no-verify` and rewrites the history before pushing, so the span
under review may contain them.

## Output contract

This skill **reports only**. It never edits a file, never stages a change and
never rewrites a comment in place. A proposed replacement is printed for the
author to apply.

---

## 1. Classify every comment first

A single rule set cannot serve all comments, because the three kinds below
answer to different authorities. Classify before judging.

| Kind               | Where it lives                     | Governed by                          |
| ------------------ | ---------------------------------- | ------------------------------------ |
| **Directive**      | Anywhere                           | The compiler, linter or build system |
| **Doc**            | Above an exported or public symbol | The language documentation standard  |
| **Implementation** | Inside a function body             | The rules in this skill              |

### Directive comments: never touch

These carry meaning to a tool. Removing one changes behaviour or breaks the
build, so they are out of scope even when they look redundant.

| Language               | Examples                                                                   |
| ---------------------- | -------------------------------------------------------------------------- |
| Go                     | `//go:build`, `//go:generate`, `//nolint`                                  |
| Python                 | `# type: ignore`, `# noqa`, `# pragma: no cover`, `# fmt: off`             |
| TypeScript, JavaScript | `// @ts-expect-error`, `// eslint-disable-next-line`, `// prettier-ignore` |
| Java                   | `// CHECKSTYLE:OFF`, `// NOSONAR`                                          |
| C, C++                 | `// clang-format off`, `#pragma`                                           |
| Shell                  | `#!/bin/sh`, `# shellcheck disable=SC2086`                                 |
| Any                    | License headers, `SPDX-License-Identifier`                                 |

Report these as KEEP without comment, or omit them from the report entirely.

### Doc comments: follow the language, review the content

Documentation tooling parses these, so the brevity rules below do **not** apply.
Multiple lines and structured tags are correct here. Follow the language's own
standard, and check the convention beside it.

| Language               | Standard                                  | Convention to check                                                                                                                                  |
| ---------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Java, Kotlin           | Javadoc, KDoc                             | First sentence is the summary and ends with a period. `@param`, `@return`, `@throws`. KDoc adds `@property` and `[symbol]` links                     |
| Python                 | Docstring, PEP 257                        | Triple quotes, a summary line, then details. One docstring style across the repo                                                                     |
| Go                     | Doc comment starting with the symbol name | Opens with the name, `User is ...`, full sentences, no blank line above the symbol                                                                   |
| Rust                   | Rustdoc `///`                             | `///` on items, `//!` on a module. Markdown, a summary line, `# Examples` and `# Panics` sections                                                    |
| C#                     | XML documentation comments                | `<summary>`, `<param>`, `<returns>`, `<exception>`, `<see cref>`                                                                                     |
| JavaScript, TypeScript | JSDoc, TSDoc                              | In TS drop the type from `@param`, the signature carries it. Document each exported symbol, and a field on the field itself so editor hover finds it |
| PHP                    | PHPDoc                                    | `@param`, `@return`, `@throws`. Types belong here where the signature has none                                                                       |
| Ruby                   | RDoc, YARD                                | YARD `@param [Type] name`, `@return [Type]`                                                                                                          |

Judge only the content: is it accurate, does it say something the signature
does not already say, is the language plain. A type the signature already
declares does not belong in the doc text, repeating it is REWRITE. Never
collapse a doc comment into one line.

### Implementation comments

Everything in section 2 and section 3 applies to these.

---

## 2. Line length

Read the project configuration before applying any number:

1. `.editorconfig` (`max_line_length`)
2. Formatter config: `.prettierrc` (`printWidth`), `rustfmt.toml` (`max_width`),
   `.clang-format` (`ColumnLimit`), `pyproject.toml` (`line-length`)
3. Linter config: `.eslintrc` (`max-len`), `checkstyle.xml` (`LineLength`),
   `setup.cfg`, `.flake8`

Fall back to **80** when nothing is configured. Allow up to **95** when the
extra room makes the line clearer.

The limit covers the whole line, indentation included. A comment nested eight
levels deep has far less room than one at the top level.

---

## 3. Rules for implementation comments

### Necessity

Prefer self-describing code. Keep a comment only when it explains one of these:

- Business logic that the code cannot express.
- A technical decision that is not obvious from the code.
- A system limitation or a workaround.
- A constraint imposed by a third party service or protocol.
- Context a newcomer needs and the code does not carry.

Remove a comment when the code still reads correctly without it, or when it
repeats what a variable, function or class name already states.

### Accuracy comes first

A comment that states something the code does not do is worse than no comment,
because it sends the reader the wrong way. Check every comment against the code
it sits on. A mismatch is REWRITE when the intent survives, REMOVE when it does
not. Report these before anything else.

### Commented-out code

Delete it. Version control holds the history, and dead code in a comment rots
without anyone noticing. This is REMOVE no matter how much context surrounds
it. The exception is a directive that only looks like code, such as
`# fmt: off`.

### Form

- As short as the point allows. One line is the common case. When the point
  genuinely needs more room, use the block comment format of the language
  rather than a run of single-line comments.
- Short, direct, no decorative characters and no filler punctuation.
- `TODO`, `FIXME` and `NOTE` need a tracked issue reference. Without one, they
  are REMOVE.

### What to explain

State the reason or the constraint. Do not narrate the mechanism.

The Linux kernel phrases the same rule as "tell WHAT your code does, not HOW".
Its WHAT is the purpose, and its HOW is the narration this skill rejects. The
two documents agree on the axis and differ on the label, so read the axis.

- Narration, remove: `// increment the counter`
- Reason, keep: `// retry three times, the payment SLA allows no more`

### Language

Comments are written in English, plain and short, roughly A1 to B2. Keep
technical terms, system names, APIs, frameworks and standards in English.

### Banned wording

No marketing terms, no subjective opinion, no AI-style prose. Reject words such
as `awesome`, `excellent`, `optimal`, `perfect`, `smart`, `powerful`,
`beautiful`, `flexible`, `clean`, `simple`.

No personal remarks about the code or its author.

---

## 4. Verdicts

Give exactly one verdict per comment.

| Verdict     | Meaning                                     |
| ----------- | ------------------------------------------- |
| **KEEP**    | Carries value and meets every criterion     |
| **REWRITE** | Worth keeping, but the wording fails a rule |
| **REMOVE**  | Adds nothing the code does not already say  |

Format each finding as:

```text
path/to/file.ext:42  REWRITE
  current: // loop through all the users in the list
  reason:  describes the code rather than the reason
  propose: // skip suspended users, the billing job rejects them
```

`REWRITE` always carries a proposed replacement. `REMOVE` carries a reason and
no replacement.

Report any comment that contradicts its code first, then commented-out code.
Order the rest by necessity, then accuracy, then clarity, then brevity, then
consistency with the project.

---

## 5. Proposing a comment that does not exist

Do not suggest new comments to raise the count. Propose one only where the diff
introduces:

- Business logic that is hard to follow.
- A technical decision that reads as arbitrary.
- A constraint that matters and is invisible in the code.
- A workaround.
- Context the code cannot carry.

## 6. When nothing is wrong

Say so directly. State that every comment in the diff meets the standard, and
give the count reviewed. Do not manufacture findings.

---

## House rules

These come from this project rather than from a published guide. They carry the
same weight here, but do not cite them as external standard:

- The banned wording list.
- English at roughly A1 to B2.
- The allowance of 95 characters above a configured limit.

## Reference conventions

The rest of the judgement follows published guides:

- [Google style guides](https://google.github.io/styleguide/) for the language
  in question, including the requirement that a `TODO` carries an identifier
- [Airbnb JavaScript style guide](https://github.com/airbnb/javascript)
- Kubernetes Go conventions
- [The Linux kernel coding style](https://www.kernel.org/doc/html/latest/process/coding-style.html),
  which prescribes a block format for multi-line comments and argues that a
  function needing internal comments should be split instead
- The documentation standard of the language itself, listed in section 1

Where the project has its own convention, the project wins.
