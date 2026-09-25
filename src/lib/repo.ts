// src/lib/repo.ts
// Typed data-access layer over SQLite. All SQL lives here (ADR-001).
import { getDb, nowIso, uid } from "./db";
import type {
  Project, PhaseState, Requirement, Sprint, UserStory, Contract, FileReview, GateCheck, Adr, CodeSummary,
  PhaseStatus, StoryStatus, Priority, ContractKind, Verdict, GateStatus, IsPass, SprintStatus, DeployStatus,
} from "./types";

const PHASE_COUNT = 8;
const GATE_COUNT = 10;

/* ---------- row mappers ---------- */
type Row = Record<string, unknown>;
const s = (v: unknown): string => (v == null ? "" : String(v));
const n = (v: unknown): number => Number(v ?? 0);
const ns = (v: unknown): string | null => (v == null ? null : String(v));

const mapProject = (r: Row): Project => ({
  id: s(r.id), name: s(r.name), slug: s(r.slug), idea: s(r.idea), currentPhase: n(r.current_phase),
  mode: (s(r.mode) as Project["mode"]) || "greenfield", deployStatus: (s(r.deploy_status) as DeployStatus) || "not_deployed", createdAt: s(r.created_at),
  repoPath: s(r.repo_path), source: (s(r.source) as Project["source"]) || "manual", lastSyncedAt: ns(r.last_synced_at), tags: s(r.tags), owner: s(r.owner),
});
const mapPhase = (r: Row): PhaseState => ({ projectId: s(r.project_id), phase: n(r.phase), status: s(r.status) as PhaseStatus, summary: s(r.summary), completedAt: ns(r.completed_at) });
const mapReq = (r: Row): Requirement => ({ id: s(r.id), projectId: s(r.project_id), priority: s(r.priority) as Priority, text: s(r.text), order: n(r.ord) });
const mapSprint = (r: Row): Sprint => ({ id: s(r.id), projectId: s(r.project_id), number: n(r.number), goal: s(r.goal), startDate: s(r.start_date), endDate: s(r.end_date), status: s(r.status) as SprintStatus });
const mapStory = (r: Row): UserStory => ({
  id: s(r.id), projectId: s(r.project_id), sprintId: ns(r.sprint_id), title: s(r.title), description: s(r.description), points: n(r.points),
  status: s(r.status) as StoryStatus, assignee: s(r.assignee), order: n(r.ord), doneAt: ns(r.done_at), createdAt: s(r.created_at),
});
const mapContract = (r: Row): Contract => {
  let fields: Record<string, string> = {};
  try { fields = JSON.parse(s(r.fields) || "{}"); } catch { fields = {}; }
  return { projectId: s(r.project_id), kind: s(r.kind) as ContractKind, fields, updatedAt: s(r.updated_at) };
};
const mapReview = (r: Row): FileReview => ({ id: s(r.id), projectId: s(r.project_id), file: s(r.file), verdict: s(r.verdict) as Verdict, pass: n(r.pass), notes: s(r.notes), createdAt: s(r.created_at) });
const mapGate = (r: Row): GateCheck => ({ projectId: s(r.project_id), check: n(r.chk), status: s(r.status) as GateStatus, note: s(r.note) });
const mapAdr = (r: Row): Adr => ({ id: s(r.id), projectId: s(r.project_id), title: s(r.title), decision: s(r.decision), createdAt: s(r.created_at) });
const mapSummary = (r: Row): CodeSummary => ({ projectId: s(r.project_id), isPass: s(r.is_pass) as IsPass, todos: s(r.todos), cycles: n(r.cycles) });

export const slugify = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "project";

