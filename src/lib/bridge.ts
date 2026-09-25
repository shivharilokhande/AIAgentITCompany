// src/lib/bridge.ts
// Claude Bridge: command queue, activity feed, and full project export/import.
// Used by the REST API (/api/bridge/*), by server actions, and by the optional in-app engine.
import { getDb, nowIso, uid } from "./db";
import * as repo from "./repo";
import type { Command, CommandKind, CommandSource, CommandStatus, Activity, Actor, ProjectBundle, Project, ContractKind } from "./types";

type Row = Record<string, unknown>;
const s = (v: unknown): string => (v == null ? "" : String(v));
const n = (v: unknown): number => Number(v ?? 0);
const ns = (v: unknown): string | null => (v == null ? null : String(v));

const mapCommand = (r: Row): Command => ({
  id: s(r.id), projectId: ns(r.project_id), source: s(r.source) as CommandSource, kind: s(r.kind) as CommandKind, text: s(r.text),
  status: s(r.status) as CommandStatus, result: s(r.result), createdAt: s(r.created_at), startedAt: ns(r.started_at), finishedAt: ns(r.finished_at),
});
const mapActivity = (r: Row): Activity => {
  let meta: Record<string, unknown> = {};
  try { meta = JSON.parse(s(r.meta) || "{}"); } catch { meta = {}; }
  return {
    id: s(r.id), seq: n(r.seq), projectId: ns(r.project_id), actor: s(r.actor) as Actor, type: s(r.type), message: s(r.message), meta, createdAt: s(r.created_at),
    persona: s(r.persona), phase: r.phase == null ? null : n(r.phase), step: s(r.step) as Activity["step"], commandId: ns(r.command_id), detail: s(r.detail),
  };
};

/* ---------- commands ---------- */
export function createCommand(input: { projectId?: string | null; source: CommandSource; kind: CommandKind; text: string }): Command {
  const db = getDb();
  const id = uid();
  db.prepare("INSERT INTO commands (id, project_id, source, kind, text, status, result, created_at) VALUES (?,?,?,?,?,'queued','',?)")
    .run(id, input.projectId ?? null, input.source, input.kind, input.text.trim(), nowIso());
  logActivity({ projectId: input.projectId ?? null, actor: input.source === "cowork" ? "claude" : "user", type: "command.queued", message: `${labelForKind(input.kind)}: ${input.text.trim()}`, meta: { commandId: id, kind: input.kind, source: input.source }, commandId: id, step: "ask" });
  return getCommand(id)!;
}
export function getCommand(id: string): Command | null {
  const r = getDb().prepare("SELECT * FROM commands WHERE id=?").get(id) as Row | undefined;
  return r ? mapCommand(r) : null;
}
export function listCommands(opts: { projectId?: string | null; status?: CommandStatus; limit?: number } = {}): Command[] {
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.projectId !== undefined && opts.projectId !== null) { where.push("project_id = ?"); params.push(opts.projectId); }
  if (opts.status) { where.push("status = ?"); params.push(opts.status); }
  const sql = `SELECT * FROM commands ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY created_at DESC LIMIT ?`;
  params.push(opts.limit ?? 100);
  return (getDb().prepare(sql).all(...params) as Row[]).map(mapCommand);
}
/** Atomically claim the oldest queued command (optionally for one project). */
export function claimNextCommand(projectId?: string | null): Command | null {
  const db = getDb();
  let claimed: Command | null = null;
  db.transaction(() => {
    const r = projectId
      ? (db.prepare("SELECT * FROM commands WHERE status='queued' AND project_id=? ORDER BY created_at LIMIT 1").get(projectId) as Row | undefined)
      : (db.prepare("SELECT * FROM commands WHERE status='queued' ORDER BY created_at LIMIT 1").get() as Row | undefined);
    if (!r) return;
    db.prepare("UPDATE commands SET status='running', started_at=? WHERE id=?").run(nowIso(), r.id);
    claimed = getCommand(s(r.id));
  })();
  if (claimed) {
    const c: Command = claimed;
    logActivity({ projectId: c.projectId, actor: "claude", type: "command.started", message: `Started: ${c.text}`, meta: { commandId: c.id }, commandId: c.id, persona: "founder", phase: 1, step: "ask" });
  }
  return claimed;
}
export function updateCommand(id: string, patch: { status?: CommandStatus; result?: string }): Command | null {
  const db = getDb();
  const cur = getCommand(id);
  if (!cur) return null;
  if (patch.status === "running" && cur.status !== "running") db.prepare("UPDATE commands SET status='running', started_at=? WHERE id=?").run(nowIso(), id);
  else if (patch.status === "done" || patch.status === "failed") db.prepare("UPDATE commands SET status=?, finished_at=?, result=COALESCE(?, result) WHERE id=?").run(patch.status, nowIso(), patch.result ?? null, id);
  else if (patch.status) db.prepare("UPDATE commands SET status=? WHERE id=?").run(patch.status, id);
  if (patch.result !== undefined && !(patch.status === "done" || patch.status === "failed")) db.prepare("UPDATE commands SET result=? WHERE id=?").run(patch.result, id);
  const next = getCommand(id)!;
  if (patch.status === "done") logActivity({ projectId: next.projectId, actor: "claude", type: "command.done", message: `Delivered: ${next.text}`, meta: { commandId: id, result: (patch.result ?? "").slice(0, 500) }, commandId: id, persona: "founder", phase: 8, step: "deliver", detail: patch.result ?? "" });
  if (patch.status === "failed") logActivity({ projectId: next.projectId, actor: "claude", type: "command.failed", message: `Failed: ${next.text}`, meta: { commandId: id, result: (patch.result ?? "").slice(0, 500) }, commandId: id, persona: "founder", phase: 8, step: "note", detail: patch.result ?? "" });
  return next;
}
export function deleteCommand(id: string): void {
  getDb().prepare("DELETE FROM commands WHERE id=?").run(id);
}
export function commandStats(): Record<CommandStatus, number> {
  const rows = getDb().prepare("SELECT status, COUNT(*) AS c FROM commands GROUP BY status").all() as Row[];
  const out: Record<CommandStatus, number> = { queued: 0, running: 0, done: 0, failed: 0 };
  for (const r of rows) out[s(r.status) as CommandStatus] = n(r.c);
  return out;
}

