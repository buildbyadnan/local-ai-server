# QA — visual references

Reference screenshots for the Web UI, per `CONNECTIVITY_PLAN.md` §10.6.2.
Nothing here runs in CI (CI has no browser, and §10.3 forbids an e2e runner):
capturing and diffing are explicit, local, human steps.

## What's committed

`baselines/` — home (`/`), guide (`/llama/llama-3-1-8b`) and directory
(`/llama`) at **1920×1080**, **768×1024** and **375×812**, plus
**1440×768** with the sidebar expanded (history panel open, the layout's
tightest state):

```
home-1920x1080.png   guide-1920x1080.png   directory-1920x1080.png
home-768x1024.png    guide-768x1024.png    directory-768x1024.png
home-375x812.png     guide-375x812.png     directory-375x812.png
home-1440x768-sidebar-expanded.png
```

## How they were captured (deviation from the plan, recorded)

§10.6.2 says `npx playwright screenshot`. **Playwright is not installed in
this environment** (`node_modules` has no `playwright`, and installing it
means downloading a browser bundle), so the same job is done with the
system's headless Chrome driven over the DevTools protocol:

- same browser engine, same URLs, same viewport sizes, same
  `--hide-scrollbars` behaviour;
- served by a production build (`next start` on `127.0.0.1:3100`), not a
  dev server;
- fresh, empty profile, so `home` shows the first-visit state
  (`0 sessions` + the welcome comment).

State the shots depend on (so a diff on another machine isn't a false
alarm): the real local Ollama with **its** installed models, so the
installed-model chips, the picker label and the tree's ✓/Pull badges show
whatever that machine has.

## How to refresh and diff (manual, explicit)

1. Rebuild and serve: `pnpm build && pnpm start`.
2. Re-capture with a headless-Chrome screenshot of the three routes at the
   four viewport states above, into a scratch directory.
3. Diff side by side against `baselines/`.
4. When a difference is intentional, record it here — **which screenshot,
   what changed, why** — and commit the new reference in the same change as
   the UI it reflects.

### Change log

| Date | Screenshot(s) | Change | Why |
| ---- | ------------- | ------ | --- |
| 2026-10-27 | all 10 | initial capture at M4 | first committed references (M4: real chat history, session rows, hydration states) |

## The rest of the QA gate (M4, this milestone)

| Check | Result |
| ----- | ------ |
| `pnpm lint` | clean |
| `pnpm test` | 109/109 |
| `pnpm build` | 28/28 routes (24 prerendered, 9 app paths, 0 API in prerender, `functions: /_middleware`) |
| M4 history matrix (CDP, 40 checks: rows 17–38 + §8 copy + space pass + a11y) | 40/40 pass |
| M3 pull matrix re-run against this build (35 checks) | 35/35 pass |
| internal link crawl (§10.6.1) | 23 pages, all 200; bogus slug 404 |
| `bazel build //...` | green (`.bazelignore` keeps this crate out) |