/* ---------- projects ---------- */
export function listProjects(): Project[] {
  return (getDb().prepare("SELECT * FROM projects ORDER BY created_at DESC").all() as Row[]).map(mapProject);
}
export function getProject(id: string): Project | null {
  const r = getDb().prepare("SELECT * FROM projects WHERE id = ?").get(id) as Row | undefined;
  return r ? mapProject(r) : null;
}
export function getProjectByName(name: string): Project | null {
  const r = getDb().prepare("SELECT * FROM projects WHERE lower(name) = lower(?)").get(name.trim()) as Row | undefined;
  return r ? mapProject(r) : null;
}
export function createProject(input: { name: string; idea: string; mode?: Project["mode"]; repoPath?: string; source?: Project["source"] }): Project {
  const db = getDb();
  const id = uid();
  const created = nowIso();
  const tx = db.transaction(() => {
    db.prepare("INSERT INTO projects (id, name, slug, idea, current_phase, mode, deploy_status, created_at, repo_path, source) VALUES (?,?,?,?,1,?,'not_deployed',?,?,?)")
      .run(id, input.name.trim(), slugify(input.name), input.idea.trim(), input.mode ?? "greenfield", created, input.repoPath ?? "", input.source ?? "manual");
    const ph = db.prepare("INSERT INTO phase_state (project_id, phase, status, summary) VALUES (?,?,?,'')");
    for (let p = 1; p <= PHASE_COUNT; p++) ph.run(id, p, p === 1 ? "active" : "pending");
    const gc = db.prepare("INSERT INTO gate_checks (project_id, chk, status, note) VALUES (?,?,'pending','')");
    for (let c = 1; c <= GATE_COUNT; c++) gc.run(id, c);
    db.prepare("INSERT INTO code_summary (project_id, is_pass, todos, cycles) VALUES (?,'pending','',0)").run(id);
    const ct = db.prepare("INSERT INTO contracts (project_id, kind, fields, updated_at) VALUES (?,?,'{}',?)");
    for (const k of ["A", "B", "C"]) ct.run(id, k, created);
  });
  tx();
  return getProject(id)!;
}
export function updateProject(id: string, patch: Partial<Pick<Project, "name" | "idea" | "mode" | "deployStatus" | "currentPhase" | "repoPath" | "source" | "lastSyncedAt" | "tags" | "owner">>): void {
  const db = getDb();
  if (patch.repoPath !== undefined) db.prepare("UPDATE projects SET repo_path = ? WHERE id = ?").run(patch.repoPath, id);
  if (patch.source !== undefined) db.prepare("UPDATE projects SET source = ? WHERE id = ?").run(patch.source, id);
  if (patch.lastSyncedAt !== undefined) db.prepare("UPDATE projects SET last_synced_at = ? WHERE id = ?").run(patch.lastSyncedAt, id);
  if (patch.tags !== undefined) db.prepare("UPDATE projects SET tags = ? WHERE id = ?").run(patch.tags, id);
  if (patch.owner !== undefined) db.prepare("UPDATE projects SET owner = ? WHERE id = ?").run(patch.owner, id);
  if (patch.name !== undefined) db.prepare("UPDATE projects SET name = ?, slug = ? WHERE id = ?").run(patch.name, slugify(patch.name), id);
  if (patch.idea !== undefined) db.prepare("UPDATE projects SET idea = ? WHERE id = ?").run(patch.idea, id);
  if (patch.mode !== undefined) db.prepare("UPDATE projects SET mode = ? WHERE id = ?").run(patch.mode, id);
  if (patch.deployStatus !== undefined) db.prepare("UPDATE projects SET deploy_status = ? WHERE id = ?").run(patch.deployStatus, id);
  if (patch.currentPhase !== undefined) db.prepare("UPDATE projects SET current_phase = ? WHERE id = ?").run(patch.currentPhase, id);
}
export function deleteProject(id: string): void {
  const db = getDb();
  const tx = db.transaction(() => {
    for (const t of ["phase_state", "requirements", "sprints", "stories", "contracts", "file_reviews", "gate_checks", "adrs", "code_summary", "commands", "activity"])
      db.prepare(`DELETE FROM ${t} WHERE project_id = ?`).run(id);
    db.prepare("DELETE FROM projects WHERE id = ?").run(id);
  });
  tx();
}

