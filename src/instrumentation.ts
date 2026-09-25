// Starts the Cowork Session Watcher when the Next.js server boots (nodejs runtime only).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.COWORK_WATCHER !== "0") {
    const { startWatcher, syncAllSessions } = await import("./lib/cowork");
    startWatcher(Number(process.env.COWORK_WATCH_INTERVAL_MS ?? 10_000));
    setTimeout(() => { try { syncAllSessions(); } catch { /* ignore */ } }, 3000);
  }
}
