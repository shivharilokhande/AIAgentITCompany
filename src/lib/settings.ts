// src/lib/settings.ts
// Engine configuration: which bridge runs the company (Cowork · API provider · local Ollama) and per-provider credentials.
// Stored in the local SQLite `settings` table; environment variables act as defaults when a field is empty.
import { getDb } from "./db";

export type EngineMode = "cowork" | "api" | "ollama";
export type ProviderId = "anthropic" | "openai" | "gemini" | "openrouter" | "custom" | "ollama";

export interface ProviderConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}
export interface EngineSettings {
  mode: EngineMode;
  /** Which cloud provider is used when mode === "api". */
  apiProvider: Exclude<ProviderId, "ollama">;
  providers: Record<ProviderId, ProviderConfig>;
  maxTokens: number;
  /** JSON-mode hint for providers that support it (Ollama `format`, OpenAI response_format). */
  jsonMode: boolean;
}

export interface ProviderMeta {
  id: ProviderId;
  name: string;
  kind: "anthropic" | "openai-responses" | "openai-chat" | "gemini" | "ollama";
  defaultBaseUrl: string;
  defaultModel: string;
  envKey?: string;
  envBase?: string;
  envModel?: string;
  needsKey: boolean;
  hint: string;
  models: string[];
}

export const PROVIDERS: ProviderMeta[] = [
  { id: "anthropic", name: "Anthropic Claude", kind: "anthropic", defaultBaseUrl: "https://api.anthropic.com", defaultModel: "claude-sonnet-5", envKey: "ANTHROPIC_API_KEY", envModel: "CLAUDE_MODEL", needsKey: true, hint: "console.anthropic.com → API keys", models: ["claude-opus-5-5", "claude-sonnet-5", "claude-haiku-4-5-20251001"] },
  { id: "openai", name: "OpenAI · GPT / Codex", kind: "openai-responses", defaultBaseUrl: "https://api.openai.com/v1", defaultModel: "gpt-5-codex", envKey: "OPENAI_API_KEY", envModel: "OPENAI_MODEL", needsKey: true, hint: "platform.openai.com → API keys. Codex models are coding-tuned.", models: ["gpt-5-codex", "gpt-5", "gpt-5-mini", "o4-mini"] },
  { id: "gemini", name: "Google Gemini", kind: "gemini", defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta", defaultModel: "gemini-2.5-pro", envKey: "GEMINI_API_KEY", envModel: "GEMINI_MODEL", needsKey: true, hint: "aistudio.google.com → Get API key", models: ["gemini-2.5-pro", "gemini-2.5-flash"] },
  { id: "openrouter", name: "OpenRouter (any model)", kind: "openai-chat", defaultBaseUrl: "https://openrouter.ai/api/v1", defaultModel: "qwen/qwen3-coder", envKey: "OPENROUTER_API_KEY", envModel: "OPENROUTER_MODEL", needsKey: true, hint: "openrouter.ai → Keys. One key, hundreds of coding models (Qwen Coder, DeepSeek, Kimi, Mistral Codestral…).", models: ["qwen/qwen3-coder", "deepseek/deepseek-chat-v3.1", "moonshotai/kimi-k2", "mistralai/codestral-2508", "x-ai/grok-code-fast-1"] },
  { id: "custom", name: "Custom OpenAI-compatible", kind: "openai-chat", defaultBaseUrl: "http://localhost:1234/v1", defaultModel: "", envKey: "CUSTOM_LLM_API_KEY", envBase: "CUSTOM_LLM_BASE_URL", envModel: "CUSTOM_LLM_MODEL", needsKey: false, hint: "LM Studio, vLLM, llama.cpp server, Groq, Together, DeepSeek direct, Mistral… anything with /v1/chat/completions.", models: [] },
  { id: "ollama", name: "Ollama (local)", kind: "ollama", defaultBaseUrl: "http://localhost:11434", defaultModel: "qwen2.5-coder:14b", envBase: "OLLAMA_BASE_URL", envModel: "OLLAMA_MODEL", needsKey: false, hint: "ollama.com — runs on this machine, no key, no data leaves your Mac. Pull a coding model: `ollama pull qwen2.5-coder:14b`.", models: ["qwen2.5-coder:14b", "qwen2.5-coder:7b", "deepseek-coder-v2:16b", "codellama:13b", "llama3.1:8b", "gpt-oss:20b"] },
];
export const providerMeta = (id: ProviderId): ProviderMeta => PROVIDERS.find((p) => p.id === id)!;

const KEY = "engine_settings";
const emptyProviders = (): Record<ProviderId, ProviderConfig> =>
  Object.fromEntries(PROVIDERS.map((p) => [p.id, { apiKey: "", baseUrl: "", model: "" }])) as Record<ProviderId, ProviderConfig>;

const DEFAULTS: EngineSettings = { mode: "cowork", apiProvider: "anthropic", providers: emptyProviders(), maxTokens: 8000, jsonMode: true };

function ensure(): void {
  getDb().exec("CREATE TABLE IF NOT EXISTS settings (k TEXT PRIMARY KEY, v TEXT NOT NULL, updated_at TEXT NOT NULL)");
}

/** Raw stored settings (what the user typed). Missing fields are filled with defaults, never with env values. */
export function getSettings(): EngineSettings {
  ensure();
  const row = getDb().prepare("SELECT v FROM settings WHERE k=?").get(KEY) as { v: string } | undefined;
  if (!row) {
    // First run: ENGINE_MODE env seeds the mode; a bare ANTHROPIC_API_KEY keeps the v2 behaviour (API mode on).
    const d = structuredClone(DEFAULTS);
    const env = process.env.ENGINE_MODE as EngineMode | undefined;
    if (env === "api" || env === "ollama" || env === "cowork") d.mode = env;
    else if (process.env.ANTHROPIC_API_KEY) d.mode = "api";
    return d;
  }
  try {
    const s = JSON.parse(row.v) as Partial<EngineSettings>;
    return { ...structuredClone(DEFAULTS), ...s, providers: { ...emptyProviders(), ...(s.providers ?? {}) } };
  } catch { return structuredClone(DEFAULTS); }
}

export function saveSettings(patch: Partial<EngineSettings>): EngineSettings {
  ensure();
  const next = { ...getSettings(), ...patch };
  getDb().prepare("INSERT INTO settings (k, v, updated_at) VALUES (?, ?, ?) ON CONFLICT(k) DO UPDATE SET v=excluded.v, updated_at=excluded.updated_at").run(KEY, JSON.stringify(next), new Date().toISOString());
  return next;
}

export function saveProvider(id: ProviderId, cfg: Partial<ProviderConfig>): EngineSettings {
  const s = getSettings();
  const cur = s.providers[id];
  // An empty apiKey in the patch means "keep"; use clearProviderKey() to remove one.
  s.providers[id] = { apiKey: cfg.apiKey ? cfg.apiKey.trim() : cur.apiKey, baseUrl: (cfg.baseUrl ?? cur.baseUrl).trim(), model: (cfg.model ?? cur.model).trim() };
  return saveSettings({ providers: s.providers });
}
export function clearProviderKey(id: ProviderId): EngineSettings {
  const s = getSettings();
  s.providers[id] = { ...s.providers[id], apiKey: "" };
  return saveSettings({ providers: s.providers });
}

/** Effective config for a provider: stored value, else environment variable, else the provider default. */
export function resolveProvider(id: ProviderId, s: EngineSettings = getSettings()): ProviderConfig & { meta: ProviderMeta; keySource: "settings" | "env" | "none" } {
  const meta = providerMeta(id);
  const cfg = s.providers[id];
  const envKey = meta.envKey ? process.env[meta.envKey] ?? "" : "";
  const apiKey = cfg.apiKey || envKey;
  return {
    meta,
    apiKey,
    baseUrl: (cfg.baseUrl || (meta.envBase ? process.env[meta.envBase] : "") || meta.defaultBaseUrl).replace(/\/+$/, ""),
    model: cfg.model || (meta.envModel ? process.env[meta.envModel] : "") || meta.defaultModel,
    keySource: cfg.apiKey ? "settings" : envKey ? "env" : "none",
  };
}

export interface EngineInfo {
  mode: EngineMode;
  /** Provider used when the console processes commands itself; null in Cowork mode. */
  provider: ProviderId | null;
  model: string;
  /** Whether the in-app engine can actually run (provider has what it needs). */
  ready: boolean;
  label: string;
  reason: string;
}

/** What is driving the company right now. ENGINE_MODE env var seeds the mode until the user picks one in Configuration. */
export function engineInfo(s: EngineSettings = getSettings()): EngineInfo {
  const mode = s.mode;
  if (mode === "cowork") return { mode, provider: null, model: "", ready: true, label: "Engine: Cowork", reason: "Commands wait for a Claude Cowork session (or the scheduled task) to pick them up." };
  const id: ProviderId = mode === "ollama" ? "ollama" : s.apiProvider;
  const r = resolveProvider(id, s);
  const ready = Boolean(r.model) && (!r.meta.needsKey || Boolean(r.apiKey));
  const short = r.meta.name.split(" ")[0];
  return {
    mode, provider: id, model: r.model, ready,
    label: `Engine: ${short}${r.model ? ` · ${r.model}` : ""}`,
    reason: ready ? `The console processes commands itself with ${r.meta.name} (${r.model}).` : r.meta.needsKey && !r.apiKey ? `${r.meta.name} needs an API key — add one in Configuration.` : `${r.meta.name} needs a model name — set one in Configuration.`,
  };
}

/** Mask a secret for display: keeps the first 4 and last 4 characters. */
export const mask = (k: string): string => (k ? (k.length <= 10 ? "•".repeat(k.length) : `${k.slice(0, 4)}${"•".repeat(Math.min(16, k.length - 8))}${k.slice(-4)}`) : "");

/** Settings safe to send to the browser (keys masked, plus resolved/effective values). */
export function publicSettings(s: EngineSettings = getSettings()) {
  return {
    mode: s.mode, apiProvider: s.apiProvider, maxTokens: s.maxTokens, jsonMode: s.jsonMode,
    engine: engineInfo(s),
    providers: PROVIDERS.map((meta) => {
      const r = resolveProvider(meta.id, s);
      return { id: meta.id, name: meta.name, kind: meta.kind, hint: meta.hint, needsKey: meta.needsKey, models: meta.models, defaultBaseUrl: meta.defaultBaseUrl, defaultModel: meta.defaultModel, envKey: meta.envKey, baseUrl: r.baseUrl, model: r.model, hasKey: Boolean(r.apiKey), keyMasked: mask(r.apiKey), keySource: r.keySource, stored: s.providers[meta.id] };
    }),
  };
}
export type PublicSettings = ReturnType<typeof publicSettings>;
