// src/lib/db.ts
// SQLite via Node's built-in `node:sqlite` (Node >= 22.13). Zero native dependencies (ADR-001).
// Loaded through process.getBuiltinModule so the bundler never sees the import.
import fs from "node:fs";
import path from "node:path";

type SqlValue = string | number | bigint | null | Uint8Array;
interface NodeStatement {
  run(...params: SqlValue[]): { changes: number | bigint; lastInsertRowid: number | bigint };
  get(...params: SqlValue[]): unknown;
  all(...params: SqlValue[]): unknown[];
}
interface NodeDatabase {
  exec(sql: string): void;
  prepare(sql: string): NodeStatement;
  close(): void;
}
interface SqliteModule { DatabaseSync: new (path: string) => NodeDatabase }

function loadSqlite(): SqliteModule {
  const getBuiltin = (process as unknown as { getBuiltinModule?: (id: string) => unknown }).getBuiltinModule;
  const mod = getBuiltin ? (getBuiltin("node:sqlite") as SqliteModule | undefined) : undefined;
  if (!mod?.DatabaseSync) {
    throw new Error(`SmartIT Console needs Node.js >= 22.13 (built-in node:sqlite). Current: ${process.version}`);
  }
  return mod;
}

/** Thin wrapper so the rest of the app has a stable, typed surface. */
export class Db {
  private readonly inner: NodeDatabase;
  private readonly cache = new Map<string, NodeStatement>();
  constructor(file: string) {
    const { DatabaseSync } = loadSqlite();
    this.inner = new DatabaseSync(file);
  }
  exec(sql: string): void { this.inner.exec(sql); }
  pragma(p: string): void { this.inner.exec(`PRAGMA ${p};`); }
  prepare(sql: string): Statement {
    let st = this.cache.get(sql);
    if (!st) { st = this.inner.prepare(sql); this.cache.set(sql, st); }
    return new Statement(st);
  }
  private depth = 0;
  /** Runs fn atomically; nested calls become SAVEPOINTs so repo functions compose. Rolls back on throw. */
  transaction<T>(fn: () => T): () => T {
    return () => {
      const sp = `sp${this.depth}`;
      const outer = this.depth === 0;
      this.inner.exec(outer ? "BEGIN" : `SAVEPOINT ${sp}`);
      this.depth++;
      try {
        const out = fn();
        this.depth--;
        this.inner.exec(outer ? "COMMIT" : `RELEASE SAVEPOINT ${sp}`);
        return out;
      } catch (e) {
        this.depth--;
        try { this.inner.exec(outer ? "ROLLBACK" : `ROLLBACK TO SAVEPOINT ${sp}; RELEASE SAVEPOINT ${sp}`); } catch { /* already rolled back */ }
        throw e;
      }
    };
  }
  close(): void { this.inner.close(); }
}

export class Statement {
  constructor(private readonly st: NodeStatement) {}
  run(...params: unknown[]): { changes: number } {
    const r = this.st.run(...(params.map(norm) as SqlValue[]));
    return { changes: Number(r.changes) };
  }
  get(...params: unknown[]): unknown { return this.st.get(...(params.map(norm) as SqlValue[])); }
  all(...params: unknown[]): unknown[] { return this.st.all(...(params.map(norm) as SqlValue[])); }
}
const norm = (v: unknown): SqlValue => (v === undefined ? null : typeof v === "boolean" ? (v ? 1 : 0) : (v as SqlValue));

let db: Db | null = null;

function schemaSql(): string {
  const candidates = [
    path.join(process.cwd(), "src", "lib", "schema.sql"),
    path.join(process.cwd(), "schema.sql"),
  ];
  for (const c of candidates) if (fs.existsSync(c)) return fs.readFileSync(c, "utf8");
  return FALLBACK_SCHEMA;
}

