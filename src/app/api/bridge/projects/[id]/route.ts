import { json, guard, err, readJson } from "@/lib/api";
import { exportProject, importProject } from "@/lib/bridge";
import { getProject, getProjectByName, deleteProject } from "@/lib/repo";
import type { ProjectBundle } from "@/lib/types";
export const dynamic = "force-dynamic";
const resolve = (id: string) => getProject(id) ?? getProjectByName(decodeURIComponent(id));
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = guard(_req); if (g) return g;
  const { id } = await ctx.params;
  const p = resolve(id);
  if (!p) return err("not found", 404);
  return json({ ok: true, bundle: exportProject(p.id) });
}
/** PATCH = partial bundle merge into this project. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = guard(req); if (g) return g;
  const { id } = await ctx.params;
  const p = resolve(id);
  if (!p) return err("not found", 404);
  const body = await readJson<Partial<ProjectBundle>>(req);
  if (!body) return err("invalid json");
  const bundle: ProjectBundle = { ...body, project: { ...(body.project ?? {}), id: p.id, name: body.project?.name ?? p.name, idea: body.project?.idea ?? p.idea } };
  try { return json({ ok: true, ...importProject(bundle, "claude") }); } catch (e) { return err((e as Error).message); }
}
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = guard(req); if (g) return g;
  const { id } = await ctx.params;
  const p = resolve(id);
  if (!p) return err("not found", 404);
  deleteProject(p.id);
  return json({ ok: true });
}
