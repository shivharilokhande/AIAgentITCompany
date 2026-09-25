import { json, guard, readJson, err } from "@/lib/api";
import { listTeam, hire, totalLanes, builders } from "@/lib/team";
export const dynamic = "force-dynamic";
/** GET → roster + lanes. POST {name, role, specialty, capacity, reportsTo} → hire. */
export async function GET(req: Request) {
  const g = guard(req); if (g) return g;
  return json({ ok: true, team: listTeam(true), lanes: totalLanes(), builders: builders().map((b) => ({ id: b.id, name: b.name, role: b.role, specialty: b.specialty, capacity: b.capacity })) });
}
export async function POST(req: Request) {
  const g = guard(req); if (g) return g;
  const b = await readJson<{ name?: string; role?: string; specialty?: string; capacity?: number; reportsTo?: string }>(req);
  if (!b?.name) return err("name required");
  return json({ ok: true, member: hire({ name: b.name, role: b.role ?? "Engineer", specialty: b.specialty ?? "", capacity: b.capacity, reportsTo: b.reportsTo ?? "scrum" }) }, 201);
}
