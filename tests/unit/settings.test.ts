import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { resetDbForTests } from "@/lib/db";
import * as s from "@/lib/settings";
import { chatWith, extractJson } from "@/lib/llm";

process.env.DATA_DIR = ":memory:";
beforeEach(() => { resetDbForTests(); delete process.env.ANTHROPIC_API_KEY; delete process.env.ENGINE_MODE; });
afterEach(() => vi.restoreAllMocks());

describe("engine settings", () => {
  it("defaults to Cowork mode and is ready", () => {
    const i = s.engineInfo();
    expect(i.mode).toBe("cowork");
    expect(i.ready).toBe(true);
    expect(i.label).toBe("Engine: Cowork");
  });
  it("API mode without a key is not ready and says why", () => {
    s.saveSettings({ mode: "api", apiProvider: "openai" });
    const i = s.engineInfo();
    expect(i.ready).toBe(false);
    expect(i.reason).toMatch(/API key/);
  });
  it("saves a provider key, masks it, keeps it when patch key is empty, and can clear it", () => {
    s.saveProvider("openai", { apiKey: "sk-test-1234567890abcdef", model: "gpt-5-codex" });
    s.saveProvider("openai", { apiKey: "", baseUrl: "https://api.openai.com/v1" }); // empty = keep
    const pub = s.publicSettings().providers.find((p) => p.id === "openai")!;
    expect(pub.hasKey).toBe(true);
    expect(pub.keyMasked).toMatch(/^sk-t•+cdef$/);
    expect(pub.model).toBe("gpt-5-codex");
    s.clearProviderKey("openai");
    expect(s.publicSettings().providers.find((p) => p.id === "openai")!.hasKey).toBe(false);
  });
  it("falls back to env vars, then provider defaults", () => {
    process.env.ANTHROPIC_API_KEY = "env-key";
    const r = s.resolveProvider("anthropic");
    expect(r.apiKey).toBe("env-key");
    expect(r.keySource).toBe("env");
    expect(r.model).toBe("claude-sonnet-5");
    expect(r.baseUrl).toBe("https://api.anthropic.com");
  });
  it("Ollama mode is ready without a key and labels the model", () => {
    s.saveSettings({ mode: "ollama" });
    s.saveProvider("ollama", { model: "qwen2.5-coder:14b", baseUrl: "http://localhost:11434/" });
    const i = s.engineInfo();
    expect(i.ready).toBe(true);
    expect(i.provider).toBe("ollama");
    expect(i.label).toBe("Engine: Ollama · qwen2.5-coder:14b");
    expect(s.resolveProvider("ollama").baseUrl).toBe("http://localhost:11434");
  });
});

describe("llm bridge", () => {
  it("extractJson tolerates fences and prose", () => {
    expect(extractJson<{ a: number }>("Sure!\n```json\n{\"a\":1}\n```\nDone.").a).toBe(1);
  });
  it("talks to Ollama's /api/chat with format=json", async () => {
    s.saveProvider("ollama", { model: "test-model" });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ message: { content: "{\"ok\":true}" }, prompt_eval_count: 10, eval_count: 5 }), { status: 200 }));
    const r = await chatWith("ollama", { system: "s", user: "u" });
    expect(r.text).toBe("{\"ok\":true}");
    expect(r.usage).toEqual({ input: 10, output: 5 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("http://localhost:11434/api/chat");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.model).toBe("test-model");
    expect(body.format).toBe("json");
    expect(body.stream).toBe(false);
  });
  it("uses the OpenAI Responses API for OpenAI/Codex and reads output_text", async () => {
    s.saveProvider("openai", { apiKey: "sk-x", model: "gpt-5-codex" });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ output: [{ type: "message", content: [{ type: "output_text", text: "{\"hi\":1}" }] }] }), { status: 200 }));
    const r = await chatWith("openai", { system: "s", user: "u" });
    expect(r.text).toBe("{\"hi\":1}");
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://api.openai.com/v1/responses");
    expect((init as RequestInit).headers).toMatchObject({ authorization: "Bearer sk-x" });
  });
  it("refuses a keyed provider with no key", async () => {
    await expect(chatWith("gemini", { system: "s", user: "u" })).rejects.toThrow(/no API key/);
  });
});