/* ---------- activity ---------- */
export interface LogInput { projectId?: string | null; actor: Actor; type: string; message: string; meta?: Record<string, unknown>; persona?: string; phase?: number | null; step?: Activity["step"]; commandId?: string | null; detail?: string }
export function logActivity(input: LogInput): Activity {
  const db = getDb();
  const id = uid();
  const seq = n((db.prepare("SELECT COALESCE(MAX(seq),0) AS m FROM activity").get() as Row).m) + 1;
  const commandId = input.commandId ?? (typeof input.meta?.commandId === "string" ? (input.meta.commandId as string) : null);
  db.prepare("INSERT INTO activity (id, seq, project_id, actor, type, message, meta, created_at, persona, phase, step, command_id, detail) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .run(id, seq, input.projectId ?? null, input.actor, input.type, input.message.slice(0, 4000), JSON.stringify(input.meta ?? {}), nowIso(),
      input.persona ?? "", input.phase ?? null, input.step ?? "", commandId, (input.detail ?? "").slice(0, 60000));
  return mapActivity(db.prepare("SELECT * FROM activity WHERE id=?").get(id) as Row);
}
export function listActivity(opts: { projectId?: string | null; sinceSeq?: number; limit?: number; commandId?: string | null } = {}): Activity[] {
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.projectId) { where.push("project_id = ?"); params.push(opts.projectId); }
  if (opts.commandId) { where.push("command_id = ?"); params.push(opts.commandId); }
  if (opts.sinceSeq !== undefined) { where.push("seq > ?"); params.push(opts.sinceSeq); }
  const sql = `SELECT * FROM activity ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY seq DESC LIMIT ?`;
  params.push(opts.limit ?? 100);
  return (getDb().prepare(sql).all(...params) as Row[]).map(mapActivity).reverse();
}
export function latestSeq(): number {
  return n((getDb().prepare("SELECT COALESCE(MAX(seq),0) AS m FROM activity").get() as Row).m);
}

