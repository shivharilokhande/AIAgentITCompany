// src/lib/llm.ts
// One `chat()` over every supported LLM bridge: Anthropic, OpenAI (Responses API, incl. Codex models),
// Gemini, any OpenAI-compatible endpoint (OpenRouter, LM Studio, vLLM, Groq…), and local Ollama.
import { engineInfo, getSettings, resolveProvider, type ProviderId } from "./settings";

export interface ChatInput { system: string; user: string; maxTokens?: number; json?: boolean }
export interface ChatResult { text: string; provider: ProviderId; model: string; ms: number; usage?: { input?: number; output?: number } }

const TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS ?? 180_000);

async function post(url: string, headers: Record<string, string>, body: unknown): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body), signal: ctrl.signal });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw new Error(`Timed out after ${Math.round(TIMEOUT_MS / 1000)} s — the model is too slow for this machine or still loading. Try a smaller model or raise LLM_TIMEOUT_MS.`);
    if ((e as Error & { cause?: { code?: string } }).cause?.code === "ECONNREFUSED") throw new Error(`Connection refused at ${url} — is the server running?`);
    throw e;
  } finally { clearTimeout(t); }
}
async function fail(res: Response, who: string): Promise<never> {
  throw new Error(`${who} ${res.status}: ${(await res.text()).slice(0, 400)}`);
}

/** Send one system+user exchange to a specific provider and return the text. */
export async function chatWith(id: ProviderId, input: ChatInput): Promise<ChatResult> {
  const s = getSettings();
  const r = resolveProvider(id, s);
  const maxTokens = input.maxTokens ?? s.maxTokens;
  const json = input.json ?? s.jsonMode;
  const t0 = Date.now();
  if (r.meta.needsKey && !r.apiKey) throw new Error(`${r.meta.name}: no API key configured`);
  if (!r.model) throw new Error(`${r.meta.name}: no model configured`);
  let text = "";
  let usage: ChatResult["usage"];

  switch (r.meta.kind) {
    case "anthropic": {
      const res = await post(`${r.baseUrl}/v1/messages`, { "x-api-key": r.apiKey, "anthropic-version": "2023-06-01" }, { model: r.model, max_tokens: maxTokens, system: input.system, messages: [{ role: "user", content: input.user }] });
      if (!res.ok) await fail(res, "Anthropic");
      const d = (await res.json()) as { content: Array<{ type: string; text?: string }>; usage?: { input_tokens: number; output_tokens: number } };
      text = d.content.filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
      usage = { input: d.usage?.input_tokens, output: d.usage?.output_tokens };
      break;
    }
    case "openai-responses": {
      // Responses API works for gpt-5, gpt-5-codex, o-series. Reasoning models reject temperature; we don't send it.
      const body: Record<string, unknown> = { model: r.model, instructions: input.system, input: input.user, max_output_tokens: maxTokens };
      if (json) body.text = { format: { type: "json_object" } };
      const res = await post(`${r.baseUrl}/responses`, { authorization: `Bearer ${r.apiKey}` }, body);
      if (!res.ok) await fail(res, "OpenAI");
      const d = (await res.json()) as { output?: Array<{ type: string; content?: Array<{ type: string; text?: string }> }>; output_text?: string; usage?: { input_tokens: number; output_tokens: number } };
      text = d.output_text ?? (d.output ?? []).flatMap((o) => o.content ?? []).filter((c) => c.type === "output_text").map((c) => c.text ?? "").join("");
      usage = { input: d.usage?.input_tokens, output: d.usage?.output_tokens };
      break;
    }
    case "openai-chat": {
      const headers: Record<string, string> = r.apiKey ? { authorization: `Bearer ${r.apiKey}` } : {};
      if (id === "openrouter") { headers["HTTP-Referer"] = "https://github.com/shivharilokhande/smartit-console"; headers["X-Title"] = "SmartIT Console"; }
      const body: Record<string, unknown> = { model: r.model, max_tokens: maxTokens, messages: [{ role: "system", content: input.system }, { role: "user", content: input.user }] };
      if (json) body.response_format = { type: "json_object" };
      let res = await post(`${r.baseUrl}/chat/completions`, headers, body);
      // Some compatible servers reject response_format — retry once without it.
      if (!res.ok && json && res.status === 400) { delete body.response_format; res = await post(`${r.baseUrl}/chat/completions`, headers, body); }
      if (!res.ok) await fail(res, r.meta.name);
      const d = (await res.json()) as { choices?: Array<{ message?: { content?: string | Array<{ text?: string }> } }>; usage?: { prompt_tokens: number; completion_tokens: number } };
      const c = d.choices?.[0]?.message?.content;
      text = typeof c === "string" ? c : (c ?? []).map((p) => p.text ?? "").join("");
      usage = { input: d.usage?.prompt_tokens, output: d.usage?.completion_tokens };
      break;
    }
    case "gemini": {
      const body: Record<string, unknown> = { systemInstruction: { parts: [{ text: input.system }] }, contents: [{ role: "user", parts: [{ text: input.user }] }], generationConfig: { maxOutputTokens: maxTokens, ...(json ? { responseMimeType: "application/json" } : {}) } };
      const res = await post(`${r.baseUrl}/models/${encodeURIComponent(r.model)}:generateContent?key=${encodeURIComponent(r.apiKey)}`, {}, body);
      if (!res.ok) await fail(res, "Gemini");
      const d = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; usageMetadata?: { promptTokenCount: number; candidatesTokenCount: number } };
      text = (d.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
      usage = { input: d.usageMetadata?.promptTokenCount, output: d.usageMetadata?.candidatesTokenCount };
      break;
    }
    case "ollama": {
      const body: Record<string, unknown> = { model: r.model, stream: false, messages: [{ role: "system", content: input.system }, { role: "user", content: input.user }], options: { num_predict: maxTokens, temperature: 0.2 } };
      if (json) body.format = "json";
      const res = await post(`${r.baseUrl}/api/chat`, {}, body);
      if (!res.ok) await fail(res, "Ollama");
      const d = (await res.json()) as { message?: { content?: string }; prompt_eval_count?: number; eval_count?: number };
      text = d.message?.content ?? "";
      usage = { input: d.prompt_eval_count, output: d.eval_count };
      break;
    }
  }
  return { text, provider: id, model: r.model, ms: Date.now() - t0, usage };
}

