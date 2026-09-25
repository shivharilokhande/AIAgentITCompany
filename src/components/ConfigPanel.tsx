"use client";
// src/components/ConfigPanel.tsx
// Configuration: choose the engine bridge (Cowork · cloud API · local Ollama) and manage each provider's key/model/URL,
// with live "Test connection" and model discovery.
import { useState } from "react";
import { ActionForm, SubmitButton, Icon, Spinner, useToast } from "./system";
import { Badge, Card } from "./ui";
import { saveEngineModeAction, saveProviderAction, clearProviderKeyAction } from "@/lib/actions";
import type { PublicSettings } from "@/lib/settings";

type Prov = PublicSettings["providers"][number];
type TestResult = { ok: boolean; message: string; ms?: number; model?: string; sample?: string };

const MODE_CARDS: Array<{ id: PublicSettings["mode"]; title: string; icon: string; blurb: string; bullets: string[] }> = [
  { id: "cowork", title: "Claude Cowork bridge", icon: "spark", blurb: "Your Claude desktop subscription does the work. No key, no metering.", bullets: ["Session Watcher mirrors Cowork live", "Commands wait for 'check the console'", "Best quality · uses Cowork's tools & files"] },
  { id: "api", title: "AI API key", icon: "bolt", blurb: "The console calls a cloud model itself. Commands auto-process in seconds.", bullets: ["Anthropic · OpenAI / Codex · Gemini", "OpenRouter → hundreds of coding models", "Any OpenAI-compatible endpoint"] },
  { id: "ollama", title: "Local Ollama", icon: "shield", blurb: "Runs a model on this machine. Free, offline, nothing leaves your Mac.", bullets: ["qwen2.5-coder · deepseek-coder · llama3.1", "Auto-discovers models you've pulled", "Slower, but private and unlimited"] },
];

