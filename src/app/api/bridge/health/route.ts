import { json } from "@/lib/api";
import { listProjects } from "@/lib/repo";
import { commandStats, latestSeq } from "@/lib/bridge";
import { engineInfo } from "@/lib/settings";
import { listWatches, listSessions } from "@/lib/cowork";
export const dynamic = "force-dynamic";
export async function GET() {
  const e = engineInfo();
  return json({ ok: true, app: "aiagentitcompany", version: "2.2.0", time: new Date().toISOString(), projects: listProjects().length, commands: commandStats(), latestSeq: latestSeq(), engine: e.mode === "cowork" ? "cowork" : `${e.provider}:${e.model}`, engineInfo: e, tokenRequired: Boolean(process.env.BRIDGE_TOKEN), watcher: { sessionsSeen: listSessions().length, watching: listWatches().map((w) => ({ session: w.title, projectId: w.projectId, commandId: w.commandId, lastSeen: w.lastSeen })) } });
}
