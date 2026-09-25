# TASK_PLAN — Contract C

## Required Packages (pinned)
next@15.5.x, react@19.1.x, react-dom@19.1.x, tailwindcss@^3.4, postcss@^8, autoprefixer@^10, typescript@^5.6, @types/react, @types/react-dom, @types/node, vitest@^3, tsx (dev). Exact versions locked in package.json / package-lock.json.

## Required Other-Language Packages
None (Node ≥ 22.13 only; no native modules).

## Logic Analysis
| File | Contains | Depends on |
|---|---|---|
| src/lib/schema.sql | DDL for projects, phase_state, requirements, stories, sprints, contracts, file_reviews, gate_checks, adrs, code_summary | — |
| src/lib/db.ts | `Db` wrapper over node:sqlite `DatabaseSync`, `getDb()` singleton, runs schema.sql, `DATA_DIR` env | node:sqlite, schema.sql |
| src/lib/types.ts | all domain types from Contract B | — |
| src/lib/pipeline.ts | `PIPELINE: PipelineDef` — 8 phases, 15 personas, 10 SOPs, pool rules, 10 gate checks | types |
| src/lib/repo.ts | Repo functions (Contract B `Repo`) | db, types |
| src/lib/metrics.ts | velocity, burndown, gateScore, lgtmRatio, consistencyGate, phaseProgress | types |
| src/lib/seed.ts | `ensureDemoProject()` creates "Demo: Kanban Task App" once | repo |
| src/lib/actions.ts | 'use server' actions (Contract B `Actions`) | repo, next/cache, next/navigation |
| src/components/ui.tsx | Card, Badge, Button, Input, Tabs helpers | — |
| src/components/Sidebar.tsx | nav + project list | repo |
| src/components/PipelineView.tsx | client stepper; selected phase detail; mark-complete form | pipeline, types, actions |
| src/components/OrgChart.tsx | SVG org chart of 15 personas | pipeline |
| src/components/MessagePool.tsx | pool rule table + SOP list | pipeline |
| src/components/BacklogPanel.tsx | requirement pool table + user story list + add forms | actions, types |
| src/components/ContractForm.tsx | client form for a contract kind; fields from pipeline.CONTRACTS | actions, pipeline |
| src/components/SprintPanel.tsx | sprint list/create/activate | actions, types |
| src/components/KanbanBoard.tsx | client 4-column DnD board | actions, types |
| src/components/Charts.tsx | `<Burndown/>`, `<Velocity/>` SVG | metrics |
| src/components/ReviewLog.tsx | file review table + add form | actions |
| src/components/QualityGate.tsx | 10 checks with pass/fail | actions, pipeline |
| src/components/AdrList.tsx | ADR list + add | actions |
| src/app/** | routes composing the above | repo, metrics, components |
| tests/unit/*.ts | metrics + repo (temp db) | metrics, repo |

## Task List (dependency order)
1 schema.sql · 2 types.ts · 3 db.ts · 4 pipeline.ts · 5 repo.ts · 6 metrics.ts · 7 seed.ts · 8 actions.ts · 9 ui.tsx · 10 Sidebar · 11 OrgChart · 12 MessagePool · 13 PipelineView · 14 BacklogPanel · 15 ContractForm · 16 SprintPanel · 17 KanbanBoard · 18 Charts · 19 ReviewLog · 20 QualityGate · 21 AdrList · 22 globals.css/layout · 23 pages · 24 tests · 25 Dockerfile/compose/CI

## Full API Spec
N/A — no FE↔BE HTTP boundary; all mutations are Next.js Server Actions (same process). 

## Shared Knowledge
- IDs: `crypto.randomUUID()`. Timestamps: ISO 8601 strings (UTC). 
- Story statuses: `todo | in_progress | review | done` (kanban column order). Setting `done` sets `doneAt`; leaving `done` clears it.
- Phase statuses: `pending | active | done`; exactly one phase `active` unless all done. Phase 1 is active at project creation.
- Contracts stored as JSON `fields` keyed by field name from `pipeline.CONTRACTS[kind]`.
- Gate checks 1–10 mirror `qa.md`: TDD, Unit+Integration, E2E, Verification loop, Security, Performance, Accessibility, Silent failures, Coverage quality, Framework verify.
- DB path: `process.env.DATA_DIR ?? './data'` + `/smartit.db`. Tests use `DATA_DIR=:memory:` (handled in db.ts).
- All server actions take `FormData`; `revalidatePath('/projects/' + pid, 'layout')` after each write.

## Anything UNCLEAR
Nothing open.
