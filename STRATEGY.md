# STRATEGY

## CTO — Tech stack (product-type-decision-tree: "internal web tool, CRUD-heavy, single user, must self-host trivially")
- **Framework:** Next.js 15 (App Router, Server Actions) + TypeScript. One process serves UI and data.
- **Persistence:** SQLite via Node built-in `node:sqlite` (Node ≥ 22.13, zero native deps), file at `./data/smartit.db`. Zero external services. Migrations = idempotent DDL in `schema.sql`.
- **Styling:** Tailwind CSS 3. **Charts:** hand-rolled SVG (no chart dependency).
- **Testing:** Vitest for data layer + metrics. **Deploy:** Docker multi-stage, `docker-compose.yml` with a volume for `./data`.
- **Build-vs-buy:** no ORM (Prisma 7 requires driver adapters; overkill for ~12 tables). Typed repository layer instead.
- **Security posture:** single-user local tool; no auth in v1; all mutations via server actions with input validation.

## CFO — Budget
- 3 sprints × ~25 pts. Warning at 3, abort at 5.
- Sprint 1: foundation + projects + pipeline visualizer. Sprint 2: backlog/contracts + scrum board. Sprint 3: quality module + polish + docs.

## CPO — MVP scope
- P0: projects, pipeline view with phase status, backlog + Contract A/B/C forms + consistency gate, sprints + kanban + points, velocity/burndown, review log + quality gate + ADRs.
- P1: "How it works" static company visual (org chart + SOP flow).
- P2: seed/demo project on first run (kept — cheap and makes the visual meaningful immediately).
