// src/lib/cowork.ts
// Cowork Session Watcher — the console runs on the same Mac as Claude Cowork, so it can tail each session's
// local audit log directly and mirror what Claude is doing into the project's live company run.
// No API key, no scheduled task, no human in the loop: ~10 s latency.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getDb, nowIso } from "./db";
import * as repo from "./repo";
import * as bridge from "./bridge";
import type { Project, StepKind, Command } from "./types";

export interface CoworkSession { id: string; title: string; cwd: string; folders: string[]; initialMessage: string; lastActivityAt: number; dir: string; auditFile: string }
export interface WatchState { sessionId: string; projectId: string; title: string; offset: number; commandId: string | null; lastSeen: string; lastUserText: string }

const MAX_EVENTS_PER_TICK = 40;
const START_TAIL_BYTES = 400_000; // when first attaching to a session, only replay its recent history

/* ---------- discovery ---------- */
export function sessionsRoot(): string {
  return process.env.COWORK_SESSIONS_DIR ?? path.join(os.homedir(), "Library", "Application Support", "Claude", "local-agent-mode-sessions");
}
export function listSessions(maxAgeMs = 3 * 86_400_000): CoworkSession[] {
  const root = sessionsRoot();
  const out: CoworkSession[] = [];
  if (!fs.existsSync(root)) return out;
  const walk = (dir: string, depth: number) => {
    if (depth > 3) return;
    let entries: fs.Dirent[] = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { walk(full, depth + 1); continue; }
      if (!e.name.startsWith("local_") || !e.name.endsWith(".json")) continue;
      try {
        const m = JSON.parse(fs.readFileSync(full, "utf8")) as Record<string, unknown>;
        const last = Number(m.lastActivityAt ?? 0);
        if (Date.now() - last > maxAgeMs) continue;
        const id = String(m.sessionId ?? e.name.replace(/\.json$/, ""));
        const sdir = path.join(dir, id);
        const audit = path.join(sdir, "audit.jsonl");
        if (!fs.existsSync(audit)) continue;
        out.push({ id, title: String(m.title ?? ""), cwd: String(m.cwd ?? ""), folders: Array.isArray(m.userSelectedFolders) ? (m.userSelectedFolders as unknown[]).map(String) : [], initialMessage: String(m.initialMessage ?? ""), lastActivityAt: last, dir: sdir, auditFile: audit });
      } catch { /* skip */ }
    }
  };
  walk(root, 0);
  return out.sort((a, b) => b.lastActivityAt - a.lastActivityAt);
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
/** Fuzzy: "NamastPOS 2" ↔ "NamastePOS" — normalized containment, or ≤1 edit on the name, or shared repo folder. */
export function matchProject(session: CoworkSession, projects: Project[]): Project | null {
  const title = norm(session.title);
  const hay = [title, norm(session.initialMessage), ...session.folders.map(norm)].join("|");
  for (const p of projects) {
    const name = norm(p.name);
    if (!name || name.length < 3) continue;
    if (hay.includes(name)) return p;
    if (p.repoPath && session.folders.some((f) => f.startsWith(p.repoPath) || p.repoPath.startsWith(f))) return p;
    // one-edit tolerance on the title tokens (NamastPOS vs NamastePOS)
    for (const tok of session.title.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 4)) {
      if (editDistance(norm(tok), name) <= 1) return p;
    }
    for (const tag of p.tags.split(",").map((t) => norm(t)).filter((t) => t.length >= 4)) if (title.includes(tag)) return p;
  }
  return null;
}
function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 1) return 9;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

/* ---------- state ---------- */
function ensureTable() {
  getDb().exec(`CREATE TABLE IF NOT EXISTS session_watch (session_id TEXT PRIMARY KEY, project_id TEXT NOT NULL, title TEXT NOT NULL DEFAULT '', offset INTEGER NOT NULL DEFAULT 0, command_id TEXT, last_seen TEXT NOT NULL, last_user_text TEXT NOT NULL DEFAULT '')`);
}
export function listWatches(): WatchState[] {
  ensureTable();
  return (getDb().prepare("SELECT * FROM session_watch ORDER BY last_seen DESC").all() as Record<string, unknown>[]).map((r) => ({ sessionId: String(r.session_id), projectId: String(r.project_id), title: String(r.title), offset: Number(r.offset), commandId: r.command_id == null ? null : String(r.command_id), lastSeen: String(r.last_seen), lastUserText: String(r.last_user_text ?? "") }));
}
function saveWatch(w: WatchState) {
  getDb().prepare("INSERT INTO session_watch (session_id, project_id, title, offset, command_id, last_seen, last_user_text) VALUES (?,?,?,?,?,?,?) ON CONFLICT(session_id) DO UPDATE SET project_id=excluded.project_id, title=excluded.title, offset=excluded.offset, command_id=excluded.command_id, last_seen=excluded.last_seen, last_user_text=excluded.last_user_text")
    .run(w.sessionId, w.projectId, w.title, w.offset, w.commandId, w.lastSeen, w.lastUserText);
}

