# Bluebook Replica — Digital SAT practice app

A desktop replica of College Board's Bluebook testing application, built with Electron + React + Vite + Tailwind. It reproduces the lobby, a locked-down kiosk testing window, the multistage adaptive (MST) engine, built-in tools (Desmos graphing calculator, reference sheet, annotations, answer cross-out), the break screen, and score reports.

> Not affiliated with College Board. Question content is an original, generated bank; scaled scores approximate published conversion curves.

## Quick start

```bash
npm install
npm run dev          # Vite dev server + Electron (kiosk exam windows work here)
npm run dev:web      # renderer only, in a normal browser (lockdown is simulated with full-screen)
npm run build && npm start   # production build loaded from dist/
npm run generate:tests       # regenerate the six practice tests + Test Preview
```

Set `BLUEBOOK_DEBUG=1` to run the exam window without kiosk/shortcut blocking and with DevTools available.
To package installers, `npm i -D electron-builder` then `npm run dist` (config is in `package.json`).

## What's implemented

**Sign-in** — Bluebook's blue sign-in screen: "Use a sign-in ticket from your school" (username/password) or "Sign in with a College Board student account" (email/password with show/hide), "Test Your Device" device check. Sign-in is local only: any credentials work, nothing is sent anywhere, and your display name is derived from the email or username (editable under Profile & Settings).

**Home** — the light-blue Bluebook home: "Welcome, {name}. Good luck on test day!", Your Tests (Active/Past) with the SAT registration card (date, arrival/doors-close times in your time zone, test center, accommodations, Exam Overview, Test Day Checklist), "Start Exam Setup" (device check → exam download → "Exam setup is complete." + Admission Ticket), Practice and Prepare cards (Test Preview, Full-Length Practice, SAT Practice N with In Progress/Resume or Start, Past with View Score), Explore BigFuture, and the version stamp. Test Day (room code → confirm → check-in → proctor start code → full-length test in lockdown) is reachable from the card once setup is complete.

**Lockdown** — the exam runs in a separate `BrowserWindow` created with `kiosk`, `fullscreen`, `alwaysOnTop`, `frame:false`, screen-capture protection, and a reduced application menu (no Quit). Global shortcuts are registered for Alt+Tab, Cmd/Ctrl+Tab, Ctrl+Esc, Alt+F4, Cmd+Q, PrintScreen, F11, F12, Ctrl+Shift+I, screenshot combos and more (some are OS-reserved and reported as such); `before-input-event` blocks in-window escape keys. Window blur, full-screen exit, and display add/remove events are logged to the session and raise a full-screen "Testing paused" overlay.

**Exam UI** — Bluebook chrome: section/module title, Directions popover, hide/show timer (turns red and re-appears at 5:00), battery indicator, Highlights & Notes / Calculator / Reference / More tools, long-dash rules, the navy "THIS IS A PRACTICE TEST" banner, a draggable divider handle, Back hidden on the first question; split-pane Reading & Writing layout with a draggable divider, single-pane Math layout; question toolbar with number badge, Mark for Review, ABC cross-out; text selection popover (three highlight colors, underline, add note) and an annotations panel; floating, draggable, resizable Desmos calculator (state persists per module) and reference sheet; More menu (Help, Keyboard Shortcuts, Settings with zoom + line reader, Unscheduled Break, Exit the Exam); footer with student name, question navigator flyout (answered / unanswered / current / for-review) and Back/Next; Check Your Work review page; "This Module Is Over" transition; full-screen 10-minute break (“Practice Test Break”, break rules, battery and student name; practice lets you resume at once, test day counts down to 0:00 before “Resume Testing Now” appears); at the end, "Digital Practice Is Over: Stand By!" upload screen → experience-rating modal → confetti "You're All Finished!" with View Your Score.

**Adaptive engine + scoring** — Module 1 raw score vs. the section's `routingThreshold` picks the easier or harder Module 2 variant. Raw scores map to 200–800 per section using upper/lower conversion curves (`src/lib/scoring-tables.js`, overridable per test via `section.scoring`), composite 400–1600. Score report shows section scores, routing decision, knowledge-and-skills breakdown, per-module tables and a question review dialog with explanations.

**Persistence** — sessions, settings and downloads are stored by the main process in an encrypted JSON store (`safeStorage`, falling back to plain JSON) under the app's `userData` directory; tests are cached in `userData/tests`. The renderer talks to it through a `contextBridge` API with a browser shim so the same code runs in a plain browser.

## Mentor chat (students ↔ mentors on Telegram)

