import { json, guard, readJson, err } from "@/lib/api";
import { importProject } from "@/lib/bridge";
import type { ProjectBundle } from "@/lib/types";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  const g = guard(req); if (g) return g;
  const body = await readJson<ProjectBundle | ProjectBundle[]>(req);
  if (!body) return err("invalid json");
  const list = Array.isArray(body) ? body : [body];
  try { return json({ ok: true, results: list.map((b) => importProject(b, "claude")) }); } catch (e) { return err((e as Error).message); }
}