/* ---------- classification ---------- */
type Cls = { persona: string; step: StepKind; phase: number };
const FE_EXT = /\.(tsx|jsx|css|scss|html|dart|vue|svelte)$/i;
function classifyText(text: string, fallbackPhase: number): Cls {
  const t = text.toLowerCase();
  if (/\b(deploy|render|docker|cloudflare|launchctl|rollout|ci\b|github actions|workflow)\b/.test(t)) return { persona: "devops", step: "deploy", phase: 7 };
  if (/\b(test|tests|spec|coverage|green|passing|failed|assert|jest|vitest|pytest)\b/.test(t)) return { persona: "qa", step: "test", phase: 6 };
  if (/\b(sprint|story|stories|points|backlog|kanban|scope)\b/.test(t)) return { persona: "scrum", step: "write", phase: 5 };
  if (/\b(schema|migration|architecture|module|contract b|classdiagram|api spec|endpoint|table)\b/.test(t)) return { persona: "architect", step: "design", phase: 4 };
  if (/\b(requirement|user stor|acceptance|prd|spec\b|dod)\b/.test(t)) return { persona: "ba", step: "write", phase: 3 };
  if (/\b(cost|budget|₹|rupee|pricing|plan ladder|free tier|per month)\b/.test(t)) return { persona: "cfo", step: "analyze", phase: 2 };
  if (/\b(stack|framework|library|library|option|approach|trade-?off|node|postgres|flutter)\b/.test(t)) return { persona: "cto", step: "analyze", phase: 2 };
  if (/\b(done|delivered|summary|shipped|complete|here's what|next steps)\b/.test(t)) return { persona: "founder", step: "deliver", phase: 8 };
  if (/\b(decide|decision|we will|i'll|plan is|my pick)\b/.test(t)) return { persona: "founder", step: "decide", phase: 1 };
  return { persona: "founder", step: "think", phase: fallbackPhase };
}
function classifyTool(name: string, input: Record<string, unknown>): Cls & { message: string; detail: string } | null {
  const s = (k: string) => String(input?.[k] ?? "");
  const file = s("file_path") || s("path") || s("notebook_path");
  const base = file ? path.basename(file) : "";
  switch (name) {
    case "Write": return { persona: FE_EXT.test(file) ? "fe" : "be", step: "code", phase: 5, message: `Wrote ${base || "a file"}`, detail: s("content").slice(0, 8000) };
    case "Edit": case "MultiEdit": case "NotebookEdit": return { persona: FE_EXT.test(file) ? "fe" : "be", step: "code", phase: 5, message: `Edited ${base || "a file"}`, detail: (s("new_string") || s("new_source")).slice(0, 4000) };
    case "Read": return { persona: "architect", step: "analyze", phase: 4, message: `Read ${base || file}`, detail: "" };
    case "Grep": case "Glob": return { persona: "architect", step: "analyze", phase: 4, message: `Searched code for "${s("pattern")}"`, detail: "" };
    case "Agent": return { persona: "scrum", step: "write", phase: 5, message: `Delegated to an agent: ${s("description") || "task"}`, detail: s("prompt").slice(0, 4000) };
    case "TaskCreate": return { persona: "scrum", step: "write", phase: 5, message: `Planned task: ${s("subject")}`, detail: s("description") };
    case "TaskUpdate": return null;
    default: {
      if (/bash|start_process|interact_with_process|shell/i.test(name)) {
        const cmd = s("command") || s("input");
        if (!cmd) return null;
        const c = cmd.toLowerCase();
        if (/git (commit|push)|gh (pr|run)|docker|render|launchctl|deploy|curl .*health/.test(c)) return { persona: "devops", step: "deploy", phase: 7, message: `Ran: ${cmd.slice(0, 140)}`, detail: cmd };
        if (/test|vitest|jest|pytest|npm run (check|lint|typecheck)|tsc|flutter analyze|flutter test/.test(c)) return { persona: "qa", step: "test", phase: 6, message: `Ran tests/checks: ${cmd.slice(0, 140)}`, detail: cmd };
        if (/npm (install|ci)|pip install|flutter pub/.test(c)) return { persona: "devops", step: "code", phase: 5, message: `Installed dependencies: ${cmd.slice(0, 120)}`, detail: cmd };
        if (/^(cat|ls|head|tail|grep|rg|find|sed -n|wc)\b/.test(c.trim())) return { persona: "be", step: "analyze", phase: 5, message: `Inspected: ${cmd.slice(0, 140)}`, detail: cmd };
        return { persona: "be", step: "code", phase: 5, message: `Ran: ${cmd.slice(0, 140)}`, detail: cmd };
      }
      if (/chrome|browser|computer|navigate|screenshot/i.test(name)) return { persona: "qa", step: "test", phase: 6, message: `Checked in the browser (${name.split("__").pop()})`, detail: JSON.stringify(input).slice(0, 1000) };
      if (/web_fetch|WebSearch|WebFetch/i.test(name)) return { persona: "cto", step: "analyze", phase: 2, message: `Looked up: ${s("url") || s("query")}`, detail: "" };
      return null;
    }
  }
}

/* ---------- tailing ---------- */
interface AuditEvent { type?: string; subtype?: string; description?: string; message?: { role?: string; content?: unknown }; usage?: { tool_uses?: number; duration_ms?: number } }

function readNew(file: string, offset: number): { text: string; nextOffset: number } {
  const size = fs.statSync(file).size;
  if (offset > size) offset = 0; // rotated
  if (offset === size) return { text: "", nextOffset: offset };
  const fd = fs.openSync(file, "r");
  try {
    const len = Math.min(size - offset, 2_000_000);
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, offset);
    let text = buf.toString("utf8");
    // keep only complete lines
    const lastNl = text.lastIndexOf("\n");
    if (lastNl < 0) return { text: "", nextOffset: offset };
    text = text.slice(0, lastNl + 1);
    return { text, nextOffset: offset + Buffer.byteLength(text, "utf8") };
  } finally { fs.closeSync(fd); }
}

function textOf(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.filter((b: { type?: string }) => b?.type === "text").map((b: { text?: string }) => b.text ?? "").join("\n").trim();
}

/** Mirror one session's new events into the console. Returns number of activity lines posted. */
export function syncSession(session: CoworkSession, project: Project, existing?: WatchState): number {
  ensureTable();
  const size = fs.statSync(session.auditFile).size;
  const w: WatchState = existing ?? { sessionId: session.id, projectId: project.id, title: session.title, offset: Math.max(0, size - START_TAIL_BYTES), commandId: null, lastSeen: nowIso(), lastUserText: "" };
  if (!existing) {
    // align to a line boundary
    const probe = readNew(session.auditFile, w.offset);
    const firstNl = probe.text.indexOf("\n");
    if (w.offset > 0 && firstNl >= 0) w.offset += Buffer.byteLength(probe.text.slice(0, firstNl + 1), "utf8");
  }
  const { text, nextOffset } = readNew(session.auditFile, w.offset);
  let posted = 0;
  let lastAssistantText = "";
  const lines = text.split("\n").filter(Boolean);
  const ensureCommand = (userText: string): Command => {
    if (w.commandId) { const c = bridge.getCommand(w.commandId); if (c && c.status === "running") return c; }
    const c = bridge.createCommand({ projectId: project.id, source: "cowork", kind: "run_phase", text: `[Live: Cowork session ${session.title}] ${userText || session.initialMessage || "working"}`.slice(0, 500) });
    bridge.updateCommand(c.id, { status: "running" });
    w.commandId = c.id;
    return c;
  };
  for (const line of lines) {
    if (posted >= MAX_EVENTS_PER_TICK) break;
    let e: AuditEvent;
    try { e = JSON.parse(line); } catch { continue; }
    const role = e.message?.role;
    if (e.type === "user" && role === "user") {
      const content = e.message?.content;
      const isToolResult = Array.isArray(content) && content.some((b: { type?: string }) => b?.type === "tool_result");
      if (isToolResult) continue;
      const t = textOf(content);
      if (!t || t === w.lastUserText) continue;
      // new human instruction → close previous run, open a new one
      if (w.commandId) { const prev = bridge.getCommand(w.commandId); if (prev && prev.status === "running") bridge.updateCommand(prev.id, { status: "done", result: lastAssistantText || "Session moved on to the next request." }); }
      w.commandId = null;
      const cmd = ensureCommand(t);
      bridge.logActivity({ projectId: project.id, actor: "user", type: "session.user", message: t.slice(0, 300), detail: t.length > 300 ? t : "", commandId: cmd.id, step: "ask", phase: 1, meta: { session: session.title } });
      w.lastUserText = t; posted++;
      continue;
    }
    if (e.type === "assistant" && role === "assistant") {
      const cmd = ensureCommand(w.lastUserText);
      const content = e.message?.content;
      const t = textOf(content);
      if (t) {
        lastAssistantText = t;
        const cls = classifyText(t, project.currentPhase);
        bridge.logActivity({ projectId: project.id, actor: "claude", type: `phase.${cls.phase}.${cls.step}`, message: t.split("\n").find((l) => l.trim())?.slice(0, 220) ?? t.slice(0, 220), detail: t.length > 220 ? t : "", commandId: cmd.id, persona: cls.persona, phase: cls.phase, step: cls.step, meta: { session: session.title } });
        posted++;
      }
      if (Array.isArray(content)) for (const b of content as Array<{ type?: string; name?: string; input?: Record<string, unknown> }>) {
        if (b?.type !== "tool_use" || !b.name) continue;
        const c = classifyTool(b.name, b.input ?? {});
        if (!c) continue;
        bridge.logActivity({ projectId: project.id, actor: "claude", type: `phase.${c.phase}.${c.step}`, message: c.message, detail: c.detail, commandId: cmd.id, persona: c.persona, phase: c.phase, step: c.step, meta: { session: session.title, tool: b.name } });
        posted++;
      }
      continue;
    }
    if (e.type === "system" && e.subtype === "task_progress" && e.description) {
      // subagent heartbeat — post at most once per description
      const key = `sub:${e.description}`;
      if ((w as unknown as Record<string, string>)[key]) continue;
      (w as unknown as Record<string, string>)[key] = "1";
      const cmd = ensureCommand(w.lastUserText);
      const d = e.description.toLowerCase();
      const persona = /flutter|dart|ui|screen|widget|frontend|web|css|react|next/.test(d) ? "fe" : /test|qa|e2e|verify/.test(d) ? "qa" : /deploy|ci|docker|infra|render/.test(d) ? "devops" : /review|audit/.test(d) ? "architect" : "be-senior";
      const step: StepKind = persona === "qa" ? "test" : persona === "devops" ? "deploy" : persona === "architect" ? "review" : "code";
      bridge.logActivity({ projectId: project.id, actor: "claude", type: `phase.5.${step}`, message: `Sub-agent working: ${e.description}${e.usage?.tool_uses ? ` (${e.usage.tool_uses} tool uses)` : ""}`, commandId: cmd.id, persona, phase: persona === "qa" ? 6 : persona === "devops" ? 7 : 5, step, meta: { session: session.title } });
      posted++;
    }
  }
  // advance offset only past what we consumed (if capped, resume next tick)
  if (posted >= MAX_EVENTS_PER_TICK) {
    // compute consumed bytes up to the last processed line — simpler: consume all lines up to and including the one that hit the cap
    let consumed = 0, count = 0;
    for (const line of lines) { consumed += Buffer.byteLength(line + "\n", "utf8"); count++; if (count >= MAX_EVENTS_PER_TICK * 2) break; }
    w.offset += Math.min(consumed, nextOffset - w.offset);
  } else {
    w.offset = nextOffset;
  }
  w.lastSeen = nowIso(); w.title = session.title; w.projectId = project.id;
  saveWatch(w);
  return posted;
}

let lastTick = 0;
/** Sync all matching sessions. Rate-limited to once per 5 s. Returns a summary. */
export function syncAllSessions(): { checked: number; matched: string[]; posted: number } {
  if (Date.now() - lastTick < 5000) return { checked: 0, matched: [], posted: 0 };
  lastTick = Date.now();
  ensureTable();
  const projects = repo.listProjects();
  const watches = new Map(listWatches().map((w) => [w.sessionId, w]));
  const sessions = listSessions();
  let posted = 0; const matched: string[] = [];
  const IDLE_MS = 30 * 60_000;
  for (const s of sessions) {
    const p = matchProject(s, projects);
    if (!p) continue;
    const w = watches.get(s.id);
    const idle = Date.now() - s.lastActivityAt > IDLE_MS;
    if (!w && idle) continue; // never attach to a session that has gone quiet — only live work gets mirrored
    if (w && idle && w.commandId) {
      // session went quiet: close its running command so the console doesn't show a phantom "running"
      const c = bridge.getCommand(w.commandId);
      if (c && c.status === "running") bridge.updateCommand(c.id, { status: "done", result: `Cowork session “${s.title}” has been idle for 30+ minutes; run closed by the watcher.` });
      w.commandId = null; saveWatch(w);
      continue;
    }
    matched.push(`${s.title} → ${p.name}`);
    try { posted += syncSession(s, p, w); } catch (e) { bridge.logActivity({ projectId: p.id, actor: "system", type: "watcher.error", message: `Session watcher error for "${s.title}": ${(e as Error).message}` }); }
  }
  return { checked: sessions.length, matched, posted };
}

/** Background loop (started from instrumentation.ts). */
export function startWatcher(intervalMs = 10_000): void {
  const g = globalThis as unknown as { __smartitWatcher?: NodeJS.Timeout };
  if (g.__smartitWatcher) return;
  g.__smartitWatcher = setInterval(() => { try { syncAllSessions(); } catch { /* keep going */ } }, intervalMs);
}
