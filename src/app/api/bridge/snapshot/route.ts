import { json, guard, err } from "@/lib/api";
import { snapshotRepo } from "@/lib/claude";
import { getProject, getProjectByName } from "@/lib/repo";
export const dynamic = "force-dynamic";
/** GET ?project=<id|name> — repo tree + key files for the project's repoPath (used by Cowork to “fetch complete details”). */
export async function GET(req: Request) {
  const g = guard(req); if (g) return g;
  const ref = new URL(req.url).searchParams.get("project");
  const p = ref ? getProject(ref) ?? getProjectByName(ref) : null;
  if (!p) return err("project not found", 404);
  if (!p.repoPath) return json({ ok: true, project: p.name, repoPath: "", tree: [], files: [] });
  const snap = snapshotRepo(p.repoPath);
  return json({ ok: true, project: p.name, repoPath: p.repoPath, ...snap });
}