export function ConfigPanel({ initial }: { initial: PublicSettings }) {
  const s = initial;
  const [mode, setMode] = useState(s.mode);
  const [apiProvider, setApiProvider] = useState(s.apiProvider);
  const cloud = s.providers.filter((p) => p.id !== "ollama");
  const ollama = s.providers.find((p) => p.id === "ollama")!;
  const active = s.engine;

  return (
    <div className="space-y-6">
      {/* Status */}
      <div className={`flex flex-wrap items-center gap-3 rounded-xl border p-4 ${active.ready ? "border-good/30 bg-good/5" : "border-warn/40 bg-warn/5"}`}>
        <span className={`h-2.5 w-2.5 rounded-full ${active.ready ? "bg-good" : "bg-warn"} animate-pulse`} />
        <div className="flex-1">
          <div className="text-sm font-semibold text-fg">{active.label}</div>
          <div className="text-xs text-fg-2">{active.reason}</div>
        </div>
        <Badge tone={active.mode === "cowork" ? "accent" : active.mode === "ollama" ? "good" : "neutral"}>{active.mode === "cowork" ? "Cowork bridge" : active.mode === "ollama" ? "Local LLM bridge" : "API bridge"}</Badge>
      </div>

      {/* Mode */}
      <Card title="1 · Which bridge runs the company?">
        <ActionForm action={saveEngineModeAction} success="Engine updated — the header badge and all company runs now use it" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            {MODE_CARDS.map((m) => (
              <label key={m.id} className={`cursor-pointer rounded-xl border p-4 transition ${mode === m.id ? "border-accent bg-accent/5 ring-1 ring-accent" : "border-border hover:bg-surface-2"}`}>
                <input type="radio" name="mode" value={m.id} checked={mode === m.id} onChange={() => setMode(m.id)} className="sr-only" />
                <div className="flex items-center gap-2 text-sm font-semibold text-fg"><span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${mode === m.id ? "bg-accent text-accent-fg" : "bg-surface-2 text-fg-2"}`}><Icon name={m.icon} /></span>{m.title}</div>
                <p className="mt-2 text-xs text-fg-2">{m.blurb}</p>
                <ul className="mt-2 space-y-0.5 text-[11px] text-muted">{m.bullets.map((b) => <li key={b}>· {b}</li>)}</ul>
              </label>
            ))}
          </div>
          <div className={`grid gap-3 sm:grid-cols-3 ${mode === "api" ? "" : "opacity-60"}`}>
            <div>
              <label className="label" htmlFor="apiProvider">Cloud provider (API mode)</label>
              <select id="apiProvider" name="apiProvider" className="input" value={apiProvider} onChange={(e) => setApiProvider(e.target.value as typeof apiProvider)} disabled={mode !== "api"}>
                {cloud.map((p) => <option key={p.id} value={p.id}>{p.name}{p.hasKey || !p.needsKey ? "" : " — no key yet"}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="maxTokens">Max output tokens per phase</label>
              <input id="maxTokens" name="maxTokens" type="number" min={1000} max={64000} step={500} defaultValue={s.maxTokens} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="jsonMode">JSON mode</label>
              <select id="jsonMode" name="jsonMode" className="input" defaultValue={s.jsonMode ? "1" : "0"}>
                <option value="1">On — ask providers for strict JSON (recommended)</option>
                <option value="0">Off — parse JSON out of free text</option>
              </select>
            </div>
          </div>
          {mode === "api" && (() => { const p = cloud.find((c) => c.id === apiProvider); return p && p.needsKey && !p.hasKey ? <p className="text-xs text-warn">⚠ {p.name} has no API key yet — add one below, then save.</p> : null; })()}
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted">Env vars (<code>ENGINE_MODE</code>, <code>ANTHROPIC_API_KEY</code>, <code>OPENAI_API_KEY</code>, <code>OLLAMA_BASE_URL</code>…) are used as defaults when a field is empty. What you save here wins.</p>
            <SubmitButton>Save engine</SubmitButton>
          </div>
        </ActionForm>
      </Card>

      {/* Ollama */}
      <Card title={<span className="flex items-center gap-2">2 · Local Ollama <Badge tone={ollama.model ? "good" : "neutral"}>{ollama.baseUrl}</Badge></span>}>
        <ProviderForm p={ollama} />
      </Card>

      {/* Cloud providers */}
      <Card title="3 · AI API providers">
        <p className="mb-3 text-xs text-fg-2">Keys are stored in the console's local SQLite database on this machine and masked here. They are only sent to the provider you choose. Leave the key field empty to keep the current one.</p>
        <div className="divide-y divide-border">
          {cloud.map((p) => <div key={p.id} className="py-4 first:pt-0 last:pb-0"><ProviderForm p={p} selected={mode === "api" && apiProvider === p.id} /></div>)}
        </div>
      </Card>
    </div>
  );
}

function ProviderForm({ p, selected }: { p: Prov; selected?: boolean }) {
  const { push } = useToast();
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [models, setModels] = useState<string[] | null>(null);
  const [loadingModels, setLoadingModels] = useState(false);
  const [model, setModel] = useState(p.model);
  const [baseUrl, setBaseUrl] = useState(p.baseUrl);

  const call = async (action: "test" | "models") => {
    const res = await fetch("/api/bridge/providers", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, provider: p.id }) });
    return res.json();
  };
  const test = async () => {
    setTesting(true); setResult(null);
    try { const r = (await call("test")) as TestResult; setResult(r); push({ tone: r.ok ? "good" : "bad", text: `${p.name}: ${r.message}` }); }
    catch (e) { setResult({ ok: false, message: (e as Error).message }); }
    finally { setTesting(false); }
  };
  const discover = async () => {
    setLoadingModels(true);
    try { const r = (await call("models")) as { ok: boolean; models: string[]; error?: string }; setModels(r.models); if (!r.ok) push({ tone: "bad", text: r.error ?? "Could not list models" }); else push({ tone: "good", text: `${r.models.length} models available` }); }
    finally { setLoadingModels(false); }
  };
  const choices = Array.from(new Set([...(models ?? []), ...p.models, ...(model ? [model] : [])])).filter(Boolean);

  return (
    <div className={`rounded-xl ${selected ? "ring-1 ring-accent/50 bg-accent/5 p-3 -m-3" : ""}`}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-semibold text-fg">{p.name}</h4>
        {selected && <Badge tone="accent">active</Badge>}
        {p.needsKey && (p.hasKey ? <Badge tone="good">key · {p.keySource === "env" ? `from ${p.envKey}` : "saved"} · {p.keyMasked}</Badge> : <Badge tone="warn">no key</Badge>)}
        {!p.needsKey && <Badge tone="neutral">no key needed</Badge>}
        <span className="flex-1" />
        <button type="button" onClick={test} disabled={testing} className="btn-ghost btn-sm">{testing ? <><Spinner /> Testing…</> : <><Icon name="bolt" /> Test connection</>}</button>
        <button type="button" onClick={discover} disabled={loadingModels} className="btn-ghost btn-sm">{loadingModels ? <><Spinner /> Loading…</> : <><Icon name="refresh" /> List models</>}</button>
      </div>
      <p className="mb-3 text-[11px] text-muted">{p.hint}</p>
      {result && (
        <div className={`mb-3 rounded-lg border px-3 py-2 text-xs ${result.ok ? "border-good/30 bg-good/5 text-fg" : "border-bad/40 bg-bad/5 text-fg"}`}>
          <span className={`mr-2 font-semibold ${result.ok ? "text-good" : "text-bad"}`}>{result.ok ? "✓ Connected" : "✗ Failed"}</span>{result.message}{result.model ? ` · ${result.model}` : ""}
          {result.sample && <pre className="mt-1 whitespace-pre-wrap font-mono text-[10px] text-muted">{result.sample}</pre>}
        </div>
      )}
      <ActionForm action={saveProviderAction} success={`${p.name} saved`} className="grid gap-3 md:grid-cols-12">
        <input type="hidden" name="provider" value={p.id} />
        {p.needsKey || p.id === "custom" ? (
          <div className="md:col-span-4">
            <label className="label" htmlFor={`k-${p.id}`}>API key {p.hasKey && <span className="text-muted">(leave empty to keep)</span>}</label>
            <input id={`k-${p.id}`} name="apiKey" type="password" autoComplete="off" placeholder={p.hasKey ? p.keyMasked : p.id === "custom" ? "optional" : "paste key"} className="input font-mono" />
          </div>
        ) : <div className="md:col-span-4"><label className="label">Authentication</label><div className="input text-muted">none — local</div></div>}
        <div className="md:col-span-4">
          <label className="label" htmlFor={`u-${p.id}`}>Base URL</label>
          <input id={`u-${p.id}`} name="baseUrl" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder={p.defaultBaseUrl} className="input font-mono text-xs" />
        </div>
        <div className="md:col-span-3">
          <label className="label" htmlFor={`m-${p.id}`}>Model</label>
          <input id={`m-${p.id}`} name="model" list={`models-${p.id}`} value={model} onChange={(e) => setModel(e.target.value)} placeholder={p.defaultModel || "model id"} className="input font-mono text-xs" />
          <datalist id={`models-${p.id}`}>{choices.map((m) => <option key={m} value={m} />)}</datalist>
          {models && models.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{models.slice(0, 12).map((m) => <button type="button" key={m} onClick={() => setModel(m)} className={`badge cursor-pointer ${m === model ? "bg-accent text-accent-fg" : "bg-surface-2 text-fg-2 hover:text-fg"}`}>{m}</button>)}{models.length > 12 && <span className="text-[10px] text-muted">+{models.length - 12} more in the dropdown</span>}</div>}
        </div>
        <div className="flex items-end gap-1 md:col-span-1">
          <SubmitButton className="btn-primary btn-sm" pendingText="…">Save</SubmitButton>
        </div>
      </ActionForm>
      {p.hasKey && p.keySource === "settings" && (
        <ActionForm action={clearProviderKeyAction} confirm={`Remove the saved ${p.name} key from this console?`} success="Key removed" className="mt-2">
          <input type="hidden" name="provider" value={p.id} />
          <button type="submit" className="text-[11px] text-muted hover:text-bad">Remove saved key</button>
        </ActionForm>
      )}
    </div>
  );
}