/* ---------- phases ---------- */
export function getPhases(projectId: string): PhaseState[] {
  return (getDb().prepare("SELECT * FROM phase_state WHERE project_id = ? ORDER BY phase").all(projectId) as Row[]).map(mapPhase);
}
/** Mark a phase done (activating the next) or reopen it (making it active, later phases pending). */
export function setPhase(projectId: string, phase: number, status: PhaseStatus, summary?: string): void {
  const db = getDb();
  const tx = db.transaction(() => {
    if (status === "done") {
      db.prepare("UPDATE phase_state SET status='done', completed_at=?, summary=COALESCE(?, summary) WHERE project_id=? AND phase=?").run(nowIso(), summary ?? null, projectId, phase);
      // everything before is done too
      db.prepare("UPDATE phase_state SET status='done', completed_at=COALESCE(completed_at, ?) WHERE project_id=? AND phase<?").run(nowIso(), projectId, phase);
      if (phase < PHASE_COUNT) {
        db.prepare("UPDATE phase_state SET status='active', completed_at=NULL WHERE project_id=? AND phase=?").run(projectId, phase + 1);
        db.prepare("UPDATE phase_state SET status='pending', completed_at=NULL WHERE project_id=? AND phase>?").run(projectId, phase + 1);
        db.prepare("UPDATE projects SET current_phase=? WHERE id=?").run(phase + 1, projectId);
      } else {
        db.prepare("UPDATE projects SET current_phase=8 WHERE id=?").run(projectId);
      }
    } else if (status === "active") {
      db.prepare("UPDATE phase_state SET status='active', completed_at=NULL, summary=COALESCE(?, summary) WHERE project_id=? AND phase=?").run(summary ?? null, projectId, phase);
      db.prepare("UPDATE phase_state SET status='pending', completed_at=NULL WHERE project_id=? AND phase>?").run(projectId, phase);
      db.prepare("UPDATE phase_state SET status='done' WHERE project_id=? AND phase<?").run(projectId, phase);
      db.prepare("UPDATE projects SET current_phase=? WHERE id=?").run(phase, projectId);
    } else {
      db.prepare("UPDATE phase_state SET status='pending', completed_at=NULL WHERE project_id=? AND phase=?").run(projectId, phase);
    }
  });
  tx();
}
export function setPhaseSummary(projectId: string, phase: number, summary: string): void {
  getDb().prepare("UPDATE phase_state SET summary=? WHERE project_id=? AND phase=?").run(summary, projectId, phase);
}

/* ---------- requirements ---------- */
export function listRequirements(projectId: string): Requirement[] {
  return (getDb().prepare("SELECT * FROM requirements WHERE project_id=? ORDER BY CASE priority WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 ELSE 2 END, ord").all(projectId) as Row[]).map(mapReq);
}
export function addRequirement(projectId: string, priority: Priority, text: string): Requirement {
  const db = getDb();
  const id = uid();
  const max = (db.prepare("SELECT COALESCE(MAX(ord),0) AS m FROM requirements WHERE project_id=?").get(projectId) as Row).m;
  db.prepare("INSERT INTO requirements (id, project_id, priority, text, ord) VALUES (?,?,?,?,?)").run(id, projectId, priority, text.trim(), n(max) + 1);
  return mapReq(db.prepare("SELECT * FROM requirements WHERE id=?").get(id) as Row);
}
export function updateRequirement(id: string, patch: { priority?: Priority; text?: string }): void {
  const db = getDb();
  if (patch.priority) db.prepare("UPDATE requirements SET priority=? WHERE id=?").run(patch.priority, id);
  if (patch.text !== undefined) db.prepare("UPDATE requirements SET text=? WHERE id=?").run(patch.text, id);
}
export function deleteRequirement(id: string): void {
  getDb().prepare("DELETE FROM requirements WHERE id=?").run(id);
}

