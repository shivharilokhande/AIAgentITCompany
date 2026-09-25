import { json } from "@/lib/api";
import { processNextCommand, engineEnabled } from "@/lib/claude";
import { syncAllSessions } from "@/lib/cowork";
export const dynamic = "force-dynamic";
export const maxDuration = 120;
/** Called by the UI every few seconds. If the in-app engine is enabled, processes one queued command. */
export async function POST() {
  const watcher = syncAllSessions();
  if (!engineEnabled()) return json({ ok: true, engine: "cowork", processed: null, watcher });
  const c = await processNextCommand();
  return json({ ok: true, engine: "anthropic-api", processed: c, watcher });
}
