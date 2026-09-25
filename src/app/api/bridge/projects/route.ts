import { json, guard, readJson, err } from "@/lib/api";
import { listProjects } from "@/lib/repo";
import { importProject } from "@/lib/bridge";
import type { ProjectBundle } from "@/lib/types";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const g = guard(req); if (g) return g;
  return json({ ok: true, projects: listProjects() });
}
/** POST a ProjectBundle to create/upsert a project (same as /import). */
export async function POST(req: Request) {
  const g = guard(req); if (g) return g;
  const body = await readJson<ProjectBundle>(req);
  if (!body?.project?.name) return err("project.name required");
  try { return json({ ok: true, ...importProject(body, "claude") }, 201); } catch (e) { return err((e as Error).message); }
}