/* ---------- sprints ---------- */
export function listSprints(projectId: string): Sprint[] {
  return (getDb().prepare("SELECT * FROM sprints WHERE project_id=? ORDER BY number").all(projectId) as Row[]).map(mapSprint);
}
export function getSprint(id: string): Sprint | null {
  const r = getDb().prepare("SELECT * FROM sprints WHERE id=?").get(id) as Row | undefined;
  return r ? mapSprint(r) : null;
}
export function createSprint(projectId: string, input: { goal: string; startDate: string; endDate: string; number?: number }): Sprint {
  const db = getDb();
  const id = uid();
  const max = n((db.prepare("SELECT COALESCE(MAX(number),0) AS m FROM sprints WHERE project_id=?").get(projectId) as Row).m);
  const number = input.number && input.number > 0 ? input.number : max + 1;
  db.prepare("INSERT INTO sprints (id, project_id, number, goal, start_date, end_date, status) VALUES (?,?,?,?,?,?,'planned')")
    .run(id, projectId, number, input.goal.trim(), input.startDate, input.endDate);
  return getSprint(id)!;
}
export function updateSprint(id: string, patch: Partial<Pick<Sprint, "goal" | "startDate" | "endDate" | "status">>): void {
  const db = getDb();
  const sp = getSprint(id);
  if (!sp) return;
  const tx = db.transaction(() => {
    if (patch.status === "active") {
      // only one active sprint per project
      db.prepare("UPDATE sprints SET status='planned' WHERE project_id=? AND status='active'").run(sp.projectId);
    }
    if (patch.goal !== undefined) db.prepare("UPDATE sprints SET goal=? WHERE id=?").run(patch.goal, id);
    if (patch.startDate !== undefined) db.prepare("UPDATE sprints SET start_date=? WHERE id=?").run(patch.startDate, id);
    if (patch.endDate !== undefined) db.prepare("UPDATE sprints SET end_date=? WHERE id=?").run(patch.endDate, id);
    if (patch.status !== undefined) db.prepare("UPDATE sprints SET status=? WHERE id=?").run(patch.status, id);
  });
  tx();
}
export function deleteSprint(id: string): void {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare("UPDATE stories SET sprint_id=NULL WHERE sprint_id=?").run(id);
    db.prepare("DELETE FROM sprints WHERE id=?").run(id);
  });
  tx();
}

