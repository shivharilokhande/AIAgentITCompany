import { json, err, guard, readJson } from "@/lib/api";
import { PROVIDERS, publicSettings, type ProviderId } from "@/lib/settings";
import { listModels, testProvider } from "@/lib/llm";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** GET → engine configuration with masked secrets. */
export async function GET(req: Request) {
  const g = guard(req); if (g) return g;
  return json({ ok: true, ...publicSettings() });
}

/** POST {action:"test"|"models", provider} → connectivity check or model list for one provider. */
export async function POST(req: Request) {
  const g = guard(req); if (g) return g;
  const body = await readJson<{ action?: string; provider?: string }>(req);
  const id = body?.provider as ProviderId | undefined;
  if (!id || !PROVIDERS.some((p) => p.id === id)) return err("unknown provider");
  if (body?.action === "models") {
    try { return json({ ok: true, provider: id, models: await listModels(id) }); }
    catch (e) { return json({ ok: false, provider: id, models: [], error: (e as Error).message }); }
  }
  if (body?.action === "test") return json({ provider: id, ...(await testProvider(id)) });
  return err("action must be test or models");
}
