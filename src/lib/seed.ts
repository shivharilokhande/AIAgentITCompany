// src/lib/seed.ts
// Creates one demo project on first run so the visualizer has something to show. Idempotent.
import * as repo from "./repo";
import { getDb } from "./db";

const DEMO_NAME = "Demo: Kanban Task App";

export function ensureDemoProject(): void {
  if (process.env.SEED_DEMO === "0") return;
  if (repo.listProjects().some((p) => p.name === DEMO_NAME)) return;

  const p = repo.createProject({ name: DEMO_NAME, idea: "Build me a task management app with Kanban boards" });
  const pid = p.id;

  repo.setPhase(pid, 1, "done", "3 must-haves (boards, cards, drag-drop), 2 v2 items (comments, attachments)");
  repo.setPhase(pid, 2, "done", "Next.js + Postgres, 3 sprints / 70 pts, CFO abort at 5 sprints");
  repo.setPhase(pid, 3, "done", "Contract A filled: 5 user stories, 6 requirements in pool");
  repo.setPhase(pid, 4, "done", "Contract B: 14 files, 5 entities. Contract C: task order set. Gate ✓");
  repo.setPhaseSummary(pid, 5, "Sprint 2/3 in progress");

  for (const [prio, text] of [
    ["P0", "Create boards with named columns"],
    ["P0", "Create, edit, delete cards"],
    ["P0", "Drag cards between columns"],
    ["P1", "Assign a card to a person"],
    ["P1", "Due dates with overdue highlighting"],
    ["P2", "Card comments and attachments"],
  ] as const) repo.addRequirement(pid, prio, text);

  repo.saveContract(pid, "A", {
    language: "en_us",
    programming_language: "TypeScript — Next.js 15, Postgres",
    original_requirements: "Build me a task management app with Kanban boards",
    project_name: "kanban_task_app",
    product_goals: "Fast board and card management\nZero-friction drag-and-drop\nWorks well on a laptop screen",
    user_stories: "As a user, I want to create a board so that I can organize a project\nAs a user, I want to drag cards between columns so that status is one gesture\nAs a user, I want to assign a card so that ownership is clear",
    competitive_analysis: "Trello: simple, no sprints\nLinear: fast, opinionated\nJira: powerful, heavy\nNotion: flexible, unstructured\nPlane: self-hosted, young",
    competitive_quadrant: "quadrantChart\n  title Simplicity vs Power\n  x-axis Simple --> Powerful\n  y-axis Slow --> Fast\n  \"Trello\": [0.2,0.6]\n  \"Jira\": [0.9,0.3]\n  \"Linear\": [0.6,0.9]\n  \"Our Target Product\": [0.4,0.85]",
    requirement_analysis: "Hard part is optimistic drag-and-drop with server persistence; everything else is CRUD.",
    requirement_pool: "P0 boards\nP0 cards CRUD\nP0 drag-drop\nP1 assignees\nP1 due dates\nP2 comments",
    ui_design_draft: "Board page: horizontal columns, cards with title/assignee/due badge. Sidebar lists boards.",
    anything_unclear: "Auth? → assume single workspace, no auth in v1.",
  });
  repo.saveContract(pid, "B", {
    implementation_approach: "Next.js App Router with server actions; Postgres via node-postgres; native HTML5 DnD.",
    file_list: "src/lib/db.ts\nsrc/lib/repo.ts\nsrc/lib/actions.ts\nsrc/app/page.tsx\nsrc/app/boards/[id]/page.tsx\nsrc/components/Board.tsx\nsrc/components/Card.tsx",
    data_structures: "classDiagram\n  class Board { +id +name }\n  class Column { +id +boardId +name +order }\n  class Card { +id +columnId +title +assignee +dueDate +order }\n  Board *-- Column\n  Column *-- Card",
    call_flow: "sequenceDiagram\n  User->>Board.tsx: drop card\n  Board.tsx->>actions.ts: moveCard()\n  actions.ts->>repo.ts: updateCard(columnId, order)\n  repo.ts->>Postgres: UPDATE cards",
    anything_unclear: "None.",
  });
  repo.saveContract(pid, "C", {
    required_packages: "next@15.5.25\nreact@19.1.1\npg@8.13.1",
    other_language_packages: "None",
    logic_analysis: "src/lib/db.ts — pg pool\nsrc/lib/repo.ts — Board/Column/Card CRUD\nsrc/lib/actions.ts — server actions\nsrc/app/page.tsx — board list\nsrc/app/boards/[id]/page.tsx — board page\nsrc/components/Board.tsx — columns + DnD\nsrc/components/Card.tsx — card view",
    task_list: "src/lib/db.ts\nsrc/lib/repo.ts\nsrc/lib/actions.ts\nsrc/components/Card.tsx\nsrc/components/Board.tsx\nsrc/app/boards/[id]/page.tsx\nsrc/app/page.tsx",
    api_spec: "N/A — server actions only",
    shared_knowledge: "IDs are UUIDs. Order is a float for cheap reordering. Dates ISO.",
    anything_unclear: "None.",
  });

  const d = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
  const s1 = repo.createSprint(pid, { goal: "Foundation: DB, repo, board list", startDate: d(-28), endDate: d(-15) });
  const s2 = repo.createSprint(pid, { goal: "Board page with drag-and-drop", startDate: d(-7), endDate: d(6) });
  repo.createSprint(pid, { goal: "Assignees, due dates, polish", startDate: d(7), endDate: d(20) });
  repo.updateSprint(s1.id, { status: "closed" });
  repo.updateSprint(s2.id, { status: "active" });

  const done = (sprintId: string, title: string, points: number, assignee: string, daysAgo: number) => {
    const st = repo.createStory(pid, { title, points, sprintId, assignee, status: "done" });
    // backdate done_at for a believable burndown
    repo.updateStory(st.id, { status: "review" });
    repo.updateStory(st.id, { status: "done" });
    getDb().prepare("UPDATE stories SET done_at=? WHERE id=?").run(new Date(Date.now() - daysAgo * 86_400_000).toISOString(), st.id);
  };
  done(s1.id, "DB schema + pg pool", 5, "Arun", 25);
  done(s1.id, "Repo layer with tests", 8, "Nikhil", 21);
  done(s1.id, "Board list page", 5, "Rhea", 17);
  done(s1.id, "Create board form", 3, "Rhea", 16);
  done(s2.id, "Column rendering", 5, "Rhea", 5);
  done(s2.id, "Card CRUD actions", 5, "Nikhil", 3);
  repo.createStory(pid, { title: "Drag-and-drop between columns", points: 8, sprintId: s2.id, assignee: "Rhea", status: "in_progress" });
  repo.createStory(pid, { title: "Card reorder within column", points: 3, sprintId: s2.id, assignee: "Rhea", status: "review" });
  repo.createStory(pid, { title: "E2E: create board → move card", points: 3, sprintId: s2.id, assignee: "Divya", status: "todo" });
  repo.createStory(pid, { title: "Assignee picker", points: 5, sprintId: null, assignee: "", status: "todo" });
  repo.createStory(pid, { title: "Due date + overdue badge", points: 5, sprintId: null, assignee: "", status: "todo" });

  repo.addReview(pid, { file: "src/lib/db.ts", verdict: "LGTM", pass: 1 });
  repo.addReview(pid, { file: "src/lib/repo.ts", verdict: "LBTM", pass: 1, notes: "Q4: deleteCard not implemented; Q5: missing import of Pool" });
  repo.addReview(pid, { file: "src/lib/repo.ts", verdict: "LGTM", pass: 2 });
  repo.addReview(pid, { file: "src/lib/actions.ts", verdict: "LGTM", pass: 1 });
  repo.addReview(pid, { file: "src/components/Card.tsx", verdict: "LGTM", pass: 1 });
  repo.addReview(pid, { file: "src/components/Board.tsx", verdict: "LBTM", pass: 1, notes: "Q3: uses Column.cards which is not in classDiagram" });

  repo.setGateCheck(pid, 1, "pass", "All sprint-1 files LGTM");
  repo.setGateCheck(pid, 2, "pass", "31 tests green");
  repo.setGateCheck(pid, 5, "pass", "npm audit clean");
  repo.setGateCheck(pid, 4, "fail", "is-pass = NO (Board.tsx design drift)");

  repo.addAdr(pid, "ADR-001 Postgres over SQLite", "Multi-device access expected in v2; Postgres from day one avoids a migration.");
  repo.addAdr(pid, "ADR-002 Native HTML5 DnD", "No DnD library; select fallback for keyboard/touch.");

  repo.saveSummary(pid, { isPass: "NO", todos: '{ "src/components/Board.tsx": "align with classDiagram — Column has no cards member; fetch via repo" }', cycles: 1 });
}
