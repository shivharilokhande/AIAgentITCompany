// src/lib/team.ts
// Dynamic team roster. The 15 core personas are seeded from pipeline.ts; the user can hire more engineers,
// set WIP capacity (parallel stories per person) and retire people. Everything that shows personas reads from here.
import { getDb, nowIso } from "./db";
import { PERSONAS } from "./pipeline";
import type { Persona } from "./types";

export interface TeamMember extends Persona { specialty: string; capacity: number; active: boolean; source: "core" | "hired"; createdAt: string }

type Row = Record<string, unknown>;
const s = (v: unknown) => (v == null ? "" : String(v));
const n = (v: unknown) => Number(v ?? 0);

function ensure() {
  const db = getDb();
  db.exec(`CREATE TABLE IF NOT EXISTS team_members (id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL, layer INTEGER NOT NULL DEFAULT 5, reports_to TEXT, focus TEXT NOT NULL DEFAULT '', specialty TEXT NOT NULL DEFAULT '', capacity INTEGER NOT NULL DEFAULT 1, active INTEGER NOT NULL DEFAULT 1, source TEXT NOT NULL DEFAULT 'hired', created_at TEXT NOT NULL, file TEXT NOT NULL DEFAULT '')`);
  const count = n((db.prepare("SELECT COUNT(*) AS c FROM team_members").get() as Row).c);
  if (count === 0) {
    const ins = db.prepare("INSERT INTO team_members (id, name, role, layer, reports_to, focus, specialty, capacity, active, source, created_at, file) VALUES (?,?,?,?,?,?,?,?,1,'core',?,?)");
    for (const p of PERSONAS) ins.run(p.id, p.name, p.role, p.layer, p.reportsTo, p.focus.join("|"), p.focus.join(", "), p.layer === 5 ? 1 : 2, nowIso(), p.file);
  }
}
const map = (r: Row): TeamMember => ({
  id: s(r.id), name: s(r.name), role: s(r.role), layer: n(r.layer), reportsTo: r.reports_to == null ? null : s(r.reports_to), focus: s(r.focus).split("|").filter(Boolean), file: s(r.file),
  specialty: s(r.specialty), capacity: n(r.capacity), active: n(r.active) === 1, source: (s(r.source) as TeamMember["source"]) || "hired", createdAt: s(r.created_at),
});

export function listTeam(includeInactive = false): TeamMember[] {
  ensure();
  return (getDb().prepare(`SELECT * FROM team_members ${includeInactive ? "" : "WHERE active=1"} ORDER BY layer, source DESC, created_at`).all() as Row[]).map(map);
}
export function getMember(id: string): TeamMember | null {
  ensure();
  const r = getDb().prepare("SELECT * FROM team_members WHERE id=?").get(id) as Row | undefined;
  return r ? map(r) : null;
}
/** Active personas as the Persona type the org chart / run views consume. */
export function personas(): Persona[] { return listTeam().map(({ id, name, role, layer, reportsTo, focus, file }) => ({ id, name, role, layer, reportsTo, focus, file })); }
export function personaIds(): Set<string> { return new Set(listTeam(true).map((m) => m.id)); }

export const slugId = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32) || "member";

export function hire(input: { name: string; role: string; specialty: string; capacity?: number; reportsTo?: string | null; layer?: number }): TeamMember {
  ensure();
  const db = getDb();
  let id = slugId(input.name);
  if (getMember(id)) id = `${id}-${Math.random().toString(36).slice(2, 6)}`;
  const focus = input.specialty.split(/[,;/]/).map((x) => x.trim()).filter(Boolean).slice(0, 3);
  db.prepare("INSERT INTO team_members (id, name, role, layer, reports_to, focus, specialty, capacity, active, source, created_at, file) VALUES (?,?,?,?,?,?,?,?,1,'hired',?, '')")
    .run(id, input.name.trim(), input.role.trim() || "Engineer", input.layer ?? 5, input.reportsTo ?? "scrum", focus.join("|"), input.specialty.trim(), Math.max(1, Math.min(5, input.capacity ?? 1)), nowIso());
  return getMember(id)!;
}
export function updateMember(id: string, patch: Partial<Pick<TeamMember, "name" | "role" | "specialty" | "capacity" | "reportsTo" | "active" | "layer">>): void {
  ensure();
  const db = getDb();
  if (patch.name !== undefined) db.prepare("UPDATE team_members SET name=? WHERE id=?").run(patch.name, id);
  if (patch.role !== undefined) db.prepare("UPDATE team_members SET role=? WHERE id=?").run(patch.role, id);
  if (patch.specialty !== undefined) db.prepare("UPDATE team_members SET specialty=?, focus=? WHERE id=?").run(patch.specialty, patch.specialty.split(/[,;/]/).map((x) => x.trim()).filter(Boolean).slice(0, 3).join("|"), id);
  if (patch.capacity !== undefined) db.prepare("UPDATE team_members SET capacity=? WHERE id=?").run(Math.max(1, Math.min(5, patch.capacity)), id);
  if (patch.reportsTo !== undefined) db.prepare("UPDATE team_members SET reports_to=? WHERE id=?").run(patch.reportsTo, id);
  if (patch.layer !== undefined) db.prepare("UPDATE team_members SET layer=? WHERE id=?").run(patch.layer, id);
  if (patch.active !== undefined) db.prepare("UPDATE team_members SET active=? WHERE id=?").run(patch.active ? 1 : 0, id);
}
export function removeHired(id: string): void {
  ensure();
  getDb().prepare("DELETE FROM team_members WHERE id=? AND source='hired'").run(id);
}

/** Engineers who can take stories: layer 5, active, excluding QA/DevOps lanes (they have their own work). */
export function builders(): TeamMember[] {
  return listTeam().filter((m) => m.layer === 5 && !/qa|devops|ops/i.test(m.role));
}
export function totalLanes(): number { return builders().reduce((a, m) => a + m.capacity, 0); }