export function getDb(): Db {
  if (db) return db;
  const dir = process.env.DATA_DIR ?? "./data";
  let file: string;
  if (dir === ":memory:") {
    file = ":memory:";
  } else {
    fs.mkdirSync(dir, { recursive: true });
    file = path.join(dir, "smartit.db");
  }
  db = new Db(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(schemaSql());
  migrate(db);
  return db;
}

/** Additive migrations guarded by PRAGMA table_info (ADR-001). */
function migrate(d: Db): void {
  const cols = new Set((d.prepare("PRAGMA table_info(projects)").all() as { name: string }[]).map((c) => c.name));
  const add = (name: string, ddl: string) => { if (!cols.has(name)) d.exec(`ALTER TABLE projects ADD COLUMN ${name} ${ddl}`); };
  add("repo_path", "TEXT NOT NULL DEFAULT ''");
  add("source", "TEXT NOT NULL DEFAULT 'manual'");
  add("last_synced_at", "TEXT");
  add("tags", "TEXT NOT NULL DEFAULT ''");
  add("owner", "TEXT NOT NULL DEFAULT ''");
  const acols = new Set((d.prepare("PRAGMA table_info(activity)").all() as { name: string }[]).map((c) => c.name));
  const addA = (name: string, ddl: string) => { if (!acols.has(name)) d.exec(`ALTER TABLE activity ADD COLUMN ${name} ${ddl}`); };
  addA("persona", "TEXT NOT NULL DEFAULT ''");
  addA("phase", "INTEGER");
  addA("step", "TEXT NOT NULL DEFAULT ''");
  addA("command_id", "TEXT");
  addA("detail", "TEXT NOT NULL DEFAULT ''");
  d.exec("CREATE INDEX IF NOT EXISTS idx_activity_command ON activity(command_id)");
}

/** For tests: drop the singleton so a fresh :memory: DB is created. */
export function resetDbForTests(): void {
  if (db) db.close();
  db = null;
}

export const nowIso = (): string => new Date().toISOString();
export const uid = (): string => crypto.randomUUID();

// Kept in sync with schema.sql; used only if the .sql file is not shipped alongside the bundle.
const FALLBACK_SCHEMA = `
CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL, idea TEXT NOT NULL, current_phase INTEGER NOT NULL DEFAULT 1, mode TEXT NOT NULL DEFAULT 'greenfield', deploy_status TEXT NOT NULL DEFAULT 'not_deployed', created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS phase_state (project_id TEXT NOT NULL, phase INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending', summary TEXT NOT NULL DEFAULT '', completed_at TEXT, PRIMARY KEY (project_id, phase));
CREATE TABLE IF NOT EXISTS requirements (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, priority TEXT NOT NULL, text TEXT NOT NULL, ord INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS sprints (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, number INTEGER NOT NULL, goal TEXT NOT NULL DEFAULT '', start_date TEXT NOT NULL, end_date TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'planned');
CREATE TABLE IF NOT EXISTS stories (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, sprint_id TEXT, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', points INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'todo', assignee TEXT NOT NULL DEFAULT '', ord INTEGER NOT NULL DEFAULT 0, done_at TEXT, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS contracts (project_id TEXT NOT NULL, kind TEXT NOT NULL, fields TEXT NOT NULL DEFAULT '{}', updated_at TEXT NOT NULL, PRIMARY KEY (project_id, kind));
CREATE TABLE IF NOT EXISTS file_reviews (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, file TEXT NOT NULL, verdict TEXT NOT NULL, pass INTEGER NOT NULL DEFAULT 1, notes TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS gate_checks (project_id TEXT NOT NULL, chk INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending', note TEXT NOT NULL DEFAULT '', PRIMARY KEY (project_id, chk));
CREATE TABLE IF NOT EXISTS adrs (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, title TEXT NOT NULL, decision TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS code_summary (project_id TEXT PRIMARY KEY, is_pass TEXT NOT NULL DEFAULT 'pending', todos TEXT NOT NULL DEFAULT '', cycles INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS commands (id TEXT PRIMARY KEY, project_id TEXT, source TEXT NOT NULL DEFAULT 'app', kind TEXT NOT NULL DEFAULT 'ask', text TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'queued', result TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, started_at TEXT, finished_at TEXT);
CREATE TABLE IF NOT EXISTS activity (id TEXT PRIMARY KEY, seq INTEGER NOT NULL, project_id TEXT, actor TEXT NOT NULL DEFAULT 'system', type TEXT NOT NULL DEFAULT 'note', message TEXT NOT NULL, meta TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL);
`;
