# Working agreements

## Diction, applies to everything written

Code, comments, documentation, commits, PRs, error messages, logs, UI strings.
Commits and PRs are only part of it.

Five banned word classes:

| Class             | Examples                                                                             |
| ----------------- | ------------------------------------------------------------------------------------ |
| Praise            | awesome, amazing, powerful, magic, elegant, seamless, robust, blazing, comprehensive |
| Self-assessment   | clean, simple, nice, better, improved, optimal, smart                                |
| Filler            | just, simply, easily, very, quite, highly, significantly, greatly                    |
| Self-reference    | this commit, this PR, this function, we now                                          |
| Empty transitions | additionally, furthermore, moreover, it is worth noting                              |

- No marketing, no emotion, nothing subjective, nothing that reads as
  AI-written. Write only facts a reviewer can verify.
- Document only what has landed. No file, commit, message, or release note
  describes a feature, pull request, or version that does not yet exist.
- A performance or reliability claim carries a **number**, or it is dropped.
- Short sentences ending in a period. Never join two clauses with an em dash or
  a semicolon. Split them into two sentences. This holds in prose, not code
  alone.
- ASCII punctuation only: three dots instead of a single ellipsis character,
  a hyphen instead of an en dash. No em dash (`—`) anywhere.
- Arrows belong in tables, lists and CLI output. In prose, use a word.
- Never write `not only X but Y`. State the point directly.
- No pictograph emoji, exclamation marks, or rhetorical questions in code or
  documentation. CLI status glyphs (`✓` `✗` `→`) are fine. They carry
  information rather than decoration.
- **Comments**: say WHY, not what the code already says. No obvious comments.
- **Errors and logs**: name what failed and what to do next. No "Oops", nothing vague.
- **Documentation**: statements of fact, not sales copy.

The bar is the writing these projects publish: Google, Airbnb, Meta, and mature
open-source repositories. Match their conventions, not a personal style.

Commit and PR specifics live in the `commit-convention` / `pr-convention` skills.

## Matt Pocock engineering skills (`~/.claude/skills`)

For engineering work, reach for the matching skill instead of doing it by hand:

- Investigating a bug or a performance regression → `diagnosing-bugs`
- Building a feature or fixing a bug test-first → `tdd`
- Implementing against a spec → `implement`, `to-spec`
- Reviewing changes (branch, PR, WIP) → `code-review`
- Researching documentation or an API → `research`
- Designing a module, improving architecture → `codebase-design`, `improve-codebase-architecture`
- Modelling a domain or its terminology → `domain-modeling`
- Splitting work into tickets, triaging → `to-tickets`, `triage`
- Stress-testing a plan before building → `grilling`

Run `/setup-matt-pocock-skills` once per repository before using the engineering group.

## Review skills (this repository's own)

Run these at their checkpoint, without waiting to be asked:

- Before a commit → `comment-review` on the changed comments, and `code-style`
  when formatting, lint, or imports changed.
- On a structural change, or before a pull request → `architecture-review`.
- Writing the commit message → `commit-convention`.
- Naming a branch or opening a pull request → `pr-convention`.
- Before a commit, or after a response that changed reviewable files →
  `review-gate` to run every review skill and emit the proof as a footer in chat.

Reviewing is reading, not writing. These report findings and do not edit files
on their own.

## Frontend and design skills (`design-taste-frontend`)

When building a user interface, reach for the matching skill instead of writing
generic UI:

- Landing page, portfolio, or a new page that must not look templated → `design-taste-frontend`
- Direction already settled, only execution left → `high-end-visual-design`
- A specific style → `minimalist-ui`, `industrial-brutalist-ui`
- Reworking an existing web or app interface → `redesign-existing-projects`
- Brand identity, logo, palette → `brandkit`
- Generating mockups to build from → `imagegen-frontend-web`, `imagegen-frontend-mobile`
- Building web code that matches a design image → `image-to-code`

## Animation with GSAP (`gsap-*`)