/* ---------- export / import ---------- */
export function exportProject(projectId: string): ProjectBundle | null {
  const p = repo.getProject(projectId);
  if (!p) return null;
  const sprints = repo.listSprints(projectId);
  const byId = new Map(sprints.map((sp) => [sp.id, sp.number]));
  const contracts: Partial<Record<ContractKind, Record<string, string>>> = {};
  for (const k of ["A", "B", "C"] as ContractKind[]) contracts[k] = repo.getContract(projectId, k).fields;
  return {
    project: p,
    phases: repo.getPhases(projectId).map(({ phase, status, summary }) => ({ phase, status, summary })),
    requirements: repo.listRequirements(projectId).map(({ priority, text }) => ({ priority, text })),
    sprints: sprints.map(({ number, goal, startDate, endDate, status }) => ({ number, goal, startDate, endDate, status })),
    stories: repo.listStories(projectId).map((st) => ({ title: st.title, description: st.description, points: st.points, status: st.status, assignee: st.assignee, sprintNumber: st.sprintId ? byId.get(st.sprintId) ?? null : null })),
    contracts,
    reviews: repo.listReviews(projectId).map(({ file, verdict, pass, notes }) => ({ file, verdict, pass, notes })),
    gate: repo.getGate(projectId).map(({ check, status, note }) => ({ check, status, note })),
    adrs: repo.listAdrs(projectId).map(({ title, decision }) => ({ title, decision })),
    summary: (({ isPass, todos, cycles }) => ({ isPass, todos, cycles }))(repo.getSummary(projectId)),
  };
}

const PRI = new Set(["P0", "P1", "P2"]);
const STORY = new Set(["todo", "in_progress", "review", "done"]);
const PHASE = new Set(["pending", "active", "done"]);
const SPRINT = new Set(["planned", "active", "closed"]);
const GATE = new Set(["pending", "pass", "fail"]);
const VERD = new Set(["LGTM", "LBTM"]);
const ISPASS = new Set(["YES", "NO", "pending"]);

/**
 * Upsert a whole project from a bundle. Matches by project.id, else by name (case-insensitive), else creates.
 * `replace: true` wipes existing children first (default: append/merge-by-key where sensible).
 */
