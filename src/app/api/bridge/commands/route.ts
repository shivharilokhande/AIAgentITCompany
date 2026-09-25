import { json, guard, readJson, err } from "@/lib/api";
import { createCommand, listCommands, claimNextCommand } from "@/lib/bridge";
import { getProject, getProjectByName } from "@/lib/repo";
import type { CommandKind, CommandStatus } from "@/lib/types";
export const dynamic = "force-dynamic";
const KINDS: CommandKind[] = ["ask", "fetch_details", "run_phase", "plan_sprint", "review", "sync", "custom"];
/** GET ?status=queued&project=<id|name>&limit=  |  GET ?claim=1 atomically claims the next queued command. */
export async function GET(req: Request) {
  const g = guard(req); if (g) return g;
  const u = new URL(req.url);
  const projectRef = u.searchParams.get("project");
  const project = projectRef ? getProject(projectRef) ?? getProjectByName(projectRef) : null;
  if (u.searchParams.get("claim")) return json({ ok: true, command: claimNextCommand(project?.id ?? null) });
  const status = u.searchParams.get("status") as CommandStatus | null;
  return json({ ok: true, commands: listCommands({ projectId: project?.id, status: status ?? undefined, limit: Number(u.searchParams.get("limit") ?? 100) }) });
}
export async function POST(req: Request) {
  const g = guard(req); if (g) return g;
  const body = await readJson<{ text?: string; kind?: CommandKind; project?: string; projectId?: string; source?: "app" | "cowork" }>(req);
  if (!body?.text?.trim()) return err("text required");
  const ref = body.project ?? body.projectId;
  const project = ref ? getProject(ref) ?? getProjectByName(ref) : null;
  if (ref && !project) return err("project not found", 404);
  const kind = KINDS.includes(body.kind as CommandKind) ? (body.kind as CommandKind) : "ask";
  return json({ ok: true, command: createCommand({ projectId: project?.id ?? null, source: body.source === "cowork" ? "cowork" : "app", kind, text: body.text }) }, 201);
}