When implementing web animation, reach for the GSAP skills instead of
hand-rolling tweens:

- Tweens, easing, stagger, responsive or reduced-motion → `gsap-core`
- Sequencing and choreography → `gsap-timeline`
- Scroll-linked, pinning, parallax → `gsap-scrolltrigger`
- A plugin (Flip, SplitText, Draggable, ScrollSmoother) → `gsap-plugins`
- React or Next.js → `gsap-react`. Vue or Svelte → `gsap-frameworks`
- Smoothness, 60fps, jank → `gsap-performance`
- Helpers (clamp, mapRange, random, snap) → `gsap-utils`

These cover GSAP correctness. `design-taste-frontend` and `high-end-visual-design`
still own the visual direction. Use both.

## Video (`/watch`)

Installed as a skill. When a task needs the content of a video (YouTube, TikTok,
Vimeo, a local file), use `/watch` instead of guessing from the title or URL. It
downloads the video, extracts frames, pulls captions or transcribes with Whisper,
and hands Claude the frames plus a timestamped transcript.

- Needs `ffmpeg` and `yt-dlp` on the machine. Captions are free. The Whisper
  fallback needs a Groq or OpenAI key.

## Chrome DevTools MCP (`chrome-devtools`)

Installed globally. It opens a real Chrome window. When inspecting or debugging a
live page, use this MCP instead of guessing:

- Failing requests, payloads, headers, status codes → network
- Console output and JS runtime errors → console
- Page load performance, Core Web Vitals → performance trace
- DOM snapshots, throttled CPU or network → as needed

### Driving a Chrome that keeps your logins and history

The default install uses `--isolated=true`, a throwaway profile cleared on exit.
It carries no logins and no history, which fits most debugging.

To drive a Chrome that keeps logins and history across sessions, point the MCP at
a browser you launch yourself on a dedicated profile. Chrome 136 and later refuse
remote debugging on the default profile, so a separate `--user-data-dir` is
required. That directory holds the state, so the same command below reopens the
profile with logins and history intact.

1. Launch Chrome on a debug port with a dedicated profile. Reuse the same
   `--user-data-dir` every time to keep its state:

   ```bash
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
     --remote-debugging-port=9222 \
     --user-data-dir="$HOME/.chrome-debug" \
     --disable-web-security --disable-site-isolation-trials
   ```

2. Point the MCP at it, replacing the isolated default:

   ```bash
   claude mcp remove chrome-devtools -s user
   claude mcp add chrome-devtools -s user -- \
     npx chrome-devtools-mcp@latest --browser-url http://127.0.0.1:9222
   ```

3. Restart the Claude Code session so the MCP reloads.

The debug Chrome must run before the session starts. `--browser-url` connects at
startup and does not launch a browser of its own.

`--disable-web-security` turns off the browser CORS and same-origin checks. Keep
this profile for automation, not everyday browsing.

Running `node setup.mjs` again resets this MCP to `--isolated=true`. Re-apply
step 2 after each setup run.

## Desktop control MCP

Installed by `node setup.mjs`, on by default. Skip it with `--no-desktop`. When
connected it gives
full mouse, keyboard and screen control of the machine, reaching native apps
the browser cannot, such as Postman. Per OS: Windows-MCP, MacOS-MCP,
computer-use-linux. Its tools appear every session once connected, so no skill
is needed to find it.

Use it only for apps outside the browser. For web pages use `chrome-devtools`.

Rules when driving the desktop:

- Ask for permission before acting, then act directly on the target. Take a
  screenshot only when the screen state is unclear or to check a result, not as a
  routine first step.
- Confirm before any irreversible control: send, submit, delete, purchase.
- Never type the user's password or credentials. Sign-in stays with the user.

## Ponytail (code-trimming plugin)

Defaults to `lite` (set in `~/.config/ponytail/config.json`). It suggests, it
does not cut on its own. Switch to `/ponytail ultra` when clearing out an old
codebase. Run `/ponytail-review` before committing.
