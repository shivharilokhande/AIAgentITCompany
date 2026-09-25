import { json } from "@/lib/api";
import { processNextCommand, engineEnabled, engineInfo } from "@/lib/claude";
import { syncAllSessions } from "@/lib/cowork";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// One run at a time: several UI pollers call tick concurrently; only one may drive the engine.
const g = globalThis as unknown as { __smartitEngineBusy?: boolean };

/** Called by the UI every few seconds. If the in-app engine (API key or Ollama) is enabled, processes one queued command. */
export async function POST() {
  const watcher = syncAllSessions();
  const info = engineInfo();
  if (!engineEnabled()) return json({ ok: true, engine: info.mode, processed: null, watcher });
  if (g.__smartitEngineBusy) return json({ ok: true, engine: info.mode, processed: null, busy: true, watcher });
  g.__smartitEngineBusy = true;
  try {
    const c = await processNextCommand();
    return json({ ok: true, engine: `${info.provider}:${info.model}`, processed: c, watcher });
  } finally { g.__smartitEngineBusy = false; }
}
