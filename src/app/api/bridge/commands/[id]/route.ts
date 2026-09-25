import { json, guard, readJson, err } from "@/lib/api";
import { getCommand, updateCommand, deleteCommand } from "@/lib/bridge";
import type { CommandStatus } from "@/lib/types";
export const dynamic = "force-dynamic";
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = guard(req); if (g) return g;
  const { id } = await ctx.params;
  const c = getCommand(id);
  return c ? json({ ok: true, command: c }) : err("not found", 404);
}
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = guard(req); if (g) return g;
  const { id } = await ctx.params;
  const body = await readJson<{ status?: CommandStatus; result?: string }>(req);
  if (!body) return err("invalid json");
  const c = updateCommand(id, body);
  return c ? json({ ok: true, command: c }) : err("not found", 404);
}
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = guard(req); if (g) return g;
  const { id } = await ctx.params;
  deleteCommand(id);
  return json({ ok: true });
}