/** Chat with whatever the Configuration page says is the active engine. Throws in Cowork mode. */
export async function chat(input: ChatInput): Promise<ChatResult> {
  const info = engineInfo();
  if (!info.provider) throw new Error("Engine is in Cowork mode — the console does not call an LLM itself.");
  if (!info.ready) throw new Error(info.reason);
  return chatWith(info.provider, input);
}

/** List models a provider exposes (Ollama and OpenAI-compatible servers support this; others return their curated list). */
export async function listModels(id: ProviderId): Promise<string[]> {
  const r = resolveProvider(id);
  try {
    if (r.meta.kind === "ollama") {
      const res = await fetch(`${r.baseUrl}/api/tags`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) await fail(res, "Ollama");
      const d = (await res.json()) as { models?: Array<{ name: string }> };
      return (d.models ?? []).map((m) => m.name).sort();
    }
    if (r.meta.kind === "openai-chat" || r.meta.kind === "openai-responses") {
      const res = await fetch(`${r.baseUrl}/models`, { headers: r.apiKey ? { authorization: `Bearer ${r.apiKey}` } : {}, signal: AbortSignal.timeout(8000) });
      if (!res.ok) await fail(res, r.meta.name);
      const d = (await res.json()) as { data?: Array<{ id: string }> };
      const ids = (d.data ?? []).map((m) => m.id);
      return (id === "openai" ? ids.filter((m) => /^(gpt-5|gpt-4\.1|o[34]|codex)/.test(m)) : ids).sort().slice(0, 300);
    }
    if (r.meta.kind === "gemini") {
      const res = await fetch(`${r.baseUrl}/models?key=${encodeURIComponent(r.apiKey)}`, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) await fail(res, "Gemini");
      const d = (await res.json()) as { models?: Array<{ name: string; supportedGenerationMethods?: string[] }> };
      return (d.models ?? []).filter((m) => m.supportedGenerationMethods?.includes("generateContent")).map((m) => m.name.replace(/^models\//, "")).sort();
    }
  } catch (e) {
    throw new Error(`Could not list models: ${(e as Error).message}`);
  }
  return r.meta.models;
}

/** Round-trip a tiny prompt to prove the provider works end to end. */
export async function testProvider(id: ProviderId): Promise<{ ok: boolean; message: string; ms?: number; model?: string; sample?: string }> {
  try {
    const r = await chatWith(id, { system: "You are a connectivity check. Reply with exactly the JSON {\"ok\":true,\"who\":\"<your model name>\"} and nothing else.", user: "ping", maxTokens: 60, json: true });
    return { ok: true, message: `Connected in ${r.ms} ms`, ms: r.ms, model: r.model, sample: r.text.slice(0, 120) };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

/** Extract the first JSON object from a model reply (tolerates code fences and prose around it). */
export function extractJson<T = unknown>(text: string): T {
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = t.indexOf("{"), end = t.lastIndexOf("}");
  const body = start >= 0 && end > start ? t.slice(start, end + 1) : t;
  return JSON.parse(body) as T;
}
