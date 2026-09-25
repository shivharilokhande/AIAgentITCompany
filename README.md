# SmartIT Console (v2)

Project · product · scrum management for the **Smart IT by Shiv** pipeline. One self-hosted web app; every project runs the same 8 phases, 15 personas and 10 SOPs — and you can see it.

![stack](https://img.shields.io/badge/Next.js-15-black) ![node](https://img.shields.io/badge/Node-%E2%89%A522.13-green) ![db](https://img.shields.io/badge/DB-node%3Asqlite-blue)

## Quick start

```bash
# Option A — local (Node ≥ 22.13, no native deps)
npm install
PORT=3100 npm run dev   # http://localhost:3100 (3000 is often taken by project backends)

# Option B — Docker
docker compose up --build   # http://localhost:3100, data persists in the smartit-data volume
```

A demo project ("Demo: Kanban Task App") is created on first run so the visualizer has data. Set `SEED_DEMO=0` to skip it.

## Company Run (v2.1)

Every request — a question, an analysis, a plan, code, tests, a deploy — runs through the whole company and is shown live: **Founder → CTO/CFO/CPO → BA/Product/Design → Architect → Scrum Master → Engineers → QA → DevOps → Founder delivers**. Each step carries the persona, the phase and the kind of work (think · analyze · decide · write · design · code · review · test · deploy · deliver) plus expandable detail (reasoning, code, test output).

- **Pipeline tab → "Live now"** strip: who is working right now, on what, at which phase (also highlighted on the org chart).
- **Company run page** (`/projects/:id/runs/:commandId`): phase rail + timeline grouped by phase and persona, live while running, Founder's delivery at the end. Linked from every command in the Claude tab.
- **Cowork Session Watcher (built in, automatic).** The console runs on the same Mac as Claude Cowork, so it tails each session's local audit log (`~/Library/Application Support/Claude/local-agent-mode-sessions/**/audit.jsonl`), matches sessions to projects by title / folder (fuzzy: "NamastPOS 2" → NamastePOS), and mirrors every assistant message, file write, command, test run and sub-agent into the project's live company run — attributed to a persona/phase/step by content. ~10 s latency, no API key, no scheduled task. Each new human instruction in the session opens a new run and closes the previous one. Runs from `instrumentation.ts` every 10 s and on every UI poll; disable with `COWORK_WATCHER=0`; point elsewhere with `COWORK_SESSIONS_DIR`.
- Other producers: a Cowork session posting directly (via the `smartit-console-bridge` skill), the `smartit-console-sync` scheduled task, or the in-app engine (`ANTHROPIC_API_KEY`) which makes one Claude call per phase and streams the personas' steps.
- `data/run-ai-features.sh` is a scripted example run you can replay.

The console runs as a macOS LaunchAgent (`~/Library/LaunchAgents/com.smartit.console.plist`, port 3100, KeepAlive) so it survives sessions and restarts at login. Restart: `launchctl kickstart -k gui/$(id -u)/com.smartit.console`.

## Claude Bridge (v2)

The console is linked two ways with Claude Cowork:

- **App → Claude.** Every project has a **Claude** tab: *Fetch complete details*, *Run phase*, *Plan sprint*, *Review files*, *Sync with repo*, or a free-text *Ask*. Commands are queued. In Cowork say **"check the console"** (or run the scheduled task) and Claude claims the queue, does the work with the Smart IT SOPs, streams progress into the **Live activity** feed, and marks each command done.
- **Claude → App.** Anything you ask Claude in Cowork about a project is mirrored into the console (command + activity + data) via the `smartit-console-bridge` skill.
- **Optional in-app engine.** Set `ANTHROPIC_API_KEY` (and optionally `CLAUDE_MODEL`) and the console processes queued commands itself with the Claude API — no Cowork session needed.

REST surface: `/api/bridge/{health,projects,projects/:id,import,commands,commands/:id,activity,snapshot,tick}`. Set `BRIDGE_TOKEN` to require `Authorization: Bearer`.

## What's inside

| Tab | What you do there |
|---|---|
| **Dashboard** | All projects, phase progress, active sprint, gate % and LGTM % at a glance. |
| **How the company works** | Org chart (15 personas), the 8-phase stepper, the SOP message-pool diagram, the per-file coding loop, the 10 quality checks. |
| **Project → Pipeline** | Live 8-phase stepper for *this* project: owners, deliverables, SOPs per phase; mark phases done / reopen; who's "on the field". |
| **Project → Backlog** | Requirement pool (P0/P1/P2) and product backlog of user stories; plan stories into sprints. |
| **Project → Contracts** | Contract A (PRD), B (System Design), C (Task Plan) as structured forms + the SOP-1 **consistency gate** (File List == Logic Analysis == Task List). |
| **Project → Scrum** | Sprints, drag-and-drop kanban (To Do / In Progress / Review / Done), story points, burndown, velocity. |
| **Project → Quality & Delivery** | SOP-4 per-file LGTM/LBTM log, SOP-5 code summary / is-pass, 10-check quality gate, ADRs, deployment status. |

## Architecture (short)

Next.js 15 App Router · Server Components read via a typed repo (`src/lib/repo.ts`) · mutations are Server Actions (`src/lib/actions.ts`) · SQLite through Node's built-in `node:sqlite` (`src/lib/db.ts`, no native build) · the methodology itself is static data in `src/lib/pipeline.ts` (ADR-002) · charts are hand-rolled SVG.

Full docs: [VISION](VISION.md) · [STRATEGY](STRATEGY.md) · [SPECIFICATION (Contract A)](SPECIFICATION.md) · [ARCHITECTURE (Contract B)](ARCHITECTURE.md) · [TASK_PLAN (Contract C)](TASK_PLAN.md) · [CODE_SUMMARY](CODE_SUMMARY.md) · [QUALITY_REPORT](QUALITY_REPORT.md) · [SPRINT_REPORT](SPRINT_REPORT.md) · [DEPLOYMENT](DEPLOYMENT.md) · [ADRs](docs/adrs)

## Scripts

`npm run dev` · `npm run build` · `npm start` · `npm run typecheck` · `npm test` (Vitest, 24 tests)

## Configuration

| Var | Default | Meaning |
|---|---|---|
| `DATA_DIR` | `./data` | Where `smartit.db` lives (`:memory:` for tests) |
| `SEED_DEMO` | `1` | Create the demo project on first run |
| `PORT` | `3100` | HTTP port (avoid 3000 — project backends use it) |
| `ANTHROPIC_API_KEY` | — | Enables the in-app engine (commands auto-process) |
| `CLAUDE_MODEL` | `claude-sonnet-5` | Model for the in-app engine |
| `BRIDGE_TOKEN` | — | If set, bridge API requires `Authorization: Bearer <token>` |

## UI

Light/dark theme (toggle in the top bar, remembered per browser), collapsible icon sidebar, breadcrumbs, ⌘K command palette (pages + projects), toasts on every action, confirm dialogs on every delete, inline story editing (click a card), sortable projects table.

## Known gaps (v2, disclosed)

- Single-user, no auth (by request). Anyone who can reach the port can edit.
- Kanban drag-and-drop is mouse-only; every card has a status `<select>` for keyboard/touch.
- Contracts store mermaid as text; there is no in-app diagram renderer yet (paste into any mermaid viewer).
- No E2E browser test in CI (unit tests + build + Docker build only). Manual E2E done in Chrome on the Mac for both bridge directions.
- Without `ANTHROPIC_API_KEY`, app-typed commands wait until a Cowork session (or scheduled task) checks the queue.

## v2 candidates

Multi-user + roles · repo import to auto-fill File List · in-app mermaid rendering · export a project as the Smart IT delivery package (VISION.md … CODE_SUMMARY.md) · have the skill itself write phase status into this console.
