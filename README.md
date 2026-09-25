<div align="center">

<img src="public/favicon.svg" width="72" alt="AgentITCompany" />

# AgentITCompany

**Run an AI software company from your browser.**<br/>
One idea in → a CEO, a C‑suite, architects, engineers, QA and DevOps hand it down the line → a shipped product out. Watch every step live.

[![CI](https://img.shields.io/github/actions/workflow/status/shivharilokhande/smartit-console/ci.yml?branch=main&label=CI&logo=githubactions&logoColor=white)](https://github.com/shivharilokhande/smartit-console/actions)
[![Last commit](https://img.shields.io/github/last-commit/shivharilokhande/smartit-console?logo=git&logoColor=white)](https://github.com/shivharilokhande/smartit-console/commits/main)
[![Stars](https://img.shields.io/github/stars/shivharilokhande/smartit-console?style=flat&logo=github)](https://github.com/shivharilokhande/smartit-console/stargazers)
[![License](https://img.shields.io/github/license/shivharilokhande/smartit-console)](LICENSE)
<br/>
![Next.js](https://img.shields.io/badge/Next.js-15-000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-20232a?logo=react&logoColor=61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
![Node](https://img.shields.io/badge/Node-%E2%89%A5%2022.13-339933?logo=nodedotjs&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-node%3Asqlite%20(zero%20native%20deps)-003b57?logo=sqlite&logoColor=white)
![Claude](https://img.shields.io/badge/Powered%20by-Claude-d97757?logo=anthropic&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-ready-2496ed?logo=docker&logoColor=white)

[**Quick start**](#-quick-start) · [**How it works**](#-how-the-company-works) · [**Live company runs**](#-live-company-runs) · [**Claude Cowork bridge**](#-claude-cowork-bridge) · [**Modules**](#-whats-inside) · [**API**](#-bridge-api) · [**Docs**](#-documentation)

<img src="docs/demo.gif" alt="A command typed in the Claude tab becomes a live company run — the org chart lights up persona by persona" width="920" />

<sub>▲ one command in → Founder, C‑suite, Architect, Engineers, QA, DevOps each take their step, live</sub>

</div>

---

## ✨ What is this?

AgentITCompany is a self‑hosted **project · product · scrum management console** for software that is built by AI agents instead of (or alongside) humans. It is the visual front‑end of the **Smart IT by Shiv** methodology: an autonomous IT company with **8 phases**, **15 personas** (Founder → CTO/CFO/CPO → Directors → Leads → Engineers) and **10 SOPs** that fix the shape of every hand‑off.

Every project you add runs the same pipeline. Every request you make — a question, an analysis, a plan, code, tests, a deployment — becomes a **company run** that flows from the CEO down to the last engineer and back, and you can watch it happen on the org chart in real time.

> **Used in production.** This console runs real work today: it manages a restaurant POS SaaS (30 stories, 15 sprints, Flutter + Node) and a 12‑agent trading desk — both driven from Claude Cowork on the same machine. The demo project you get on first run is fictional; the workflow is not.

<table>
<tr>
<td width="50%"><img src="docs/screenshots/dashboard.png" alt="Dashboard" /></td>
<td width="50%"><img src="docs/screenshots/how-it-works.png" alt="Org chart — 15 personas in 5 layers" /></td>
</tr>
<tr>
<td align="center"><sub><b>Dashboard</b> — every project, its phase, sprint, gate and LGTM ratio</sub></td>
<td align="center"><sub><b>How the company works</b> — the org chart lights up while personas work</sub></td>
</tr>
<tr>
<td width="50%"><img src="docs/screenshots/scrum.png" alt="Scrum board with parallel lanes" /></td>
<td width="50%"><img src="docs/screenshots/claude.png" alt="Claude tab — chat with the whole company" /></td>
</tr>
<tr>
<td align="center"><sub><b>Scrum</b> — sprints, drag‑and‑drop kanban, <i>parallel lanes</i>, hire capacity, dispatch idle lanes</sub></td>
<td align="center"><sub><b>Claude</b> — talk to the company; every reply is a persona‑attributed company run</sub></td>
</tr>
</table>

---

## 🚀 Quick start

**One line, Docker:**

```bash
git clone https://github.com/shivharilokhande/agentitcompany.git && cd agentitcompany && docker compose up --build
```

**One line, Node ≥ 22.13 (no native builds — SQLite comes from Node itself):**

```bash
git clone https://github.com/shivharilokhande/agentitcompany.git && cd agentitcompany && npm install && npm run dev
```

Open **http://localhost:3100**. Then, to see a full company run in 60 seconds: `zsh data/demo-run.sh`.

<details>
<summary><b>Run it forever on macOS (LaunchAgent)</b></summary>

The console is meant to sit next to Claude Cowork on your Mac. A LaunchAgent keeps it alive across logins:

```bash
cp docs/com.smartit.console.plist ~/Library/LaunchAgents/   # edit the path inside first
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.smartit.console.plist
launchctl kickstart -k gui/$(id -u)/com.smartit.console      # restart any time
```
</details>

A demo project is created on first run so every screen has data. Delete it from the dashboard when you're done — it won't come back (`SEED_DEMO=0` skips it entirely).

---

## 🧭 How to use it — a 5‑minute walkthrough

### Step 1 · Pick who does the thinking (Configuration)

<img src="docs/screenshots/configuration.png" alt="Configuration page — choose Cowork, API key or Ollama" width="920" />

Open **Configuration** in the sidebar. Choose one of the three cards, then **Save engine**. The badge in the top bar (`Engine: …`) changes immediately and every page follows it.

| You chose… | What to do next | Commands run… |
|---|---|---|
| **Claude Cowork bridge** | Nothing else. Keep the Claude desktop app open. | when a Cowork chat says **"check the console"**, or when the `smartit-console-sync` scheduled task polls (every 5 min) |
| **AI API key** | Paste a key under *3 · AI API providers*, pick a model, click **Test connection**, then select that provider in the *Cloud provider* dropdown and Save engine | **automatically, within seconds** |
| **Local Ollama** | `ollama serve`, then click **List models** under *2 · Local Ollama*, pick one, **Test connection**, Save engine | **automatically** — speed depends on the model (7B–14B coder models are the sweet spot; an 80B model on CPU will time out) |

> 💡 **Why did my prompt just say "Waiting for the company to pick this up…"?**
> In Cowork mode the bridge is *pull‑based* — the desktop app has no inbox the console can push into. Either type **"check the console"** in a Cowork chat, wait for the scheduled task, or switch to API/Ollama mode for instant runs.

```mermaid
sequenceDiagram
    autonumber
    actor You
    participant UI as Console · Claude tab
    participant Q as Command queue
    participant CW as Claude Cowork chat
    participant W as Session Watcher
    You->>UI: "any bug?"
    UI->>Q: queued
    Note over Q: Cowork mode = pull. Nothing happens until…
    You->>CW: "check the console"
    CW->>Q: claim next command
    CW->>W: works (audit log) + posts persona steps
    W-->>UI: live: Founder → CTO → BA → Architect → QA → Founder
    CW->>Q: PATCH done + delivery
    UI-->>You: answer in the thread · run page
```

### Step 2 · Add a project

**Dashboard → + New project.** Give it a name, the one‑line idea, and (optionally) the path to its repo on this machine — the repo path is what lets the company read real code. Or, in Cowork, say **"import NamastePOS into the console"** and the `smartit-console-bridge` skill builds the whole bundle from the folder.

### Step 3 · Ask the company anything

Open the project → **Claude** tab. The quick buttons queue the common commands:

| Button | What the company does |
|---|---|
| **Fetch details** | Reads the repo and fills phases, requirements, stories, contracts, ADRs from evidence |
| **Run current phase** | Executes the active phase as its owning personas (Phase 3 → Contract A, Phase 4 → Contracts B + C, Phase 5 → code under SOP‑3/4…) |
| **Plan sprint** | Creates the next 2‑week sprint and plans backlog stories into it with points |
| **Review** | SOP‑4 six‑question review, per file, LGTM/LBTM + notes |
| *free text* | Anything: a question, an analysis, "add offline mode as P0 and plan it", a bug to fix |

Every reply is a **company run**: watch it on the **Pipeline** tab (*Live now* strip + glowing persona on the org chart), in the chat thread, or on the run page (`/projects/:id/runs/:commandId`).

### Step 4 · Run the sprint in parallel

**Scrum** tab → the lanes bar shows `busy / total` lanes (sum of engineer capacity). Click **Dispatch N to idle lanes** and the console assigns To‑Do stories to free engineers and queues one *Build story* command per lane; Claude runs them as concurrent sub‑agents, one persona each. Need more lanes? **Team → Hire** (or say "hire a Flutter engineer" in Cowork).

### Step 5 · Ship

**Quality & Delivery** tab: per‑file LGTM/LBTM log, code summary with `is‑pass`, the 10‑check gate, ADRs, deployment status. When the gate is green, mark Phase 7 → 8 done on the Pipeline tab; the Founder's delivery package is the run result.

<details>
<summary><b>Talking to the console from Cowork — the phrases the skill understands</b></summary>

| Say… | Effect |
|---|---|
| "check the console" | Claim and run every queued command (parallel *Build story* commands run concurrently) |
| "import PROJECT into the console" / "sync PROJECT to the console" | Build a ProjectBundle from the folder and `POST /import` |
| "fetch complete details for PROJECT" | Same, then fill contracts/ADRs from evidence |
| "dispatch" / "build sprint 15" / "run these in parallel" | Dispatch stories to idle lanes and run them |
| "hire a &lt;role&gt; engineer" | `POST /team` — new lane appears on the org chart |
| any project work at all ("what AI features can we add?", "fix the loyalty bug") | Runs as a company run and mirrors live to the console |
</details>

---

## 🏢 How the company works

```mermaid
flowchart LR
    classDef p fill:#eef2ff,stroke:#6366f1,color:#1e1b4b
    classDef g fill:#ecfdf5,stroke:#10b981,color:#064e3b
    I([💡 One-line idea]) --> P1
    subgraph Company["Smart IT by Shiv · 8 phases · 15 personas · 10 SOPs"]
      direction LR
      P1[1 · Vision Lock<br/><sub>Founder</sub>]:::p --> P2[2 · Strategy<br/><sub>CTO · CFO · CPO</sub>]:::p
      P2 --> P3[3 · Specification<br/><sub>BA · Dir. Product · Dir. Design</sub><br/><b>Contract A · PRD</b>]:::p
      P3 --> P4[4 · Architecture<br/><sub>Architect · Dir. Eng</sub><br/><b>Contracts B + C</b>]:::p
      P4 --> P5[5 · Sprint Execution<br/><sub>Scrum Master · Engineers</sub>]:::p
      P5 --> P6[6 · Quality Gate<br/><sub>QA Lead</sub><br/><b>10 checks</b>]:::g
      P6 --> P7[7 · Deployment<br/><sub>DevOps</sub>]:::p
      P7 --> P8[8 · Delivery<br/><sub>Founder · Scrum Master</sub>]:::p
    end
    P8 --> O([📦 Shipped product + delivery package])
```

**The org chart says *who*, the phases say *when*, the SOPs say *what shape every hand‑off must have.***

<details>
<summary><b>The 15 personas</b></summary>

| Layer | Persona | Owns |
|---|---|---|
| Master agent | **Arjun Mehta** · Founder & CEO | Vision lock, final delivery |
| C‑suite | **Vikram Rao** · CTO | Tech stack, ADRs |
| | **Priya Sharma** · CFO | Effort estimate, abort threshold |
| | **Deepa Krishnan** · CPO | User journeys |
| Directors | **Karthik V.** · Director of Engineering | DORA metrics, coding standards |
| | **Rajan Iyer** · Director of Product | Sprint plan, backlog |
| | **Meera Joshi** · Director of Design | Wireframes, UI draft |
| Leads | **Kavitha Nair** · Scrum Master | Sprint execution, dispatch |
| | **Srinivas Iyengar** · Architect | Contract B (system design) |
| | **Ananya Desai** · Business Analyst | Contract A (PRD) |
| Engineers | **Arun Patel** · Backend Senior | Java / Go / Python |
| | **Nikhil Gupta** · Backend Engineer | Platform services |
| | **Rhea Menon** · Frontend Engineer | React / Next.js |
| | **Divya Srinivasan** · QA Lead | 10‑check quality gate |
| | **Rohan Chakraborty** · DevOps | Docker / K8s / CI |

Need more hands? **Team → Hire** adds engineers with their own capacity; the scrum board then runs more lanes in parallel.
</details>

<details>
<summary><b>The 10 SOPs</b></summary>

| SOP | Name | What it enforces |
|---|---|---|
| SOP‑1 | Consistency gate | `File List == Logic Analysis == Task List` before any code is written |
| SOP‑2 | Structured contracts | Contract A (PRD), B (System Design), C (Task Plan) as typed fields, not prose |
| SOP‑3 | Message pool | Every deliverable is *published*; every persona *subscribes* — no side channels |
| SOP‑4 | Per‑file review | Each file gets **LGTM / LBTM**, k = 2 passes max, before it is accepted |
| SOP‑5 | Code summary & is‑pass | Executable feedback: tests run, summary written, `is-pass` YES/NO |
| SOP‑6 | One‑file coding | One engineer, one file, one commit — no sprawling diffs |
| SOP‑7 | Incremental mode | Existing repos get *Code Plan & Change* from git‑diff, not a rewrite |
| SOP‑8 | State file | Phase status is data, persisted, resumable |
| SOP‑9 | Delivery package | VISION → STRATEGY → SPEC → ARCH → TASK_PLAN → CODE_SUMMARY → QUALITY_REPORT |
| SOP‑10 | Abort threshold | CFO sets the sprint cap; the company stops instead of drifting |
</details>

---

## 🔴 Live company runs

Ask the company anything — from the console's Claude tab **or** from Claude Cowork on the same Mac — and a **company run** starts. Each step is attributed to a persona, a phase and a kind of work (`think · analyze · decide · write · design · code · review · test · deploy · deliver`), with expandable detail: reasoning, code, test output.

```mermaid
sequenceDiagram
    autonumber
    actor You
    participant CEO as Arjun · Founder
    participant CS as C-suite
    participant Arch as Srinivas · Architect
    participant SM as Kavitha · Scrum Master
    participant Eng as Engineers (parallel lanes)
    participant QA as Divya · QA
    participant Ops as Rohan · DevOps
    You->>CEO: "What AI features can we add? Plan and build them."
    CEO->>CS: vision lock → strategy
    CS->>Arch: PRD (Contract A)
    Arch->>SM: System design + task plan (Contracts B, C) ✔ consistency gate
    SM->>Eng: dispatch stories to idle lanes
    par lane 1
      Eng->>Eng: code file · LGTM/LBTM · fix
    and lane 2
      Eng->>Eng: code file · LGTM/LBTM · fix
    end
    Eng->>QA: PR + code summary
    QA->>Ops: 10-check gate passed · is-pass = YES
    Ops->>CEO: deployed
    CEO-->>You: delivery + what was deferred
```

Where you see it:

- **Pipeline tab → Live now** — who is working right now, on what, at which phase; the same persona glows on the org chart with a loading ring.
- **Company run page** (`/projects/:id/runs/:commandId`) — phase rail + timeline grouped by phase and persona, live while running, Founder's delivery at the end.
- **Claude tab** — a Cowork‑style chat where every reply is a full company run.

---

## 🔌 Three ways to power the company

Open **Configuration** in the sidebar and pick a bridge. The queue, the personas and the SOPs are identical whichever one you choose; only *who does the thinking* changes.

| Bridge | What runs the personas | Cost | Privacy | Best for |
|---|---|---|---|---|
| **Claude Cowork** *(default)* | Your Claude desktop app, mirrored live by the Session Watcher | Included in your Claude plan | Local logs only | Highest quality; uses Cowork's own tools and files |
| **AI API key** | The console calls the model itself — **Anthropic Claude**, **OpenAI GPT‑5 / Codex**, **Google Gemini**, **OpenRouter** (Qwen Coder, DeepSeek, Kimi, Codestral, Grok Code…), or **any OpenAI‑compatible server** (LM Studio, vLLM, Groq, Together…) | Pay per token | Sent to the provider you pick | Autonomous runs that finish in seconds, no Cowork session needed |
| **Local Ollama** | A model on this machine (`qwen2.5-coder`, `qwen3-coder`, `deepseek-coder`, `llama3.1`, `gpt-oss`…) | Free | Nothing leaves your Mac | Offline, unlimited, private |

The Configuration page has **Test connection** (a real round‑trip) and **List models** (auto‑discovers what Ollama has pulled or what your API key can reach) for every provider. Keys are stored in the console's local SQLite database, masked in the UI, and never sent anywhere except the provider they belong to. Environment variables (`ENGINE_MODE`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL`…) are used as defaults when a field is empty.

```mermaid
flowchart TB
    classDef box fill:#f8fafc,stroke:#94a3b8,color:#0f172a
    classDef hot fill:#eef2ff,stroke:#6366f1,color:#1e1b4b
    Q[(Command queue)]:::hot --> E{Engine<br/><sub>Configuration</sub>}:::hot
    E -- cowork --> CW[Claude Cowork<br/><sub>Session Watcher · skill</sub>]:::box
    E -- api --> A[Anthropic]:::box
    E -- api --> O[OpenAI · Codex<br/><sub>Responses API</sub>]:::box
    E -- api --> G[Gemini]:::box
    E -- api --> R[OpenRouter /<br/>OpenAI‑compatible]:::box
    E -- ollama --> L[Ollama<br/><sub>localhost:11434</sub>]:::box
    CW & A & O & G & R & L --> P[8 phases · 15 personas<br/>LGTM/LBTM · quality gate]:::hot --> UI[Live company run]:::hot
```

### The Claude Cowork bridge in detail

The console and Claude Cowork are linked **both ways** — no API key required.

```mermaid
flowchart LR
    classDef box fill:#f8fafc,stroke:#94a3b8,color:#0f172a
    CW[🖥️ Claude Cowork<br/>desktop app]:::box
    W[👁️ Session Watcher<br/><sub>tails audit.jsonl · ~10 s</sub>]:::box
    SK[🧩 smartit-console-bridge<br/><sub>skill</sub>]:::box
    API[/ /api/bridge/* /]:::box
    DB[(SQLite)]:::box
    UI[🌐 Console UI<br/><sub>runs · org chart · board</sub>]:::box
    ENG[🤖 In-app engine<br/><sub>optional · ANTHROPIC_API_KEY</sub>]:::box

    CW -- writes local audit log --> W --> API
    CW -- "check the console" --> SK <--> API
    UI -- Ask / Fetch / Run phase --> API
    API <--> DB --> UI
    ENG <--> API
```

| Direction | How |
|---|---|
| **Cowork → Console** | The built‑in **Session Watcher** tails Cowork's local session logs, fuzzy‑matches sessions to projects (`"NamastPOS 2"` → *NamastePOS*), and mirrors every assistant message, file write, command, test run and sub‑agent into the project's live run — classified to a persona/phase/step by content. Idle sessions close their run after 30 min. |
| **Console → Cowork** | Type in the Claude tab (*Fetch details*, *Run phase*, *Plan sprint*, *Review files*, *Dispatch*, or free text). Commands queue; in Cowork say **"check the console"** (or let the `smartit-console-sync` scheduled task poll every 5 min) and Claude claims the queue, works with the Smart IT SOPs and streams progress back. |
| **Standalone** | Switch to *AI API key* or *Local Ollama* in Configuration and the console processes its own queue: one model call per phase, personas' steps streamed live. |

---

## 🧭 What's inside

| Module | What you do there |
|---|---|
| **Dashboard** | All projects at a glance: phase progress, active sprint, gate %, LGTM %. Create, open, delete. |
| **How it works** | The interactive org chart, the 8‑phase stepper, the SOP message‑pool diagram, the per‑file coding loop, the 10 quality checks. |
| **Team** | The roster with capacity per persona. **Hire** engineers to add parallel lanes; deactivate or remove them later. |
| **Project → Pipeline** | This project's 8 phases: owners, deliverables, SOPs per phase, mark done / reopen, and the *Live now* strip. |
| **Project → Backlog** | Requirement pool (P0/P1/P2) → product backlog of user stories → plan into sprints. |
| **Project → Contracts** | Contract A (PRD), B (System Design), C (Task Plan) as structured forms with the SOP‑1 consistency gate. |
| **Project → Scrum** | Sprints, drag‑and‑drop kanban (To Do / In Progress / Review / Done), story points, burndown, velocity, **parallel lanes** and **Dispatch to idle lanes**. |
| **Project → Quality & Delivery** | Per‑file LGTM/LBTM log, code summary / is‑pass, 10‑check quality gate, ADRs, deployment status. |
| **Project → Claude** | Chat with the company. Conversation list on the left, persona‑attributed run on the right. |
| **Claude Bridge** | Global view: command queue, live activity across all projects, bridge health. |
| **Configuration** | Pick the engine bridge (Cowork · API key · Ollama), manage provider keys/models/URLs, test connections, discover models. |

Plus: light/dark theme, collapsible sidebar, breadcrumbs, **⌘K** command palette, toasts on every action, confirm dialogs on every delete, inline editing everywhere.

---

## 🔌 Bridge API

Everything the UI does, a script or an agent can do too.

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/bridge/health` | GET | Liveness + version |
| `/api/bridge/projects` | GET | All projects (summary) |
| `/api/bridge/projects/:id` | GET | Full project bundle (phases, stories, sprints, contracts, reviews, gate, ADRs) |
| `/api/bridge/import` | POST | Upsert a `ProjectBundle` (by id → by name; de‑duplicated; `replace` flag) |
| `/api/bridge/commands` | GET / POST | List or enqueue commands |
| `/api/bridge/commands/:id` | GET / PATCH | Claim, progress, finish a command |
| `/api/bridge/activity` | GET / POST | Live feed (filter by project / command / `sinceSeq`) |
| `/api/bridge/team` | GET | Roster, capacity, lanes |
| `/api/bridge/providers` | GET / POST | Engine config (masked) · `{action:"test"\|"models", provider}` |
| `/api/bridge/snapshot` | GET | Repo snapshot for a project (`repo_path`) |
| `/api/bridge/tick` | POST | Run one engine / watcher cycle now |

Set `BRIDGE_TOKEN` to require `Authorization: Bearer <token>`. `zsh data/demo-run.sh` imports the bundled demo project (`data/demo.bundle.json`) and replays a full persona‑attributed company run you can watch live. Put your own project exports in `data/private/` — it's git‑ignored.

---

## ⚙️ Configuration

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `3100` | HTTP port |
| `DATA_DIR` | `./data` | Where `smartit.db` lives (`:memory:` in tests) |
| `SEED_DEMO` | `1` | Create the demo project on first run (once per database) |
| `COWORK_WATCHER` | `1` | Tail Claude Cowork session logs |
| `COWORK_SESSIONS_DIR` | `~/Library/Application Support/Claude/local-agent-mode-sessions` | Where those logs are |
| `COWORK_WATCH_INTERVAL_MS` | `10000` | Watcher poll interval |
| `ENGINE_MODE` | `cowork` | Initial bridge: `cowork` · `api` · `ollama` (the Configuration page overrides it) |
| `ANTHROPIC_API_KEY` / `CLAUDE_MODEL` | — / `claude-sonnet-5` | Anthropic defaults |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | — / `gpt-5-codex` | OpenAI / Codex defaults (Responses API) |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | — / `gemini-2.5-pro` | Google Gemini defaults |
| `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` | — / `qwen/qwen3-coder` | OpenRouter defaults |
| `CUSTOM_LLM_BASE_URL` / `CUSTOM_LLM_API_KEY` / `CUSTOM_LLM_MODEL` | — | Any OpenAI‑compatible server |
| `OLLAMA_BASE_URL` / `OLLAMA_MODEL` | `http://localhost:11434` / `qwen2.5-coder:14b` | Local Ollama defaults |
| `LLM_TIMEOUT_MS` | `180000` | Per‑call timeout (large local models load slowly on first use) |
| `BRIDGE_TOKEN` | — | Protect the bridge API |

---

## 🏗️ Architecture

```
src/
├─ app/            Next.js 15 App Router · Server Components · /api/bridge/* routes
├─ components/     AppShell · PipelineView · OrgChart (live) · RunView · ChatPanel · KanbanBoard · Charts (hand-rolled SVG)
└─ lib/
   ├─ pipeline.ts  The methodology as data: PERSONAS · PHASES · SOPS · CONTRACTS · GATE
   ├─ db.ts        node:sqlite wrapper · savepoint-nested transactions · additive migrations
   ├─ repo.ts      All SQL, typed
   ├─ actions.ts   Server Actions (every mutation)
   ├─ bridge.ts    Command queue · activity feed · ProjectBundle import/export
   ├─ cowork.ts    Session Watcher · fuzzy project match · persona classifier
   ├─ settings.ts  Engine mode + provider config (SQLite, env fallbacks, masking)
   ├─ llm.ts       One chat() over Anthropic · OpenAI Responses · Gemini · OpenAI-compatible · Ollama
   ├─ claude.ts    In-app engine (one model call per phase, personas' steps streamed)
   ├─ team.ts      Roster · capacity · lanes
   └─ dispatch.ts  Assign stories to idle lanes
tests/unit/        Vitest · 28 tests
```

Design principles: **methodology is data** (change the company without touching UI), **zero native dependencies** (`node:sqlite`, no build step), **local‑first** (your projects never leave your machine unless you add an API key), **everything is a command** (UI, Cowork and API all enqueue the same thing).

```bash
npm run typecheck   # tsc --noEmit
npm test            # vitest
npm run build       # standalone output, used by the Dockerfile
```

---

## 📚 Documentation

This repository was itself built by the Smart IT company, so it ships its own delivery package:

[VISION](VISION.md) · [STRATEGY](STRATEGY.md) · [SPECIFICATION — Contract A](SPECIFICATION.md) · [ARCHITECTURE — Contract B](ARCHITECTURE.md) · [TASK_PLAN — Contract C](TASK_PLAN.md) · [CODE_SUMMARY](CODE_SUMMARY.md) · [QUALITY_REPORT](QUALITY_REPORT.md) · [SPRINT_REPORT](SPRINT_REPORT.md) · [DEPLOYMENT](DEPLOYMENT.md) · [ADRs](docs/adrs)

---

## 🗺️ Roadmap

- [x] 8‑phase pipeline, 15 personas, 10 SOPs, 10‑check quality gate
- [x] Scrum: sprints, kanban, burndown, velocity, parallel lanes, hiring, dispatch
- [x] Two‑way Claude Cowork bridge (Session Watcher + skill + scheduled task)
- [x] Live company runs with org‑chart highlighting
- [x] Three engine bridges: Claude Cowork · AI API keys (Anthropic, OpenAI/Codex, Gemini, OpenRouter, OpenAI‑compatible) · local Ollama
- [ ] In‑app Mermaid rendering for Contracts B/C diagrams
- [ ] Repo import → auto‑fill Contract B *File List*
- [ ] Export a project as its Smart IT delivery package (zip)
- [ ] Multi‑user with roles
- [ ] Playwright E2E in CI

## 🤝 Contributing

Issues and PRs are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). Good places to start are the [`good first issue`](https://github.com/shivharilokhande/agentitcompany/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) list and adding an LLM provider (usually a config‑only change). Questions and ideas go in [Discussions](https://github.com/shivharilokhande/agentitcompany/discussions).

If this is useful to you, a ⭐ helps other people find it.

## 📄 License

[MIT](LICENSE) © 2026 Shivhari Lokhande

<div align="center">
<sub>Built with the <b>Smart IT by Shiv</b> skill for Claude</sub>
</div>
