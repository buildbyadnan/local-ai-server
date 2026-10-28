# QA — visual references

Reference screenshots for the Web UI baseline suite.
Nothing here runs in CI (CI has no browser, and the gate keeps e2e out of CI):
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

## How they were captured

`npx playwright screenshot` is the obvious tool, but **Playwright is not
installed in this environment** (`node_modules` has no `playwright`, and
installing it means downloading a browser bundle). The same job is done
with the system's headless Chrome driven over the DevTools protocol:

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
| 2026-10-27 | all 10 | M9 responsive pass recapture | same routes/viewports, new shell: fluid `min(1680px, 100%)` cap, the four-tier ladder (768–1023 / 1024–1279 / 1280–1599 / ≥1600), sidebar OLLAMA-row overflow fix, modal at `min(720px, 92vw)` — every shot re-taken on the M9 build (first-visit state, hermetic DB reset) |

## The rest of the QA gate (as of M9)

| Check | Result |
| ----- | ------ |
| `tsc --noEmit` / `pnpm lint` | 0 errors / clean |
| M10 shell matrix (CDP, 61 checks: edge-to-edge + credit bar + mobile first screen) | 61/61 pass |
| M11 readability matrix (CDP, 14 checks: 14px/leading/measure + per-message model) | 14/14 pass |
| chat audit (CDP, 80 checks: all five installed models chatted for real, markdown rendering, 6 viewports 375→2560) | 80/80 pass |
| `pnpm test` | 224/224 |
| `pnpm build` | 33/33 routes generated |
| M9 responsive matrix (CDP, 30 checks: 8 widths × 3 heights overflow/clipping + modal at 768/1024/1920) | 30/30 pass |
| M8 parallel matrix (CDP, 21 checks: per-tab selection, concurrent streams, queue wait line, System info) | 21/21 pass |
| M6 picker matrix (CDP, 30 checks) | 30/30 pass |
| M5 modal matrix (CDP, 42 checks) | 42/42 pass |
| M4 history matrix (CDP, 33 checks: rows, copy, space pass, a11y) | 33/33 pass |
| M3 pull matrix (CDP, 35 checks, against the stand-in fleet) | 35/35 pass |
| UI audit matrix (CDP, 144 checks) | 144/144 pass |
| internal link crawl | 23 pages, all 200; bogus slug 404; foreign `Host` → 403; cross `Origin` → 403; `Content-Encoding` → 415 |
| `bazel build //...` | green (`.bazelignore` keeps this crate out) |
