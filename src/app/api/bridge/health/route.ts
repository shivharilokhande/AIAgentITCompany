import { json } from "@/lib/api";
import { listProjects } from "@/lib/repo";
import { commandStats, latestSeq } from "@/lib/bridge";
import { engineEnabled } from "@/lib/claude";
import { listWatches, listSessions } from "@/lib/cowork";
export const dynamic = "force-dynamic";
export async function GET() {
  return json({ ok: true, app: "smartit-console", version: "2.0.0", time: new Date().toISOString(), projects: listProjects().length, commands: commandStats(), latestSeq: latestSeq(), engine: engineEnabled() ? "anthropic-api" : "cowork", tokenRequired: Boolean(process.env.BRIDGE_TOKEN), watcher: { sessionsSeen: listSessions().length, watching: listWatches().map((w) => ({ session: w.title, projectId: w.projectId, commandId: w.commandId, lastSeen: w.lastSeen })) } });
}
