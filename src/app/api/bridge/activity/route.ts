import { json, guard, readJson, err } from "@/lib/api";
import { listActivity, logActivity, latestSeq } from "@/lib/bridge";
import { getProject, getProjectByName } from "@/lib/repo";
import type { Actor, StepKind } from "@/lib/types";
import { STEP_KINDS } from "@/lib/types";
import { personaIds } from "@/lib/team";
export const dynamic = "force-dynamic";
/** GET ?project=<id|name>&since=<seq>&limit= */
export async function GET(req: Request) {
  const g = guard(req); if (g) return g;
  const u = new URL(req.url);
  const ref = u.searchParams.get("project");
  const project = ref ? getProject(ref) ?? getProjectByName(ref) : null;
  const since = u.searchParams.get("since");
  return json({ ok: true, latestSeq: latestSeq(), activity: listActivity({ projectId: project?.id, commandId: u.searchParams.get("command"), sinceSeq: since ? Number(since) : undefined, limit: Number(u.searchParams.get("limit") ?? 100) }) });
}
/** POST { project?, actor?, type?, message, meta?, persona?, phase?, step?, command?, detail? } — Claude posts persona-attributed progress lines here. */
export async function POST(req: Request) {
  const g = guard(req); if (g) return g;
  const body = await readJson<{ project?: string; actor?: Actor; type?: string; message?: string; meta?: Record<string, unknown>; persona?: string; phase?: number; step?: string; command?: string; detail?: string }>(req);
  if (!body?.message) return err("message required");
  const project = body.project ? getProject(body.project) ?? getProjectByName(body.project) : null;
  const actor: Actor = (["user", "claude", "system", "engine"] as Actor[]).includes(body.actor as Actor) ? (body.actor as Actor) : "claude";
  const persona = body.persona && personaIds().has(body.persona) ? body.persona : "";
  const step = STEP_KINDS.includes(body.step as StepKind) ? (body.step as StepKind) : "";
  const phase = body.phase && body.phase >= 1 && body.phase <= 8 ? Math.floor(body.phase) : null;
  return json({ ok: true, activity: logActivity({ projectId: project?.id ?? null, actor, type: body.type ?? (step || "note"), message: body.message, meta: body.meta, persona, phase, step, commandId: body.command ?? null, detail: body.detail }) }, 201);
}