export function importProject(bundle: ProjectBundle, source: Project["source"] = "claude"): { project: Project; created: boolean; counts: Record<string, number> } {
  const db = getDb();
  const b = bundle;
  if (!b.project?.name || !b.project?.idea) throw new Error("bundle.project.name and bundle.project.idea are required");
  let project = (b.project.id ? repo.getProject(b.project.id) : null) ?? repo.getProjectByName(b.project.name);
  const created = !project;
  const counts: Record<string, number> = {};
  db.transaction(() => {
    if (!project) {
      project = repo.createProject({ name: b.project.name, idea: b.project.idea, mode: b.project.mode, repoPath: b.project.repoPath, source });
    } else {
      repo.updateProject(project.id, { name: b.project.name, idea: b.project.idea, mode: b.project.mode, repoPath: b.project.repoPath, source });
    }
    const pid = project.id;
    if (b.project.deployStatus) repo.updateProject(pid, { deployStatus: b.project.deployStatus });
    if (b.project.tags !== undefined) repo.updateProject(pid, { tags: b.project.tags });
    if (b.project.owner !== undefined) repo.updateProject(pid, { owner: b.project.owner });

    if (b.replace) {
      for (const t of ["requirements", "sprints", "stories", "file_reviews", "adrs"]) db.prepare(`DELETE FROM ${t} WHERE project_id=?`).run(pid);
    }
    if (b.phases?.length) {
      // apply in order; the highest 'done' wins, then the single 'active'
      const done = b.phases.filter((p) => p.status === "done").map((p) => p.phase);
      if (done.length) repo.setPhase(pid, Math.max(...done), "done");
      const active = b.phases.find((p) => p.status === "active");
      if (active) repo.setPhase(pid, active.phase, "active");
      for (const p of b.phases) if (p.summary && PHASE.has(p.status)) repo.setPhaseSummary(pid, p.phase, p.summary);
      counts.phases = b.phases.length;
    }
    if (b.requirements?.length) {
      const existing = new Set(repo.listRequirements(pid).map((r) => r.text.toLowerCase()));
      for (const r of b.requirements) if (PRI.has(r.priority) && r.text && !existing.has(r.text.toLowerCase())) { repo.addRequirement(pid, r.priority, r.text); counts.requirements = (counts.requirements ?? 0) + 1; }
    }
    const sprintByNumber = new Map(repo.listSprints(pid).map((sp) => [sp.number, sp]));
    if (b.sprints?.length) {
      for (const sp of b.sprints.slice().sort((a, c) => a.number - c.number)) {
        const ex = sprintByNumber.get(sp.number);
        if (ex) {
          repo.updateSprint(ex.id, { goal: sp.goal, startDate: sp.startDate, endDate: sp.endDate, status: SPRINT.has(sp.status) ? sp.status : undefined });
        } else {
          const createdSp = repo.createSprint(pid, { goal: sp.goal ?? "", startDate: sp.startDate, endDate: sp.endDate, number: sp.number });
          if (SPRINT.has(sp.status)) repo.updateSprint(createdSp.id, { status: sp.status });
          sprintByNumber.set(createdSp.number, repo.getSprint(createdSp.id)!);
        }
        counts.sprints = (counts.sprints ?? 0) + 1;
      }
      for (const sp of repo.listSprints(pid)) sprintByNumber.set(sp.number, sp);
    }
    if (b.stories?.length) {
      const existing = new Set(repo.listStories(pid).map((st) => st.title.toLowerCase()));
      for (const st of b.stories) {
        if (!st.title || existing.has(st.title.toLowerCase())) continue;
        const sprintId = st.sprintNumber ? sprintByNumber.get(st.sprintNumber)?.id ?? null : null;
        repo.createStory(pid, { title: st.title, description: st.description ?? "", points: st.points ?? 1, sprintId, assignee: st.assignee ?? "", status: STORY.has(st.status) ? st.status : "todo" });
        counts.stories = (counts.stories ?? 0) + 1;
      }
    }
    if (b.contracts) {
      for (const k of ["A", "B", "C"] as ContractKind[]) {
        const f = b.contracts[k];
        if (f && typeof f === "object") {
          const merged = { ...repo.getContract(pid, k).fields, ...Object.fromEntries(Object.entries(f).map(([kk, v]) => [kk, String(v ?? "")])) };
          repo.saveContract(pid, k, merged);
          counts.contracts = (counts.contracts ?? 0) + 1;
        }
      }
    }
    if (b.reviews?.length) for (const r of b.reviews) if (r.file && VERD.has(r.verdict)) { repo.addReview(pid, { file: r.file, verdict: r.verdict, pass: r.pass ?? 1, notes: r.notes ?? "" }); counts.reviews = (counts.reviews ?? 0) + 1; }
    if (b.gate?.length) for (const g of b.gate) if (g.check >= 1 && g.check <= 10 && GATE.has(g.status)) { repo.setGateCheck(pid, g.check, g.status, g.note); counts.gate = (counts.gate ?? 0) + 1; }
    if (b.adrs?.length) {
      const existing = new Set(repo.listAdrs(pid).map((a) => a.title.toLowerCase()));
      for (const a of b.adrs) if (a.title && a.decision && !existing.has(a.title.toLowerCase())) { repo.addAdr(pid, a.title, a.decision); counts.adrs = (counts.adrs ?? 0) + 1; }
    }
    if (b.summary && ISPASS.has(b.summary.isPass)) { repo.saveSummary(pid, { isPass: b.summary.isPass, todos: b.summary.todos ?? "", cycles: b.summary.cycles ?? 0 }); counts.summary = 1; }
    repo.updateProject(pid, { lastSyncedAt: nowIso(), source });
  })();
  const p = repo.getProject(project!.id)!;
  logActivity({ projectId: p.id, actor: "claude", type: created ? "project.imported" : "project.synced", message: `${created ? "Imported" : "Synced"} “${p.name}” from Claude`, meta: { counts } });
  return { project: p, created, counts };
}

export function labelForKind(k: CommandKind): string {
  return ({ ask: "Ask Claude", fetch_details: "Fetch complete details", run_phase: "Run phase", plan_sprint: "Plan sprint", review: "Review", sync: "Sync", custom: "Command" } as Record<CommandKind, string>)[k] ?? k;
}