/* ---------- stories ---------- */
export function listStories(projectId: string): UserStory[] {
  return (getDb().prepare("SELECT * FROM stories WHERE project_id=? ORDER BY ord, created_at").all(projectId) as Row[]).map(mapStory);
}
export function getStory(id: string): UserStory | null {
  const r = getDb().prepare("SELECT * FROM stories WHERE id=?").get(id) as Row | undefined;
  return r ? mapStory(r) : null;
}
export function createStory(projectId: string, input: { title: string; description?: string; points?: number; sprintId?: string | null; assignee?: string; status?: StoryStatus }): UserStory {
  const db = getDb();
  const id = uid();
  const max = n((db.prepare("SELECT COALESCE(MAX(ord),0) AS m FROM stories WHERE project_id=?").get(projectId) as Row).m);
  const status = input.status ?? "todo";
  db.prepare("INSERT INTO stories (id, project_id, sprint_id, title, description, points, status, assignee, ord, done_at, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
    .run(id, projectId, input.sprintId ?? null, input.title.trim(), input.description ?? "", Math.max(0, Math.floor(input.points ?? 1)), status, input.assignee ?? "", max + 1, status === "done" ? nowIso() : null, nowIso());
  return getStory(id)!;
}
export function updateStory(id: string, patch: Partial<Pick<UserStory, "title" | "description" | "points" | "status" | "assignee" | "sprintId">>): void {
  const db = getDb();
  const cur = getStory(id);
  if (!cur) return;
  const tx = db.transaction(() => {
    if (patch.title !== undefined) db.prepare("UPDATE stories SET title=? WHERE id=?").run(patch.title, id);
    if (patch.description !== undefined) db.prepare("UPDATE stories SET description=? WHERE id=?").run(patch.description, id);
    if (patch.points !== undefined) db.prepare("UPDATE stories SET points=? WHERE id=?").run(Math.max(0, Math.floor(patch.points)), id);
    if (patch.assignee !== undefined) db.prepare("UPDATE stories SET assignee=? WHERE id=?").run(patch.assignee, id);
    if (patch.sprintId !== undefined) db.prepare("UPDATE stories SET sprint_id=? WHERE id=?").run(patch.sprintId, id);
    if (patch.status !== undefined && patch.status !== cur.status) {
      const doneAt = patch.status === "done" ? nowIso() : null;
      db.prepare("UPDATE stories SET status=?, done_at=? WHERE id=?").run(patch.status, doneAt, id);
    }
  });
  tx();
}
export function deleteStory(id: string): void {
  getDb().prepare("DELETE FROM stories WHERE id=?").run(id);
}

/* ---------- contracts ---------- */
export function getContract(projectId: string, kind: ContractKind): Contract {
  const r = getDb().prepare("SELECT * FROM contracts WHERE project_id=? AND kind=?").get(projectId, kind) as Row | undefined;
  return r ? mapContract(r) : { projectId, kind, fields: {}, updatedAt: "" };
}
export function saveContract(projectId: string, kind: ContractKind, fields: Record<string, string>): void {
  getDb().prepare("INSERT INTO contracts (project_id, kind, fields, updated_at) VALUES (?,?,?,?) ON CONFLICT(project_id, kind) DO UPDATE SET fields=excluded.fields, updated_at=excluded.updated_at")
    .run(projectId, kind, JSON.stringify(fields), nowIso());
}

/* ---------- reviews ---------- */
export function listReviews(projectId: string): FileReview[] {
  return (getDb().prepare("SELECT * FROM file_reviews WHERE project_id=? ORDER BY created_at DESC").all(projectId) as Row[]).map(mapReview);
}
export function addReview(projectId: string, input: { file: string; verdict: Verdict; pass: number; notes?: string }): FileReview {
  const db = getDb();
  const id = uid();
  db.prepare("INSERT INTO file_reviews (id, project_id, file, verdict, pass, notes, created_at) VALUES (?,?,?,?,?,?,?)")
    .run(id, projectId, input.file.trim(), input.verdict, Math.min(Math.max(1, input.pass), 2), input.notes ?? "", nowIso());
  return mapReview(db.prepare("SELECT * FROM file_reviews WHERE id=?").get(id) as Row);
}
export function deleteReview(id: string): void {
  getDb().prepare("DELETE FROM file_reviews WHERE id=?").run(id);
}

/* ---------- gate ---------- */
export function getGate(projectId: string): GateCheck[] {
  return (getDb().prepare("SELECT * FROM gate_checks WHERE project_id=? ORDER BY chk").all(projectId) as Row[]).map(mapGate);
}
export function setGateCheck(projectId: string, check: number, status: GateStatus, note?: string): void {
  getDb().prepare("INSERT INTO gate_checks (project_id, chk, status, note) VALUES (?,?,?,?) ON CONFLICT(project_id, chk) DO UPDATE SET status=excluded.status, note=COALESCE(?, gate_checks.note)")
    .run(projectId, check, status, note ?? "", note ?? null);
}

/* ---------- ADRs ---------- */
export function listAdrs(projectId: string): Adr[] {
  return (getDb().prepare("SELECT * FROM adrs WHERE project_id=? ORDER BY created_at").all(projectId) as Row[]).map(mapAdr);
}
export function addAdr(projectId: string, title: string, decision: string): Adr {
  const db = getDb();
  const id = uid();
  db.prepare("INSERT INTO adrs (id, project_id, title, decision, created_at) VALUES (?,?,?,?,?)").run(id, projectId, title.trim(), decision.trim(), nowIso());
  return mapAdr(db.prepare("SELECT * FROM adrs WHERE id=?").get(id) as Row);
}
export function deleteAdr(id: string): void {
  getDb().prepare("DELETE FROM adrs WHERE id=?").run(id);
}

/* ---------- code summary ---------- */
export function getSummary(projectId: string): CodeSummary {
  const r = getDb().prepare("SELECT * FROM code_summary WHERE project_id=?").get(projectId) as Row | undefined;
  return r ? mapSummary(r) : { projectId, isPass: "pending", todos: "", cycles: 0 };
}
export function saveSummary(projectId: string, input: { isPass: IsPass; todos: string; cycles: number }): void {
  getDb().prepare("INSERT INTO code_summary (project_id, is_pass, todos, cycles) VALUES (?,?,?,?) ON CONFLICT(project_id) DO UPDATE SET is_pass=excluded.is_pass, todos=excluded.todos, cycles=excluded.cycles")
    .run(projectId, input.isPass, input.todos, Math.max(0, input.cycles));
}