During a test, students can press **J** (or the **Chat** tool in the header) to open a Mentor Chat panel. Their question is forwarded to your mentors' Telegram with the section, module and question number; mentor replies come back into the panel. Pressing J again hides it. Each test session gets a short code (e.g. `#TZR3BR`) so replies reach the right machine.

**Mentor side (Telegram):**
- Reply to a forwarded question → answer goes to that student only.
- `/to A7K2QZ your answer` → answer a specific student by code.
- A plain message (not a reply) → goes to every student active in the last 3 hours.
- `/students` → list who is online. `/help` → these instructions.

**Local mode:** run `npm run dev:web` — the dev server long-polls Telegram itself using the token in `api/_lib/telegram.js`, so no webhook or public URL is needed while testing on one machine.

**Relay backend** lives in `api/` as Vercel serverless functions (`send`, `messages`, `telegram` webhook, `health`, `setup-webhook`) with Upstash Redis storage (in-memory fallback for local dev). The Vite dev server serves the same functions, so `npm run dev:web` works end to end locally.

### Deploy to Vercel

1. Push this repo to GitHub and import it in Vercel (framework: Other; `vercel.json` sets the build to `npm run build` → `dist`).
2. In the Vercel project add **Upstash Redis** from the Marketplace (Storage tab). It fills `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` (or the `KV_REST_API_*` names) automatically.
3. Configure the bot token and mentor ids (`TELEGRAM_BOT_TOKEN` / `MENTOR_CHAT_IDS` in the Vercel project settings, or the constants in `api/_lib/telegram.js`). The webhook secret is derived from the token automatically, so forged updates are rejected without any extra setup.
4. Redeploy. The webhook registers itself the first time the app talks to the API; `/api/health` shows `webhook: true` once it has. (`/api/setup-webhook?action=info` shows Telegram's view of it.)
5. Each mentor must press **Start** on the bot once (Telegram only lets bots message users who started them).
6. On the students' computers: the web build at the Vercel URL already talks to its own `/api`. For the desktop app, set **Profile & Settings → Chat server URL** to the Vercel URL (or build with `VITE_CHAT_URL`).

## Test JSON schema

`public/tests/*.json` follow the schema in the spec, extended with adaptive variants and optional stimuli:

```json
{
  "testId": "sat-practice-01",
  "title": "SAT Practice Test #1",
  "breakMinutes": 10,
  "sections": [{
    "id": "rw", "name": "Reading and Writing", "routingThreshold": 16,
    "modules": [
      { "moduleNumber": 1, "durationMinutes": 32, "questions": [ ... ] },
      { "moduleNumber": 2, "variant": "easy", "durationMinutes": 32, "questions": [ ... ] },
      { "moduleNumber": 2, "variant": "hard", "durationMinutes": 32, "questions": [ ... ] }
    ]
  }, { "id": "math", "calculator": true, "referenceSheet": true, "routingThreshold": 13, "modules": [ ... ] }]
}
```

Question fields: `id`, `type` (`multiple_choice` | `spr`), `passage`, `stimulusImage`, `stimulusSvg`, `table` (`{caption, headers, rows}`), `stem`, `options` (`[{id,text}]`), `correctAnswer` (letter, or for SPR a value / list of accepted values / `{min,max}`), `explanation`, `domain`, `skill`, `difficulty`. Text supports `$…$` / `$$…$$` KaTeX, `**bold**`, `*italic*`, `__underline__`, `[[blank]]`, `\$` for a literal dollar sign, blank lines for paragraphs and `- ` bullet lists.

Add a test by dropping a JSON file in `public/tests/` and listing it in `manifest.json` (an entry may point at a remote `url` instead of a bundled `file`).

## Layout

```
electron/     main.cjs (windows, IPC), preload.cjs (bridge), lockdown.cjs (kiosk + shortcuts + integrity), store.cjs (encrypted JSON), tests-repo.cjs (download/cache)
src/lib/      bridge.js, schema.js, mst.js, scoring-tables.js, session.js, rich-text.jsx (KaTeX/markup), highlights.js
src/store/    exam-store.js (Zustand: timer, navigation, answers, annotations, routing), lobby-store.js
src/components/exam/   ExamShell, ExamHeader, Timer, Workspace, PassagePane, QuestionPane, OptionList, SprInput, NavFlyout, ReviewScreen, BreakScreen, Calculator (Desmos), ReferenceSheet, …
src/components/lobby/  LobbyShell, StartTestDialog (presets + device check), QuestionReview
src/pages/    Lobby, Practice, Results, ResultDetail, TestDay, Exam
content/      rw-bank.mjs (original R&W items), math-bank.mjs (36 self-checking generators)
scripts/      generate-tests.mjs, dev-electron.mjs
```
